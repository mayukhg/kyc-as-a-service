import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Network, Play } from "lucide-react";
import { api } from "@/api/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Federated() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["fl"], queryFn: api.flRounds });
  const { data: model } = useQuery({ queryKey: ["model"], queryFn: api.model });

  const run = useMutation({
    mutationFn: () => api.runFlRound(),
    onSuccess: (res) => {
      toast.success(`FL round ${String(res.round_number)} committed to ledger`);
      queryClient.invalidateQueries({ queryKey: ["fl"] });
      queryClient.invalidateQueries({ queryKey: ["model"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Network className="h-7 w-7 text-primary" />
              Federated Learning
            </h1>
            <p className="mt-1 text-muted-foreground">
              Multi-institution training without sharing raw customer data — model hash sealed on the
              local ledger
            </p>
          </div>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            <Play className="mr-2 h-4 w-4" />
            {run.isPending ? "Running round…" : "Run FL round"}
          </Button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {(data?.institutions || []).map((inst) => (
            <Card key={inst.id} className="border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">{inst.id}</p>
              <h3 className="mt-1 font-semibold">{inst.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Local partition ≈ {inst.rows} synthetic rows
              </p>
              <Badge variant="outline" className="mt-3">
                Raw rows never leave bank
              </Badge>
            </Card>
          ))}
        </div>

        <Card className="mb-8 border-border bg-card p-5">
          <h2 className="font-semibold">Global model (live)</h2>
          {model ? (
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-mono">{String(model.version)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Model hash</dt>
                <dd className="break-all font-mono text-primary">{String(model.model_hash)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Algorithm</dt>
                <dd>{String(model.algorithm)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Train RMSE (synthetic)</dt>
                <dd>{String(model.train_rmse)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Loading model…</p>
          )}
        </Card>

        <h2 className="mb-3 text-xl font-semibold">Rounds</h2>
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {data && data.rounds.length === 0 && (
          <Card className="border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
            No federated rounds yet. Run a round to distribute the global GBM, train locally at three
            institutions, FedAvg-aggregate, and commit the new model hash to the ledger.
          </Card>
        )}
        <div className="space-y-4">
          {(data?.rounds || []).map((r) => (
            <Card key={String(r.id)} className="border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Round {String(r.round_number)}</h3>
                <Badge variant="outline">{String(r.status)}</Badge>
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {String(r.global_model_hash_before)} →{" "}
                <span className="text-primary">{String(r.global_model_hash_after)}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {String(r.global_model_version_before)} → {String(r.global_model_version_after)} ·
                ledger height {String(r.ledger_block_height)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
