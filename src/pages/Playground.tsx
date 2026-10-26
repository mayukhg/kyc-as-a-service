import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, Play } from "lucide-react";
import { api, type RiskScoreResponse } from "@/api/client";
import { AppShell } from "@/components/AppShell";
import { useRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const defaultBody = `{
  "customer_id": "hash_abc123",
  "data_points": ["transaction_history", "kyc_profile"]
}`;

export default function Playground() {
  const location = useLocation();
  const { setRole } = useRole();
  const queryClient = useQueryClient();
  const [raw, setRaw] = useState(defaultBody);
  const [result, setResult] = useState<RiskScoreResponse | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setRole("engineer");
    const fromState = (location.state as { customerId?: string } | null)?.customerId;
    if (fromState) {
      setRaw(
        JSON.stringify(
          { customer_id: fromState, data_points: ["transaction_history", "kyc_profile"] },
          null,
          2
        )
      );
    }
  }, [location.state, setRole]);

  const run = useMutation({
    mutationFn: async () => {
      const body = JSON.parse(raw) as { customer_id: string; data_points?: string[] };
      setStep(1);
      await wait(450);
      setStep(2);
      await wait(500);
      const res = await api.riskScore(body);
      setStep(3);
      return res;
    },
    onSuccess: (res) => {
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
      toast.success(`Scored ${res.customer_id}: ${res.risk_score}`);
    },
    onError: (e: Error) => {
      setStep(0);
      toast.error(e.message);
    },
  });

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">API Playground</h1>
        <p className="mt-1 text-muted-foreground">
          Live <code className="text-primary">POST /api/v1/kyc/risk-score</code> against synthetic
          data
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="border-border bg-card p-5 lg:col-span-1">
            <p className="mb-2 text-sm font-medium">Request</p>
            <Textarea
              className="min-h-[260px] font-mono text-xs bg-background"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <Button
              className="mt-4 w-full"
              disabled={run.isPending}
              onClick={() => {
                try {
                  JSON.parse(raw);
                  run.mutate();
                } catch {
                  toast.error("Request body must be valid JSON");
                }
              }}
            >
              {run.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run KYC Risk Check
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Try <code>hash_abc123</code>, <code>hash_omar77</code>, or{" "}
              <code>hash_priya09</code>.
            </p>
          </Card>

          <Card className="border-border bg-card p-5">
            <p className="mb-4 text-sm font-medium">Pipeline</p>
            <ol className="space-y-4">
              {[
                "Layer 1 — Data / ledger lookup",
                "Layer 2 — Computation / scoring",
                "Layer 3 — Consumption / signed response",
              ].map((label, i) => {
                const n = i + 1;
                const done = step > n || (step === 3 && n <= 3 && !!result);
                const active = run.isPending && step === n;
                return (
                  <li key={label} className="flex gap-3">
                    <StepIcon done={done && !active} active={active} />
                    <div>
                      <p className={cn("text-sm font-medium", active && "text-primary")}>
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result?.pipeline?.[i]?.detail ||
                          (active ? "In progress…" : done ? "Done" : "Pending")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card className="border-border bg-card p-5">
            <p className="mb-2 text-sm font-medium">Response</p>
            {result ? (
              <>
                <pre className="max-h-[320px] overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-xs text-muted-foreground">
                  {JSON.stringify(
                    {
                      risk_score: result.risk_score,
                      eligibility: result.eligibility,
                      top_driver: result.top_driver,
                      audit_hash: result.audit_hash,
                      model_version: result.model_version,
                      model_hash: result.model_hash,
                      ledger: result.ledger,
                      timestamp: result.timestamp,
                      latency_ms: result.latency_ms,
                    },
                    null,
                    2
                  )}
                </pre>
                <p className="mt-3 text-xs text-muted-foreground">{result.disclaimer}</p>
                <Button asChild variant="link" className="mt-2 h-auto px-0">
                  <Link to={`/console/customers/${result.customer_id}`}>
                    Open this customer in Console
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run a check to see the signed JSON response.
              </p>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function StepIcon({ done, active }: { done: boolean; active: boolean }) {
  if (active) return <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" />;
  if (done) return <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />;
  return <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
