import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AppShell } from "@/components/AppShell";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DecisionKind = "approve" | "reject" | "manual_review";

export default function CustomerDetail() {
  const { id = "" } = useParams();
  const { role } = useRole();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<DecisionKind>("approve");
  const [reason, setReason] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.customer(id),
    enabled: !!id,
  });

  const mutate = useMutation({
    mutationFn: () =>
      api.decide(id, {
        decision,
        reason,
        actor_role: role === "viewer" ? "analyst" : role,
        score_id: data?.latest_score?.id,
      }),
    onSuccess: () => {
      toast.success("Decision recorded in audit trail");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <p className="mb-4 text-sm text-muted-foreground">
          <Link to="/console" className="hover:text-foreground">
            Console
          </Link>{" "}
          / {data?.customer.display_name || id}
        </p>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">{(error as Error).message}</p>}

        {data && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold">{data.customer.display_name}</h1>
                    <Badge variant="outline">{data.customer.kyc_status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.customer.id} · {data.customer.segment} · {data.customer.country}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/playground" state={{ customerId: data.customer.id }}>
                    Open in Playground
                  </Link>
                </Button>
              </div>

              <Card className="border-border bg-card p-6">
                <p className="text-sm text-muted-foreground">Risk score</p>
                <div className="mt-1 flex items-end gap-4">
                  <span className="text-5xl font-bold tabular-nums">
                    {data.latest_score?.risk_score ?? "—"}
                  </span>
                  <span className="pb-1 text-muted-foreground">
                    Eligibility:{" "}
                    <strong className="text-foreground">
                      {data.latest_score?.eligibility}
                    </strong>
                  </span>
                </div>
              </Card>

              <Card className="border-border bg-card p-6">
                <h2 className="font-semibold">Score drivers</h2>
                <div className="mt-4 space-y-4">
                  {(data.latest_score?.drivers || []).map((d) => (
                    <div key={d.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{d.name}</span>
                        <span className="tabular-nums text-muted-foreground">{d.score}/100</span>
                      </div>
                      <Progress value={d.score} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-border bg-card p-6">
                <h2 className="font-semibold">Ledger attestation</h2>
                <p className="mt-2 break-all font-mono text-sm text-primary">
                  {data.attestation?.audit_hash || "—"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Model {data.latest_score?.model_version}
                  {data.attestation?.ledger_height != null &&
                    ` · height ${data.attestation.ledger_height}`}
                  {data.attestation?.created_at
                    ? ` · ${new Date(data.attestation.created_at).toLocaleString()}`
                    : ""}
                </p>
                {data.ledger_verification && (
                  <p
                    className={`mt-3 text-sm ${
                      data.ledger_verification.valid ? "text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {data.ledger_verification.valid ? "Verified on ledger: " : "Verify failed: "}
                    {data.ledger_verification.reason}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Local append-only permissioned ledger (portfolio sim) — not a public L1.
                </p>
              </Card>

              <Card className="border-border bg-card p-6">
                <h2 className="font-semibold">Prior decisions</h2>
                {data.decisions.length === 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">No decisions yet.</p>
                )}
                <ul className="mt-4 space-y-3">
                  {data.decisions.map((d) => (
                    <li key={d.id} className="border-l-2 border-border pl-3">
                      <p className="capitalize font-medium">
                        {d.decision.replace("_", " ")}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          · {d.actor_role} · {new Date(d.created_at).toLocaleString()}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">{d.reason}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card className="h-fit border-border bg-card p-5">
              <h2 className="font-semibold">Decision actions</h2>
              <div className="mt-4 grid gap-2">
                {(
                  [
                    ["approve", "Approve"],
                    ["reject", "Reject"],
                    ["manual_review", "Manual review"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDecision(value)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      decision === value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-sm text-muted-foreground">
                Reason *
                <Textarea
                  className="mt-2 bg-background"
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Required — recorded in the audit trail"
                />
              </label>
              <p className="mt-1 text-right text-xs text-muted-foreground">{reason.length}/500</p>
              <Button
                className="mt-3 w-full"
                disabled={reason.trim().length < 3 || mutate.isPending || role === "viewer"}
                onClick={() => mutate.mutate()}
              >
                {role === "viewer" ? "Switch to Analyst to submit" : "Submit decision"}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
