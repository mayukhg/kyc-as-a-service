export type Metrics = {
  checks: number;
  p50_latency_ms: number;
  audit_coverage_pct: number;
  approval_rate_pct: number;
  model_version: string;
  model_hash?: string;
  ledger_blocks?: number;
  ledger_attestations?: number;
  note: string;
};

export type CustomerListItem = {
  id: string;
  display_name: string;
  email: string;
  segment: string;
  kyc_status: string;
  country: string;
  created_at: string;
  latest_score: {
    id: string;
    risk_score: number;
    eligibility: string;
    top_driver: string;
    model_version: string;
    created_at: string;
  } | null;
  last_decision: { decision: string; created_at: string } | null;
};

export type Driver = { name: string; score: number; impact: number };

export type RiskScoreResponse = {
  risk_score: number;
  eligibility: string;
  top_driver: string;
  drivers: Driver[];
  audit_hash: string;
  model_version: string;
  model_hash: string;
  timestamp: string;
  latency_ms: number;
  score_id: string;
  customer_id: string;
  data_points: string[];
  pipeline: Array<{
    layer: 1 | 2 | 3;
    name: string;
    status: string;
    detail: string;
  }>;
  ledger: {
    height: number;
    block_hash: string;
    prev_hash: string;
    network: string;
  };
  disclaimer: string;
};

export type CustomerDetail = {
  customer: {
    id: string;
    display_name: string;
    email: string;
    segment: string;
    kyc_status: string;
    country: string;
    created_at: string;
    features: Record<string, unknown>;
  };
  latest_score: {
    id: string;
    risk_score: number;
    eligibility: string;
    top_driver: string;
    drivers: Driver[];
    model_version: string;
    latency_ms: number;
    created_at: string;
  } | null;
  attestation: {
    id: string;
    audit_hash: string;
    created_at: string;
    ledger_height?: number;
    ledger_block_hash?: string;
    layer_trace: unknown;
  } | null;
  ledger_verification: {
    valid: boolean;
    reason: string;
    block: Record<string, unknown> | null;
    chain_ok: boolean;
  } | null;
  decisions: Array<{
    id: string;
    decision: string;
    reason: string;
    actor_role: string;
    created_at: string;
  }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  metrics: () => request<Metrics>("/api/metrics"),
  model: () => request<Record<string, unknown>>("/api/model"),
  customers: (params?: { q?: string; eligibility?: string; kyc_status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.eligibility) sp.set("eligibility", params.eligibility);
    if (params?.kyc_status) sp.set("kyc_status", params.kyc_status);
    const qs = sp.toString();
    return request<{ customers: CustomerListItem[] }>(`/api/customers${qs ? `?${qs}` : ""}`);
  },
  customer: (id: string) => request<CustomerDetail>(`/api/customers/${id}`),
  riskScore: (body: { customer_id: string; data_points?: string[] }) =>
    request<RiskScoreResponse>("/api/v1/kyc/risk-score", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  decide: (
    id: string,
    body: { decision: string; reason: string; actor_role?: string; score_id?: string }
  ) =>
    request(`/api/customers/${id}/decisions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  audit: () =>
    request<{
      attestations: Array<Record<string, unknown>>;
      decisions: Array<Record<string, unknown>>;
      ledger?: Record<string, number>;
    }>("/api/audit"),
  verify: (auditHash: string) =>
    request<{
      valid: boolean;
      reason: string;
      block: Record<string, unknown> | null;
      chain_ok: boolean;
    }>(`/api/ledger/verify/${encodeURIComponent(auditHash)}`),
  ledger: () =>
    request<{
      chain: { ok: boolean; tip_height: number };
      stats: Record<string, number>;
      blocks: Array<Record<string, unknown>>;
    }>("/api/ledger"),
  flRounds: () =>
    request<{
      rounds: Array<Record<string, unknown>>;
      institutions: Array<{ id: string; name: string; rows: number }>;
    }>("/api/fl/rounds"),
  runFlRound: () => request<Record<string, unknown>>("/api/fl/rounds", { method: "POST" }),
  reset: () => request<{ ok: boolean; message: string }>("/api/demo/reset", { method: "POST" }),
};
