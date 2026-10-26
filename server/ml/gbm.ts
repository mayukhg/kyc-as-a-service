import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { CustomerFeatures } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MODEL_PATH = path.join(__dirname, "model.json");

export const FEATURE_KEYS = [
  "txn_consistency",
  "account_age_months",
  "delinquency_count",
  "income_band_num",
  "kyc_doc_score",
  "volatility",
] as const;

export type FeatureVector = number[];

export type Stump = {
  feature: number;
  threshold: number;
  left: number;
  right: number;
};

export type GbmModel = {
  version: string;
  trained_at: string;
  n_estimators: number;
  learning_rate: number;
  base_score: number;
  trees: Stump[];
  feature_names: string[];
  feature_importance: number[];
  train_rows: number;
  train_rmse: number;
  model_hash: string;
  algorithm: "gradient_boosted_stumps";
  note: string;
};

const DRIVER_LABELS = [
  "Transaction Consistency",
  "Account Age",
  "Delinquency",
  "Income Band",
  "KYC Document Strength",
  "Behavior Stability",
];

export function featuresToVector(f: CustomerFeatures): FeatureVector {
  return [
    f.txn_consistency,
    f.account_age_months,
    f.delinquency_count,
    f.income_band === "high" ? 2 : f.income_band === "mid" ? 1 : 0,
    f.kyc_doc_score,
    f.volatility,
  ];
}

function predictTrees(x: FeatureVector, model: GbmModel): number {
  let y = model.base_score;
  for (const t of model.trees) {
    y += model.learning_rate * (x[t.feature] <= t.threshold ? t.left : t.right);
  }
  return y;
}

function fitStump(X: FeatureVector[], residuals: number[]): Stump {
  let best: Stump = { feature: 0, threshold: 0, left: 0, right: 0 };
  let bestLoss = Infinity;

  for (let f = 0; f < FEATURE_KEYS.length; f++) {
    const values = [...new Set(X.map((row) => row[f]))].sort((a, b) => a - b);
    const thresholds =
      values.length <= 1
        ? [values[0] ?? 0]
        : values.slice(0, -1).map((v, i) => (v + values[i + 1]) / 2);

    for (const thr of thresholds) {
      let leftSum = 0;
      let leftN = 0;
      let rightSum = 0;
      let rightN = 0;
      for (let i = 0; i < X.length; i++) {
        if (X[i][f] <= thr) {
          leftSum += residuals[i];
          leftN++;
        } else {
          rightSum += residuals[i];
          rightN++;
        }
      }
      if (!leftN || !rightN) continue;
      const left = leftSum / leftN;
      const right = rightSum / rightN;
      let loss = 0;
      for (let i = 0; i < X.length; i++) {
        const pred = X[i][f] <= thr ? left : right;
        const e = residuals[i] - pred;
        loss += e * e;
      }
      if (loss < bestLoss) {
        bestLoss = loss;
        best = { feature: f, threshold: thr, left, right };
      }
    }
  }
  return best;
}

function syntheticLabel(f: CustomerFeatures): number {
  // Ground-truth risk score generator for training (not used at inference)
  const txn = f.txn_consistency;
  const age = Math.min(f.account_age_months / 60, 1) * 100;
  const delinq = Math.max(0, 100 - f.delinquency_count * 18);
  const kyc = f.kyc_doc_score;
  const vol = Math.max(0, 100 - f.volatility);
  const income = f.income_band === "high" ? 25 : f.income_band === "mid" ? 10 : 0;
  const weighted = txn * 0.28 + age * 0.18 + delinq * 0.22 + kyc * 0.18 + vol * 0.14 + income;
  const noise = ((txn * 7 + kyc * 3) % 17) - 8;
  return Math.round(Math.max(300, Math.min(850, 300 + weighted * 5.5 + noise)));
}

function makeTrainingSet(n = 800): { X: FeatureVector[]; y: number[] } {
  const X: FeatureVector[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const f: CustomerFeatures = {
      txn_consistency: 20 + (i * 13) % 80,
      account_age_months: 3 + (i * 5) % 84,
      delinquency_count: i % 6 === 0 ? 3 : i % 4 === 0 ? 1 : 0,
      income_band: i % 3 === 0 ? "high" : i % 3 === 1 ? "mid" : "low",
      kyc_doc_score: 35 + (i * 11) % 65,
      volatility: 10 + (i * 17) % 75,
    };
    X.push(featuresToVector(f));
    y.push(syntheticLabel(f));
  }
  return { X, y };
}

export function trainGbm(opts?: { n_estimators?: number; learning_rate?: number }): GbmModel {
  const n_estimators = opts?.n_estimators ?? 40;
  const learning_rate = opts?.learning_rate ?? 0.08;
  const { X, y } = makeTrainingSet(900);
  const base_score = y.reduce((a, b) => a + b, 0) / y.length;
  const pred = X.map(() => base_score);
  const trees: Stump[] = [];
  const importance = FEATURE_KEYS.map(() => 0);

  for (let t = 0; t < n_estimators; t++) {
    const residuals = y.map((yi, i) => yi - pred[i]);
    const stump = fitStump(X, residuals);
    trees.push(stump);
    importance[stump.feature] += Math.abs(stump.left - stump.right);
    for (let i = 0; i < X.length; i++) {
      pred[i] +=
        learning_rate * (X[i][stump.feature] <= stump.threshold ? stump.left : stump.right);
    }
  }

  const rmse = Math.sqrt(
    pred.reduce((acc, p, i) => acc + (p - y[i]) ** 2, 0) / y.length
  );
  const impSum = importance.reduce((a, b) => a + b, 0) || 1;
  const feature_importance = importance.map((v) => Number((v / impSum).toFixed(4)));

  const draft: Omit<GbmModel, "model_hash"> = {
    version: "gbm-v1.0.0",
    trained_at: new Date().toISOString(),
    n_estimators,
    learning_rate,
    base_score,
    trees,
    feature_names: [...FEATURE_KEYS],
    feature_importance,
    train_rows: X.length,
    train_rmse: Number(rmse.toFixed(2)),
    algorithm: "gradient_boosted_stumps",
    note: "Gradient-boosted regression stumps trained on synthetic labeled credit outcomes.",
  };

  const model_hash = `0x${createHash("sha256")
    .update(JSON.stringify({ trees, base_score, learning_rate, version: draft.version }))
    .digest("hex")
    .slice(0, 40)}`;

  return { ...draft, model_hash };
}

export function saveModel(model: GbmModel) {
  fs.mkdirSync(path.dirname(MODEL_PATH), { recursive: true });
  fs.writeFileSync(MODEL_PATH, JSON.stringify(model, null, 2));
}

export function loadModel(): GbmModel {
  if (!fs.existsSync(MODEL_PATH)) {
    const model = trainGbm();
    saveModel(model);
    return model;
  }
  return JSON.parse(fs.readFileSync(MODEL_PATH, "utf8")) as GbmModel;
}

export function ensureModel(): GbmModel {
  return loadModel();
}

export function scoreWithGbm(features: CustomerFeatures, model: GbmModel) {
  const x = featuresToVector(features);
  const raw = predictTrees(x, model);
  const risk_score = Math.round(Math.max(300, Math.min(850, raw)));

  const drivers = model.feature_names.map((name, i) => {
    const importance = model.feature_importance[i];
    const normalized =
      name === "delinquency_count" || name === "volatility"
        ? Math.max(0, 100 - (name === "volatility" ? features.volatility : features.delinquency_count * 18))
        : name === "account_age_months"
          ? Math.min(100, (features.account_age_months / 60) * 100)
          : name === "income_band_num"
            ? features.income_band === "high"
              ? 90
              : features.income_band === "mid"
                ? 60
                : 30
            : name === "txn_consistency"
              ? features.txn_consistency
              : features.kyc_doc_score;

    return {
      name: DRIVER_LABELS[i],
      score: Math.round(normalized),
      impact: Math.round(importance * 100),
    };
  }).sort((a, b) => b.impact - a.impact);

  const eligibility = risk_score >= 720 ? "High" : risk_score >= 580 ? "Medium" : "Low";

  return {
    risk_score,
    eligibility: eligibility as "High" | "Medium" | "Low",
    top_driver: drivers[0].name,
    drivers,
    model_version: model.version,
    model_hash: model.model_hash,
  };
}

/** FedAvg-style merge of stump ensembles (demo FL). */
export function aggregateModels(global: GbmModel, locals: GbmModel[], versionBump: string): GbmModel {
  const n = locals.length || 1;
  const trees = global.trees.map((t, i) => {
    const parts = locals.map((m) => m.trees[i] || t);
    return {
      feature: t.feature,
      threshold: parts.reduce((s, p) => s + p.threshold, 0) / parts.length,
      left: parts.reduce((s, p) => s + p.left, 0) / parts.length,
      right: parts.reduce((s, p) => s + p.right, 0) / parts.length,
    };
  });

  const base_score =
    locals.reduce((s, m) => s + m.base_score, 0) / n;
  const feature_importance = global.feature_importance.map((_, i) =>
    Number((locals.reduce((s, m) => s + m.feature_importance[i], 0) / n).toFixed(4))
  );

  const draft: Omit<GbmModel, "model_hash"> = {
    ...global,
    version: versionBump,
    trained_at: new Date().toISOString(),
    trees,
    base_score,
    feature_importance,
    note: "Federated aggregation (FedAvg on stump parameters) — raw customer rows never left institutions.",
  };

  const model_hash = `0x${createHash("sha256")
    .update(JSON.stringify({ trees, base_score, version: versionBump }))
    .digest("hex")
    .slice(0, 40)}`;

  return { ...draft, model_hash };
}

export function trainLocalFromPartition(
  global: GbmModel,
  bankSeed: number,
  rows = 200
): GbmModel {
  // Continue boosting from global base using a bank-specific synthetic partition
  const X: FeatureVector[] = [];
  const y: number[] = [];
  for (let i = 0; i < rows; i++) {
    const k = bankSeed * 1000 + i;
    const f: CustomerFeatures = {
      txn_consistency: 15 + (k * 17) % 85,
      account_age_months: 2 + (k * 7) % 90,
      delinquency_count: k % 5 === 0 ? 2 : k % 3 === 0 ? 1 : 0,
      income_band: k % 3 === 0 ? "high" : k % 3 === 1 ? "mid" : "low",
      kyc_doc_score: 30 + (k * 9) % 70,
      volatility: 8 + (k * 19) % 80,
    };
    X.push(featuresToVector(f));
    y.push(syntheticLabel(f));
  }

  const learning_rate = global.learning_rate;
  const pred = X.map((x) => predictTrees(x, global));
  const trees = [...global.trees];
  const importance = [...global.feature_importance.map((v) => v * 100)];

  for (let t = 0; t < 8; t++) {
    const residuals = y.map((yi, i) => yi - pred[i]);
    const stump = fitStump(X, residuals);
    trees.push(stump);
    importance[stump.feature] += Math.abs(stump.left - stump.right);
    for (let i = 0; i < X.length; i++) {
      pred[i] +=
        learning_rate * (X[i][stump.feature] <= stump.threshold ? stump.left : stump.right);
    }
  }

  // Keep same length as global for FedAvg by averaging extra into last trees
  const trimmed = trees.slice(0, global.trees.length).map((t, i) => {
    if (i < global.trees.length - 8) return global.trees[i];
    return trees[i] || t;
  });

  const impSum = importance.reduce((a, b) => a + b, 0) || 1;
  const draft: Omit<GbmModel, "model_hash"> = {
    ...global,
    trees: trimmed,
    base_score: pred.reduce((a, b) => a + b, 0) / pred.length,
    feature_importance: importance.map((v) => Number((v / impSum).toFixed(4))),
    trained_at: new Date().toISOString(),
    train_rows: rows,
    note: `Local update for institution seed=${bankSeed}`,
  };
  const model_hash = `0x${createHash("sha256")
    .update(JSON.stringify({ trees: trimmed, bankSeed }))
    .digest("hex")
    .slice(0, 40)}`;
  return { ...draft, model_hash };
}
