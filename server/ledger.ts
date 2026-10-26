import { createHash } from "crypto";
import type Database from "better-sqlite3";
import { getDb } from "./db.js";

export type LedgerPayloadType =
  | "genesis"
  | "model_registry"
  | "kyc_attestation"
  | "fl_model";

export type LedgerBlock = {
  height: number;
  prev_hash: string;
  block_hash: string;
  payload_type: LedgerPayloadType;
  payload_json: string;
  audit_hash: string;
  created_at: string;
};

const GENESIS_PREV = "0x" + "0".repeat(64);

function sha256(input: string) {
  return `0x${createHash("sha256").update(input).digest("hex")}`;
}

export function ensureLedgerSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ledger_blocks (
      height INTEGER PRIMARY KEY,
      prev_hash TEXT NOT NULL,
      block_hash TEXT NOT NULL UNIQUE,
      payload_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      audit_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ledger_audit ON ledger_blocks(audit_hash);
  `);
}

export function initLedger(db: Database.Database) {
  ensureLedgerSchema(db);
  const count = (db.prepare("SELECT COUNT(*) as c FROM ledger_blocks").get() as { c: number }).c;
  if (count === 0) {
    appendBlock(db, {
      payload_type: "genesis",
      payload: {
        network: "kyc-permissioned-sim",
        note: "Local append-only ledger for portfolio demo (not a public chain).",
      },
      audit_hash: sha256("genesis|kyc-permissioned-sim"),
    });
  }
}

export function appendBlock(
  db: Database.Database,
  args: {
    payload_type: LedgerPayloadType;
    payload: Record<string, unknown>;
    audit_hash: string;
  }
): LedgerBlock {
  const tip = db
    .prepare("SELECT height, block_hash FROM ledger_blocks ORDER BY height DESC LIMIT 1")
    .get() as { height: number; block_hash: string } | undefined;

  const height = tip ? tip.height + 1 : 0;
  const prev_hash = tip ? tip.block_hash : GENESIS_PREV;
  const created_at = new Date().toISOString();
  const payload_json = JSON.stringify(args.payload);
  const block_hash = sha256(
    `${height}|${prev_hash}|${args.payload_type}|${payload_json}|${args.audit_hash}|${created_at}`
  );

  db.prepare(
    `INSERT INTO ledger_blocks (height, prev_hash, block_hash, payload_type, payload_json, audit_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(height, prev_hash, block_hash, args.payload_type, payload_json, args.audit_hash, created_at);

  return {
    height,
    prev_hash,
    block_hash,
    payload_type: args.payload_type,
    payload_json,
    audit_hash: args.audit_hash,
    created_at,
  };
}

export function lookupCustomerAttestation(customerId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM ledger_blocks
       WHERE payload_type = 'kyc_attestation'
         AND payload_json LIKE ?
       ORDER BY height DESC LIMIT 1`
    )
    .get(`%"customer_id":"${customerId}"%`) as LedgerBlock | undefined;
}

export function verifyAuditHash(auditHash: string) {
  const db = getDb();
  const block = db
    .prepare("SELECT * FROM ledger_blocks WHERE audit_hash = ? ORDER BY height DESC LIMIT 1")
    .get(auditHash) as LedgerBlock | undefined;

  if (!block) {
    return { valid: false, reason: "Audit hash not found on ledger", block: null, chain_ok: false };
  }

  const chain = verifyChainIntegrity();
  const recomputed = sha256(
    `${block.height}|${block.prev_hash}|${block.payload_type}|${block.payload_json}|${block.audit_hash}|${block.created_at}`
  );
  const block_ok = recomputed === block.block_hash;

  return {
    valid: chain.ok && block_ok,
    reason: !chain.ok
      ? `Chain integrity failed at height ${chain.broken_at}`
      : !block_ok
        ? "Block hash mismatch"
        : "Attestation verified on local permissioned ledger",
    block: {
      height: block.height,
      block_hash: block.block_hash,
      prev_hash: block.prev_hash,
      payload_type: block.payload_type,
      payload: JSON.parse(block.payload_json),
      audit_hash: block.audit_hash,
      created_at: block.created_at,
    },
    chain_ok: chain.ok,
    tip_height: chain.tip_height,
  };
}

export function verifyChainIntegrity() {
  const db = getDb();
  const blocks = db
    .prepare("SELECT * FROM ledger_blocks ORDER BY height ASC")
    .all() as LedgerBlock[];

  let prev = GENESIS_PREV;
  for (const b of blocks) {
    if (b.prev_hash !== prev) {
      return { ok: false, broken_at: b.height, tip_height: blocks[blocks.length - 1]?.height ?? -1 };
    }
    const recomputed = sha256(
      `${b.height}|${b.prev_hash}|${b.payload_type}|${b.payload_json}|${b.audit_hash}|${b.created_at}`
    );
    if (recomputed !== b.block_hash) {
      return { ok: false, broken_at: b.height, tip_height: blocks[blocks.length - 1]?.height ?? -1 };
    }
    prev = b.block_hash;
  }
  return { ok: true, broken_at: null as number | null, tip_height: blocks[blocks.length - 1]?.height ?? -1 };
}

export function listLedger(limit = 50) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM ledger_blocks ORDER BY height DESC LIMIT ?")
    .all(limit) as LedgerBlock[];
}

export function ledgerStats() {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as c FROM ledger_blocks").get() as { c: number }).c;
  const attestations = (
    db
      .prepare("SELECT COUNT(*) as c FROM ledger_blocks WHERE payload_type = 'kyc_attestation'")
      .get() as { c: number }
  ).c;
  const models = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM ledger_blocks WHERE payload_type IN ('model_registry','fl_model')"
      )
      .get() as { c: number }
  ).c;
  return { total_blocks: total, kyc_attestations: attestations, model_commits: models };
}

export { sha256 as ledgerHash };
