import type Database from "better-sqlite3";
import { getDb } from "./db.js";
import { appendBlock, ledgerHash } from "./ledger.js";
import { aggregateModels, saveModel, trainLocalFromPartition } from "./ml/gbm.js";
import { getModel, setModel } from "./scoring.js";

export type FlInstitution = {
  id: string;
  name: string;
  rows: number;
};

export const INSTITUTIONS: FlInstitution[] = [
  { id: "bank_a", name: "Northwind Bank", rows: 220 },
  { id: "bank_b", name: "Cedar Credit Union", rows: 180 },
  { id: "bank_c", name: "Harbor Lending", rows: 200 },
];

export function ensureFlSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fl_rounds (
      id TEXT PRIMARY KEY,
      round_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      global_model_version_before TEXT NOT NULL,
      global_model_version_after TEXT,
      global_model_hash_before TEXT NOT NULL,
      global_model_hash_after TEXT,
      clients_json TEXT NOT NULL,
      ledger_block_height INTEGER,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);
}

export function listFlRounds() {
  const db = getDb();
  return db
    .prepare("SELECT * FROM fl_rounds ORDER BY round_number DESC")
    .all()
    .map((r) => ({
      ...(r as Record<string, unknown>),
      clients: JSON.parse(String((r as { clients_json: string }).clients_json)),
    }));
}

export function runFederatedRound() {
  const db = getDb();
  const global = getModel();
  const priorRounds = (
    db.prepare("SELECT COUNT(*) as c FROM fl_rounds").get() as { c: number }
  ).c;
  const round_number = priorRounds + 1;
  const id = `fl_round_${round_number}`;
  const created_at = new Date().toISOString();

  const clientUpdates = INSTITUTIONS.map((inst, idx) => {
    const local = trainLocalFromPartition(global, idx + 1, inst.rows);
    return {
      institution_id: inst.id,
      institution_name: inst.name,
      rows_trained: inst.rows,
      local_model_hash: local.model_hash,
      shared: "gradients_only" as const,
      raw_data_exported: false,
      model: local,
    };
  });

  const nextVersion = `gbm-v1.0.${round_number}-fl`;
  const aggregated = aggregateModels(
    global,
    clientUpdates.map((c) => c.model),
    nextVersion
  );

  saveModel(aggregated);
  setModel(aggregated);

  const audit_hash = ledgerHash(
    `fl_model|${aggregated.version}|${aggregated.model_hash}|${created_at}`
  );
  const block = appendBlock(db, {
    payload_type: "fl_model",
    audit_hash,
    payload: {
      round_number,
      model_version: aggregated.version,
      model_hash: aggregated.model_hash,
      institutions: INSTITUTIONS.map((i) => i.id),
      privacy: "raw customer rows never left institutional partitions",
    },
  });

  const clients_json = JSON.stringify(
    clientUpdates.map(({ model: _m, ...rest }) => rest)
  );

  db.prepare(
    `INSERT INTO fl_rounds (
      id, round_number, status, global_model_version_before, global_model_version_after,
      global_model_hash_before, global_model_hash_after, clients_json, ledger_block_height, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    round_number,
    "completed",
    global.version,
    aggregated.version,
    global.model_hash,
    aggregated.model_hash,
    clients_json,
    block.height,
    created_at,
    new Date().toISOString()
  );

  return {
    id,
    round_number,
    status: "completed",
    before: { version: global.version, model_hash: global.model_hash },
    after: { version: aggregated.version, model_hash: aggregated.model_hash },
    clients: clientUpdates.map(({ model: _m, ...rest }) => rest),
    ledger: {
      height: block.height,
      block_hash: block.block_hash,
      audit_hash: block.audit_hash,
    },
    privacy_guarantee:
      "Only model parameter updates were aggregated; raw KYC/credit rows stayed local.",
  };
}
