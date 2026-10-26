import { createHash, randomUUID } from "crypto";
import type { CustomerFeatures } from "./db.js";
import { ensureModel, scoreWithGbm, type GbmModel } from "./ml/gbm.js";

let cachedModel: GbmModel | null = null;

export function getModel(): GbmModel {
  if (!cachedModel) cachedModel = ensureModel();
  return cachedModel;
}

export function setModel(model: GbmModel) {
  cachedModel = model;
}

export function getModelVersion() {
  return getModel().version;
}

export type DriverScore = {
  name: string;
  score: number;
  impact: number;
};

export type ScoreResult = {
  risk_score: number;
  eligibility: "High" | "Medium" | "Low";
  top_driver: string;
  drivers: DriverScore[];
  model_version: string;
  model_hash: string;
};

export type PipelineStep = {
  layer: 1 | 2 | 3;
  name: string;
  status: "done" | "running" | "pending";
  detail: string;
};

export function computeScore(features: CustomerFeatures): ScoreResult {
  return scoreWithGbm(features, getModel());
}

export function buildAuditHash(
  customerId: string,
  riskScore: number,
  modelVersion: string,
  timestamp: string
) {
  const payload = `${customerId}|${riskScore}|${modelVersion}|${timestamp}`;
  return `0x${createHash("sha256").update(payload).digest("hex").slice(0, 40)}`;
}

export function buildPipeline(args: {
  customerId: string;
  layer1Detail: string;
  layer2Detail: string;
  layer3Detail: string;
}): PipelineStep[] {
  return [
    {
      layer: 1,
      name: "Data Layer — Ledger Lookup",
      status: "done",
      detail: args.layer1Detail,
    },
    {
      layer: 2,
      name: "Computation Layer — GBM Scoring",
      status: "done",
      detail: args.layer2Detail,
    },
    {
      layer: 3,
      name: "Consumption Layer — Ledger Commit + API",
      status: "done",
      detail: args.layer3Detail,
    },
  ];
}

export function newId(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}
