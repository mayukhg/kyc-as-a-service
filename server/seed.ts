import type Database from "better-sqlite3";
import { computeScore, buildAuditHash, newId } from "./scoring.js";
import type { CustomerFeatures } from "./db.js";
import { appendBlock } from "./ledger.js";

type SeedCustomer = {
  id: string;
  display_name: string;
  email: string;
  segment: string;
  kyc_status: string;
  country: string;
  features: CustomerFeatures;
  created_at: string;
  prior_decision?: { decision: string; reason: string; days_ago: number };
};

const SEED: SeedCustomer[] = [
  {
    id: "hash_abc123",
    display_name: "Maya Chen",
    email: "maya.chen@example.com",
    segment: "Retail SMB",
    kyc_status: "Verified",
    country: "SG",
    features: {
      txn_consistency: 88,
      account_age_months: 42,
      delinquency_count: 0,
      income_band: "high",
      kyc_doc_score: 92,
      volatility: 18,
    },
    created_at: "2023-05-12T08:00:00Z",
    prior_decision: { decision: "approve", reason: "Strong consistency and clean delinquency.", days_ago: 16 },
  },
  {
    id: "hash_omar77",
    display_name: "Omar Haddad",
    email: "omar.haddad@example.com",
    segment: "Retail Banking",
    kyc_status: "Verified",
    country: "AE",
    features: {
      txn_consistency: 61,
      account_age_months: 18,
      delinquency_count: 1,
      income_band: "mid",
      kyc_doc_score: 78,
      volatility: 40,
    },
    created_at: "2024-01-20T10:00:00Z",
    prior_decision: { decision: "manual_review", reason: "Borderline volatility spike.", days_ago: 5 },
  },
  {
    id: "hash_priya09",
    display_name: "Priya Nair",
    email: "priya.nair@example.com",
    segment: "SME Banking",
    kyc_status: "Pending",
    country: "IN",
    features: {
      txn_consistency: 35,
      account_age_months: 6,
      delinquency_count: 3,
      income_band: "low",
      kyc_doc_score: 55,
      volatility: 72,
    },
    created_at: "2025-06-01T12:00:00Z",
  },
  {
    id: "hash_james44",
    display_name: "James Okonkwo",
    email: "james.ok@example.com",
    segment: "Wealth",
    kyc_status: "Verified",
    country: "NG",
    features: {
      txn_consistency: 79,
      account_age_months: 60,
      delinquency_count: 0,
      income_band: "high",
      kyc_doc_score: 95,
      volatility: 22,
    },
    created_at: "2022-11-03T09:00:00Z",
    prior_decision: { decision: "approve", reason: "Long tenure, high income band.", days_ago: 40 },
  },
  {
    id: "hash_sofia21",
    display_name: "Sofia Alvarez",
    email: "sofia.alvarez@example.com",
    segment: "Retail Banking",
    kyc_status: "Failed",
    country: "MX",
    features: {
      txn_consistency: 48,
      account_age_months: 9,
      delinquency_count: 2,
      income_band: "mid",
      kyc_doc_score: 40,
      volatility: 55,
    },
    created_at: "2025-03-14T15:00:00Z",
  },
];

const EXTRA_NAMES = [
  ["Liam Brooks", "Retail Banking", "US"],
  ["Aisha Rahman", "SME Banking", "BD"],
  ["Kenji Sato", "Wealth", "JP"],
  ["Elena Rossi", "Retail SMB", "IT"],
  ["Noah Müller", "Retail Banking", "DE"],
  ["Fatima Zahra", "SME Banking", "MA"],
  ["Carlos Mendes", "Retail Banking", "BR"],
  ["Ingrid Berg", "Wealth", "SE"],
  ["Wei Lin", "Retail SMB", "TW"],
  ["Amara Diallo", "SME Banking", "SN"],
  ["Tomáš Novák", "Retail Banking", "CZ"],
  ["Yuki Tanaka", "Retail SMB", "JP"],
  ["Hassan Ali", "SME Banking", "PK"],
  ["Chloe Dubois", "Wealth", "FR"],
  ["Mateo Silva", "Retail Banking", "CL"],
  ["Nora Lindqvist", "Retail SMB", "NO"],
  ["Raj Patel", "SME Banking", "IN"],
  ["Emma Walsh", "Retail Banking", "IE"],
  ["Diego Torres", "Retail SMB", "ES"],
  ["Hana Kim", "Wealth", "KR"],
  ["Lucas Ferreira", "SME Banking", "PT"],
  ["Mia Andersson", "Retail Banking", "SE"],
  ["Omar Farouk", "Retail SMB", "EG"],
  ["Isabella Conti", "Wealth", "IT"],
  ["Ethan Park", "Retail Banking", "US"],
  ["Zara Ahmed", "SME Banking", "UK"],
  ["Felix Braun", "Retail SMB", "AT"],
  ["Leila Hassan", "Retail Banking", "JO"],
  ["Hugo Martins", "SME Banking", "BR"],
  ["Ava Thompson", "Wealth", "CA"],
  ["Ravi Krishnan", "Retail Banking", "IN"],
  ["Nina Petrova", "Retail SMB", "BG"],
  ["Samir Khan", "SME Banking", "AE"],
  ["Grace Lee", "Retail Banking", "SG"],
  ["Oliver Wright", "Wealth", "AU"],
  ["Camila Rocha", "Retail SMB", "BR"],
  ["Youssef Benali", "SME Banking", "TN"],
  ["Hannah Keller", "Retail Banking", "CH"],
  ["Arjun Mehta", "Retail SMB", "IN"],
  ["Lucia Bianchi", "Wealth", "IT"],
  ["Daniel Costa", "SME Banking", "PT"],
  ["Marta Kowalski", "Retail Banking", "PL"],
  ["Ibrahim Yusuf", "Retail SMB", "KE"],
  ["Sophie Martin", "Wealth", "FR"],
  ["Andre Silva", "SME Banking", "BR"],
];

function extraCustomers(): SeedCustomer[] {
  return EXTRA_NAMES.map(([name, segment, country], i) => {
    const n = i + 1;
    const txn = 30 + ((i * 17) % 70);
    const delinq = i % 5 === 0 ? 3 : i % 3 === 0 ? 1 : 0;
    const features: CustomerFeatures = {
      txn_consistency: txn,
      account_age_months: 4 + ((i * 5) % 72),
      delinquency_count: delinq,
      income_band: i % 3 === 0 ? "high" : i % 3 === 1 ? "mid" : "low",
      kyc_doc_score: 45 + ((i * 11) % 55),
      volatility: 15 + ((i * 13) % 70),
    };
    const kycStatuses = ["Verified", "Verified", "Pending", "Verified", "Failed"];
    return {
      id: `hash_c${String(n).padStart(3, "0")}`,
      display_name: name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      segment,
      kyc_status: kycStatuses[i % kycStatuses.length],
      country,
      features,
      created_at: new Date(Date.UTC(2022, 0, 1 + i)).toISOString(),
    };
  });
}

export function seedDatabase(db: Database.Database) {
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, display_name, email, segment, kyc_status, country, features_json, created_at)
    VALUES (@id, @display_name, @email, @segment, @kyc_status, @country, @features_json, @created_at)
  `);
  const insertScore = db.prepare(`
    INSERT INTO risk_scores (id, customer_id, risk_score, eligibility, top_driver, drivers_json, model_version, latency_ms, created_at)
    VALUES (@id, @customer_id, @risk_score, @eligibility, @top_driver, @drivers_json, @model_version, @latency_ms, @created_at)
  `);
  const insertAttestation = db.prepare(`
    INSERT INTO attestations (id, customer_id, score_id, audit_hash, layer_trace_json, ledger_height, ledger_block_hash, created_at)
    VALUES (@id, @customer_id, @score_id, @audit_hash, @layer_trace_json, @ledger_height, @ledger_block_hash, @created_at)
  `);
  const insertDecision = db.prepare(`
    INSERT INTO decisions (id, customer_id, score_id, decision, reason, actor_role, created_at)
    VALUES (@id, @customer_id, @score_id, @decision, @reason, @actor_role, @created_at)
  `);

  const all = [...SEED, ...extraCustomers()];

  const tx = db.transaction(() => {
    for (const c of all) {
      insertCustomer.run({
        id: c.id,
        display_name: c.display_name,
        email: c.email,
        segment: c.segment,
        kyc_status: c.kyc_status,
        country: c.country,
        features_json: JSON.stringify(c.features),
        created_at: c.created_at,
      });

      const scored = computeScore(c.features);
      const scoreId = newId("score");
      const scoredAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * (3 + (c.id.length % 10))).toISOString();
      const latency = 180 + (c.id.charCodeAt(5) % 220);

      insertScore.run({
        id: scoreId,
        customer_id: c.id,
        risk_score: scored.risk_score,
        eligibility: scored.eligibility,
        top_driver: scored.top_driver,
        drivers_json: JSON.stringify(scored.drivers),
        model_version: scored.model_version,
        latency_ms: latency,
        created_at: scoredAt,
      });

      const auditHash = buildAuditHash(c.id, scored.risk_score, scored.model_version, scoredAt);
      const block = appendBlock(db, {
        payload_type: "kyc_attestation",
        audit_hash: auditHash,
        payload: {
          customer_id: c.id,
          score_id: scoreId,
          risk_score: scored.risk_score,
          model_version: scored.model_version,
          model_hash: scored.model_hash,
        },
      });
      insertAttestation.run({
        id: newId("att"),
        customer_id: c.id,
        score_id: scoreId,
        audit_hash: auditHash,
        layer_trace_json: JSON.stringify([
          { layer: 1, name: "Ledger lookup", detail: "Seed attestation" },
          { layer: 2, name: "GBM scoring", detail: scored.model_version },
          { layer: 3, name: "Ledger commit", detail: `height ${block.height}` },
        ]),
        ledger_height: block.height,
        ledger_block_hash: block.block_hash,
        created_at: scoredAt,
      });

      if (c.prior_decision) {
        const decidedAt = new Date(
          Date.now() - c.prior_decision.days_ago * 24 * 60 * 60 * 1000
        ).toISOString();
        insertDecision.run({
          id: newId("dec"),
          customer_id: c.id,
          score_id: scoreId,
          decision: c.prior_decision.decision,
          reason: c.prior_decision.reason,
          actor_role: "analyst",
          created_at: decidedAt,
        });
      }
    }
  });

  tx();
}
