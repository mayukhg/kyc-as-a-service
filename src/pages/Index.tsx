import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Code2, Shield, Users, HelpCircle, Box } from "lucide-react";
import { api } from "@/api/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const decisions = [
  {
    title: "Dual personas in v1",
    why: "Analysts need evidence; engineers need a contract. Shipping both shows end-to-end product thinking.",
  },
  {
    title: "Local permissioned ledger, not public L1",
    why: "Append-only blocks with verify API demonstrate attestation UX without Fabric ops overhead.",
  },
  {
    title: "Trained GBM on synthetic labels",
    why: "Gradient-boosted stumps replace pure heuristics so “AI scoring” is inspectable and versioned.",
  },
  {
    title: "Federated rounds as a first-class surface",
    why: "Three institutional partitions + FedAvg + model hash on ledger make the privacy story demoable.",
  },
];

const Index = () => {
  const { data: metrics } = useQuery({ queryKey: ["metrics"], queryFn: api.metrics });

  return (
    <AppShell>
      <section className="container mx-auto px-4 pb-16 pt-14">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
          Portfolio Case Study
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Problem to Product:{" "}
          <span className="gradient-text">Verifiable KYC Scoring</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Banks need more than risk scores — they need auditable, explainable decisions they can
          defend. This working demo uses synthetic data to show the product surfaces I would ship
          first.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/console">
              Open Analyst Console
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/playground">
              <Code2 className="mr-2 h-4 w-4" />
              Open API Playground
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Checks"
            value={metrics ? metrics.checks.toLocaleString() : "—"}
            icon={<Shield className="h-4 w-4 text-primary" />}
          />
          <Metric
            label="p50 latency"
            value={metrics ? `${metrics.p50_latency_ms}ms` : "—"}
            icon={<Shield className="h-4 w-4 text-primary" />}
          />
          <Metric
            label="Audit coverage"
            value={metrics ? `${metrics.audit_coverage_pct}%` : "—"}
            icon={<Shield className="h-4 w-4 text-primary" />}
          />
          <Metric
            label="Approval rate"
            value={metrics ? `${metrics.approval_rate_pct}%` : "—"}
            icon={<Shield className="h-4 w-4 text-primary" />}
          />
        </div>
        {metrics?.note && (
          <p className="mt-3 text-xs text-muted-foreground">{metrics.note}</p>
        )}
      </section>

      <section className="border-y border-border bg-muted/40 py-16">
        <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3">
          <StoryCard
            icon={<HelpCircle className="h-5 w-5 text-primary" />}
            title="Problem"
            body="Compliance teams rely on fragmented tools and opaque models. Scores lack explanations, lineage, and audit evidence."
          />
          <StoryCard
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Users"
            body="KYC analysts need defendable decisions; platform engineers need a verifiable score in one API call."
          />
          <StoryCard
            icon={<Box className="h-5 w-5 text-primary" />}
            title="Solution"
            body="Three-layer product model: simulated ledger attestation → scoring → signed API/console delivery."
          />
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold">What I decided</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Explicit tradeoffs a hiring manager can probe in an interview — scope as a product skill.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {decisions.map((d) => (
            <Card key={d.title} className="border-border bg-card p-5">
              <h3 className="font-semibold">{d.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d.why}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-6 border-dashed border-border bg-card/50 p-5">
          <h3 className="font-semibold">Still out of scope (on purpose)</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Public/mainnet chains, Hyperledger ops, production OAuth, document OCR/liveness, and
            cryptographic secure aggregation. This build is a hybrid AI-on-ledger portfolio demo
            with a real GBM artifact, append-only attestations, and runnable FL rounds.
          </p>
        </Card>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/federated">Open Federated Learning</Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
};

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function StoryCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="border-border bg-card p-6">
      <div className="mb-3">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}

export default Index;
