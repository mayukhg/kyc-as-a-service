import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { seedDatabase } from "./seed.js";
import { appendBlock, initLedger, ledgerHash } from "./ledger.js";
import { ensureFlSchema } from "./fl.js";
import { ensureModel, saveModel } from "./ml/gbm.js";
import { setModel } from "./scoring.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "data", "kyc-demo.sqlite");

export type CustomerFeatures = {
  txn_consistency: number;
  account_age_months: number;
  delinquency_count: number;
  income_band: "low" | "mid" | "high";
  kyc_doc_score: number;
  volatility: number;
};

let db: Database.Database;

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export function initDb(reset = false) {
  fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });

  if (reset && fs.existsSync(dbPath)) {
    if (db) {
      db.close();
      db = undefined as unknown as Database.Database;
    }
    fs.unlinkSync(dbPath);
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL,
      segment TEXT NOT NULL,
      kyc_status TEXT NOT NULL,
      country TEXT NOT NULL,
      features_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS risk_scores (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      eligibility TEXT NOT NULL,
      top_driver TEXT NOT NULL,
      drivers_json TEXT NOT NULL,
      model_version TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS attestations (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      score_id TEXT NOT NULL,
      audit_hash TEXT NOT NULL,
      layer_trace_json TEXT NOT NULL,
      ledger_height INTEGER,
      ledger_block_hash TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (score_id) REFERENCES risk_scores(id)
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      score_id TEXT,
      decision TEXT NOT NULL,
      reason TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
  `);

  // migrate older DBs
  try {
    db.exec(`ALTER TABLE attestations ADD COLUMN ledger_height INTEGER`);
  } catch {
    /* exists */
  }
  try {
    db.exec(`ALTER TABLE attestations ADD COLUMN ledger_block_hash TEXT`);
  } catch {
    /* exists */
  }

  initLedger(db);
  ensureFlSchema(db);

  const model = ensureModel();
  setModel(model);
  saveModel(model);

  const modelOnLedger = db
    .prepare(
      `SELECT COUNT(*) as c FROM ledger_blocks WHERE payload_type = 'model_registry' AND payload_json LIKE ?`
    )
    .get(`%${model.model_hash}%`) as { c: number };
  if (modelOnLedger.c === 0) {
    appendBlock(db, {
      payload_type: "model_registry",
      audit_hash: ledgerHash(`model|${model.version}|${model.model_hash}`),
      payload: {
        model_version: model.version,
        model_hash: model.model_hash,
        algorithm: model.algorithm,
        train_rows: model.train_rows,
        train_rmse: model.train_rmse,
      },
    });
  }

  const count = db.prepare("SELECT COUNT(*) as c FROM customers").get() as { c: number };
  if (count.c === 0) {
    seedDatabase(db);
  }

  return db;
}

export function resetDb() {
  return initDb(true);
}
