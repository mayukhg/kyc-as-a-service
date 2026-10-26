# Verifiable KYC — Hybrid AI-on-Ledger Portfolio Demo

## Intent

This repo is a **product-manager portfolio demo**, not a production banking platform.

**Target concept:**

> A hybrid AI-on-blockchain KYC platform — verifiable credit risk scoring with blockchain-attested audit trails and privacy-preserving federated learning.

**What this app is for**

- Show how a PM would turn that concept into **shippable surfaces** (case study, analyst console, API playground, federated rounds, audit).
- Make every major claim in the concept **demoable and inspectable** in one `npm run dev` session.
- Stay **honest** about fidelity: local permissioned ledger + synthetic data + demo FL — not Fabric/mainnet or bank-grade crypto.

**What it currently does**

- Runs a full-stack app (React + Express + SQLite) with ~50 synthetic customers.
- Scores risk with a **trained gradient-boosted model** (synthetic labels), returns drivers + `model_version` / `model_hash`.
- Executes a **hybrid path**: ledger lookup → off-chain GBM → ledger commit → API/console.
- Stores **append-only ledger attestations** and supports `verify` of an `audit_hash`.
- Lets an **analyst** approve / reject / manual-review with reasons in an audit trail.
- Runs **federated learning rounds** across three institutional partitions (FedAvg; raw rows stay local; new model hash sealed on ledger).

## How far it matches the concept

Roughly **~70–80% as a demoable concept**; still **~20–30% short** of a literal production “AI-on-blockchain” platform.

| Claim | Match | What you have |
|--------|--------|----------------|
| **Hybrid** | Strong | Live path: ledger lookup → off-chain GBM → ledger commit + API |
| **AI** | Good (demo-grade) | Trained gradient-boosted stumps on synthetic labels, versioned `model_hash` — not production XGBoost/LightGBM, but real model inference |
| **On-blockchain** | Partial / honest | Local **append-only permissioned ledger** with verify — not Fabric/Corda/public L1 |
| **KYC platform** | Partial | Score + decide + audit + KYC status fields — not full IDV (docs/OCR/liveness) |
| **Verifiable credit risk scoring** | Strong | Score + drivers + `model_version` / `model_hash` + replayable API |
| **Blockchain-attested audit trails** | Strong (sim) | Attestations committed as blocks; `GET /api/ledger/verify/:hash` |
| **Privacy-preserving federated learning** | Strong (sim) | 3 bank partitions, local updates, FedAvg, new model hash on ledger; raw rows stay local |

**Fair one-liner for interviews:**

> Local permissioned ledger + synthetic data + demo FL — not a production chain or bank-grade FL crypto.

**Not fair to imply:** mainnet/Hyperledger ops, real customer PII, or production secure aggregation.

**Still scoped out:** public L1 / Fabric ops, production OAuth, OCR/liveness, cryptographic secure aggregation.

## Quick start

```bash
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| App | http://localhost:8080 |
| API | http://localhost:3001 |

Surfaces: **case study**, **Analyst Console**, **API Playground**, **Federated Learning**, **Audit**.

## Demo artifacts (no install)

| Artifact | Path | How to open |
|----------|------|-------------|
| Self-contained interactive mock | [`demo/architecture-working-mock.html`](demo/architecture-working-mock.html) | Open in browser |
| In-depth slide deck + screenshots | [`demo/slides/index.html`](demo/slides/index.html) | Open in browser (←/→ keys) |
| E2E workflow video | [`demo/video/e2e-workflow.mp4`](demo/video/e2e-workflow.mp4) | Play in any video player |
| Re-capture screens/video | `node demo/capture-demo.mjs` | App must be running on :8080 |

```bash
# optional local static server for demo/
python3 -m http.server 8090 --directory demo
# then http://127.0.0.1:8090/slides/index.html
#      http://127.0.0.1:8090/architecture-working-mock.html
```

## Implementation phases (A–D)

| Phase | Capability |
|-------|------------|
| **A** | Append-only local ledger, `GET /api/ledger/verify/:hash`, score commits blocks |
| **B** | Gradient-boosted stumps trained on synthetic labels (`server/ml/`), versioned `model_hash` |
| **C** | Hybrid L1 ledger lookup → L2 GBM → L3 ledger commit in `POST /api/v1/kyc/risk-score` |
| **D** | `/federated` UI + FedAvg across 3 banks; new model hash sealed on ledger |

## App routes

| Route | Purpose |
|-------|---------|
| `/` | PM case study + live metrics |
| `/console` | Analyst review queue |
| `/console/customers/:id` | Drivers, ledger verify, decisions |
| `/playground` | Live risk-score API + pipeline |
| `/federated` | Run FL rounds |
| `/audit` | Attestations + decisions |

## 5-minute interviewer script

1. `/` — metrics + tradeoffs  
2. Playground — `hash_abc123` — show L1→L2→L3 + ledger height  
3. Open customer → role **Analyst** → submit decision  
4. Federated → **Run FL round** → model version bump  
5. Audit → attestation + decision  

Curated IDs: `hash_abc123`, `hash_omar77`, `hash_priya09`.

## Key APIs

- `POST /api/v1/kyc/risk-score` — hybrid score + ledger commit  
- `GET /api/ledger` / `GET /api/ledger/verify/:auditHash`  
- `GET /api/model`  
- `POST /api/fl/rounds`  
- `POST /api/demo/reset`  

## Stack

React + Vite + Tailwind + TanStack Query · Express + better-sqlite3 + Zod · pure-TS GBM · Playwright capture scripts for decks/video
