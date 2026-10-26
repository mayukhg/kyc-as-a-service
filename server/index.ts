import express from "express";
import cors from "cors";
import { z } from "zod";
import { getDb, initDb, resetDb, type CustomerFeatures } from "./db.js";
import {
  buildAuditHash,
  buildPipeline,
  computeScore,
  getModel,
  getModelVersion,
  newId,
} from "./scoring.js";
import {
  appendBlock,
  ledgerStats,
  listLedger,
  lookupCustomerAttestation,
  verifyAuditHash,
  verifyChainIntegrity,
} from "./ledger.js";
import { INSTITUTIONS, listFlRounds, runFederatedRound } from "./fl.js";

const PORT = Number(process.env.PORT || 3001);

initDb();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const model = getModel();
  res.json({
    ok: true,
    service: "kyc-demo-api",
    model_version: model.version,
    model_hash: model.model_hash,
    ledger: verifyChainIntegrity(),
  });
});

app.get("/api/metrics", (_req, res) => {
  const db = getDb();
  const checks = (db.prepare("SELECT COUNT(*) as c FROM risk_scores").get() as { c: number }).c;
  const latency = (
    db.prepare("SELECT AVG(latency_ms) as avg FROM risk_scores").get() as { avg: number | null }
  ).avg;
  const attested = (db.prepare("SELECT COUNT(*) as c FROM attestations").get() as { c: number }).c;
  const decisions = db
    .prepare(
      `SELECT
        SUM(CASE WHEN decision = 'approve' THEN 1 ELSE 0 END) as approved,
        COUNT(*) as total
       FROM decisions`
    )
    .get() as { approved: number; total: number };

  const approvalRate =
    decisions.total > 0 ? Math.round((decisions.approved / decisions.total) * 100) : 0;
  const auditCoverage = checks > 0 ? Math.round((attested / checks) * 100) : 100;
  const ledger = ledgerStats();
  const model = getModel();

  res.json({
    checks,
    p50_latency_ms: Math.round(latency || 0),
    audit_coverage_pct: auditCoverage,
    approval_rate_pct: approvalRate,
    model_version: model.version,
    model_hash: model.model_hash,
    ledger_blocks: ledger.total_blocks,
    ledger_attestations: ledger.kyc_attestations,
    note: "Synthetic demo: GBM + local append-only ledger + optional FL rounds.",
  });
});

app.get("/api/model", (_req, res) => {
  const m = getModel();
  res.json({
    version: m.version,
    model_hash: m.model_hash,
    algorithm: m.algorithm,
    trained_at: m.trained_at,
    train_rows: m.train_rows,
    train_rmse: m.train_rmse,
    feature_names: m.feature_names,
    feature_importance: m.feature_importance,
    n_estimators: m.n_estimators,
    note: m.note,
  });
});

app.get("/api/ledger", (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  res.json({
    chain: verifyChainIntegrity(),
    stats: ledgerStats(),
    blocks: listLedger(limit).map((b) => ({
      ...b,
      payload: JSON.parse(b.payload_json),
    })),
  });
});

app.get("/api/ledger/verify/:auditHash", (req, res) => {
  res.json(verifyAuditHash(req.params.auditHash));
});

app.get("/api/customers", (req, res) => {
  const db = getDb();
  const q = String(req.query.q || "").toLowerCase();
  const eligibility = String(req.query.eligibility || "");
  const kyc_status = String(req.query.kyc_status || "");

  const rows = db
    .prepare(
      `
      SELECT c.*,
        s.id as score_id,
        s.risk_score,
        s.eligibility,
        s.top_driver,
        s.model_version,
        s.created_at as scored_at,
        d.decision as last_decision,
        d.created_at as last_decision_at
      FROM customers c
      LEFT JOIN risk_scores s ON s.id = (
        SELECT id FROM risk_scores WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN decisions d ON d.id = (
        SELECT id FROM decisions WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1
      )
      ORDER BY c.display_name ASC
    `
    )
    .all() as Array<Record<string, unknown>>;

  const filtered = rows.filter((r) => {
    if (q) {
      const hay = `${r.display_name} ${r.email} ${r.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (eligibility && r.eligibility !== eligibility) return false;
    if (kyc_status && r.kyc_status !== kyc_status) return false;
    return true;
  });

  res.json({
    customers: filtered.map((r) => ({
      id: r.id,
      display_name: r.display_name,
      email: r.email,
      segment: r.segment,
      kyc_status: r.kyc_status,
      country: r.country,
      created_at: r.created_at,
      latest_score: r.score_id
        ? {
            id: r.score_id,
            risk_score: r.risk_score,
            eligibility: r.eligibility,
            top_driver: r.top_driver,
            model_version: r.model_version,
            created_at: r.scored_at,
          }
        : null,
      last_decision: r.last_decision
        ? { decision: r.last_decision, created_at: r.last_decision_at }
        : null,
    })),
  });
});

app.get("/api/customers/:id", (req, res) => {
  const db = getDb();
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const score = db
    .prepare("SELECT * FROM risk_scores WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(req.params.id) as Record<string, unknown> | undefined;
  const attestation = score
    ? (db
        .prepare("SELECT * FROM attestations WHERE score_id = ? ORDER BY created_at DESC LIMIT 1")
        .get(score.id) as Record<string, unknown> | undefined)
    : undefined;
  const decisions = db
    .prepare("SELECT * FROM decisions WHERE customer_id = ? ORDER BY created_at DESC")
    .all(req.params.id);

  const verification =
    attestation?.audit_hash != null
      ? verifyAuditHash(String(attestation.audit_hash))
      : null;

  res.json({
    customer: {
      ...customer,
      features: JSON.parse(String(customer.features_json)),
    },
    latest_score: score
      ? {
          ...score,
          drivers: JSON.parse(String(score.drivers_json)),
        }
      : null,
    attestation: attestation
      ? {
          ...attestation,
          layer_trace: JSON.parse(String(attestation.layer_trace_json)),
        }
      : null,
    ledger_verification: verification,
    decisions,
  });
});

const riskScoreBody = z.object({
  customer_id: z.string().min(1),
  data_points: z.array(z.string()).optional(),
});

app.post("/api/v1/kyc/risk-score", (req, res) => {
  const parsed = riskScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const { customer_id, data_points } = parsed.data;
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(customer_id) as
    | { id: string; features_json: string }
    | undefined;

  if (!customer) {
    res.status(404).json({ error: `Unknown customer_id: ${customer_id}` });
    return;
  }

  const started = Date.now();

  // Layer 1 — oracle / ledger lookup
  const prior = lookupCustomerAttestation(customer_id);
  const layer1Detail = prior
    ? `Oracle found prior attestation at ledger height ${prior.height} (${prior.block_hash.slice(0, 18)}…)`
    : `Oracle: no prior attestation for ${customer_id}; first commit will establish provenance`;

  // Layer 2 — off-chain GBM
  const features = JSON.parse(customer.features_json) as CustomerFeatures;
  const scored = computeScore(features);
  const model = getModel();
  const layer2Detail = `GBM ${scored.model_version} (hash ${scored.model_hash.slice(0, 14)}…) scored ${scored.risk_score}; top driver ${scored.top_driver}`;

  const timestamp = new Date().toISOString();
  const latency_ms = Math.max(120, Date.now() - started + 60 + Math.floor(Math.random() * 100));
  const scoreId = newId("score");
  const audit_hash = buildAuditHash(customer_id, scored.risk_score, scored.model_version, timestamp);

  // Layer 3 — commit to ledger + API package
  const block = appendBlock(db, {
    payload_type: "kyc_attestation",
    audit_hash,
    payload: {
      customer_id,
      score_id: scoreId,
      risk_score: scored.risk_score,
      eligibility: scored.eligibility,
      model_version: scored.model_version,
      model_hash: scored.model_hash,
      data_points: data_points || ["transaction_history", "kyc_profile"],
    },
  });
  const layer3Detail = `Committed attestation at height ${block.height}; block ${block.block_hash.slice(0, 18)}…`;

  const pipeline = buildPipeline({
    customerId: customer_id,
    layer1Detail,
    layer2Detail,
    layer3Detail,
  });

  db.prepare(
    `INSERT INTO risk_scores (id, customer_id, risk_score, eligibility, top_driver, drivers_json, model_version, latency_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    scoreId,
    customer_id,
    scored.risk_score,
    scored.eligibility,
    scored.top_driver,
    JSON.stringify(scored.drivers),
    scored.model_version,
    latency_ms,
    timestamp
  );

  db.prepare(
    `INSERT INTO attestations (id, customer_id, score_id, audit_hash, layer_trace_json, ledger_height, ledger_block_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId("att"),
    customer_id,
    scoreId,
    audit_hash,
    JSON.stringify(pipeline),
    block.height,
    block.block_hash,
    timestamp
  );

  res.json({
    risk_score: scored.risk_score,
    eligibility: scored.eligibility,
    top_driver: scored.top_driver,
    drivers: scored.drivers,
    audit_hash,
    model_version: scored.model_version,
    model_hash: scored.model_hash,
    timestamp,
    latency_ms,
    score_id: scoreId,
    customer_id,
    data_points: data_points || ["transaction_history", "kyc_profile"],
    pipeline,
    ledger: {
      height: block.height,
      block_hash: block.block_hash,
      prev_hash: block.prev_hash,
      network: "kyc-permissioned-sim",
    },
    layer1_prior: prior
      ? { height: prior.height, block_hash: prior.block_hash, audit_hash: prior.audit_hash }
      : null,
    disclaimer:
      "Hybrid demo: off-chain GBM + local append-only permissioned ledger (not a public L1). Synthetic customers.",
  });
});

const decisionBody = z.object({
  decision: z.enum(["approve", "reject", "manual_review"]),
  reason: z.string().min(3).max(500),
  actor_role: z.enum(["analyst", "engineer", "viewer"]).default("analyst"),
  score_id: z.string().optional(),
});

app.post("/api/customers/:id/decisions", (req, res) => {
  const parsed = decisionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const customer = db.prepare("SELECT id FROM customers WHERE id = ?").get(req.params.id);
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const scoreId =
    parsed.data.score_id ||
    (
      db
        .prepare("SELECT id FROM risk_scores WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1")
        .get(req.params.id) as { id: string } | undefined
    )?.id;

  const id = newId("dec");
  const created_at = new Date().toISOString();
  db.prepare(
    `INSERT INTO decisions (id, customer_id, score_id, decision, reason, actor_role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.params.id,
    scoreId || null,
    parsed.data.decision,
    parsed.data.reason,
    parsed.data.actor_role,
    created_at
  );

  res.status(201).json({
    id,
    customer_id: req.params.id,
    score_id: scoreId || null,
    decision: parsed.data.decision,
    reason: parsed.data.reason,
    actor_role: parsed.data.actor_role,
    created_at,
  });
});

app.get("/api/audit", (_req, res) => {
  const db = getDb();
  const attestations = db
    .prepare(
      `
      SELECT a.*, c.display_name, s.risk_score, s.eligibility
      FROM attestations a
      JOIN customers c ON c.id = a.customer_id
      JOIN risk_scores s ON s.id = a.score_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `
    )
    .all();
  const decisions = db
    .prepare(
      `
      SELECT d.*, c.display_name
      FROM decisions d
      JOIN customers c ON c.id = d.customer_id
      ORDER BY d.created_at DESC
      LIMIT 100
    `
    )
    .all();

  res.json({ attestations, decisions, ledger: ledgerStats() });
});

app.get("/api/fl/institutions", (_req, res) => {
  res.json({ institutions: INSTITUTIONS });
});

app.get("/api/fl/rounds", (_req, res) => {
  res.json({ rounds: listFlRounds(), institutions: INSTITUTIONS });
});

app.post("/api/fl/rounds", (_req, res) => {
  const result = runFederatedRound();
  res.status(201).json(result);
});

app.post("/api/demo/reset", (_req, res) => {
  resetDb();
  res.json({
    ok: true,
    message: "Demo data re-seeded (customers, ledger genesis, GBM registry).",
    model_version: getModelVersion(),
  });
});

app.listen(PORT, () => {
  console.log(`KYC demo API listening on http://localhost:${PORT}`);
});
