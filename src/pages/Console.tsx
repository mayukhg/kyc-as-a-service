import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Console() {
  const [q, setQ] = useState("");
  const [eligibility, setEligibility] = useState<string>("all");
  const [kyc, setKyc] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", q, eligibility, kyc],
    queryFn: () =>
      api.customers({
        q: q || undefined,
        eligibility: eligibility === "all" ? undefined : eligibility,
        kyc_status: kyc === "all" ? undefined : kyc,
      }),
  });

  const topDriver = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of data?.customers || []) {
      const d = c.latest_score?.top_driver;
      if (d) counts.set(d, (counts.get(d) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [data]);

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Review queue</h1>
            <p className="text-muted-foreground">Customers awaiting risk decision</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.customers.length} cases` : "Loading…"}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Input
            placeholder="Search customer, email, or id"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm bg-card"
          />
          <Select value={eligibility} onValueChange={setEligibility}>
            <SelectTrigger className="w-[160px] bg-card">
              <SelectValue placeholder="Eligibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All eligibility</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kyc} onValueChange={setKyc}>
            <SelectTrigger className="w-[160px] bg-card">
              <SelectValue placeholder="KYC status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All KYC</SelectItem>
              <SelectItem value="Verified">Verified</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Card className="overflow-hidden border-border bg-card">
            {isLoading && <p className="p-6 text-muted-foreground">Loading customers…</p>}
            {error && (
              <p className="p-6 text-destructive">{(error as Error).message}</p>
            )}
            {data && data.customers.length === 0 && (
              <p className="p-6 text-muted-foreground">No customers match these filters.</p>
            )}
            {data && data.customers.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Eligibility</TableHead>
                    <TableHead>Last decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.customers.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link to={`/console/customers/${c.id}`} className="block">
                          <div className="font-medium text-foreground">{c.display_name}</div>
                          <div className="text-xs text-muted-foreground">{c.email}</div>
                        </Link>
                      </TableCell>
                      <TableCell>{c.segment}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.kyc_status}</Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {c.latest_score?.risk_score ?? "—"}
                      </TableCell>
                      <TableCell>
                        <EligibilityPill value={c.latest_score?.eligibility} />
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {c.last_decision?.decision?.replace("_", " ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="h-fit border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Top driver across queue</p>
            <h3 className="mt-2 text-lg font-semibold">{topDriver}</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Tip for demos: open <code className="text-primary">Maya Chen</code> (
              <code className="text-xs">hash_abc123</code>) or{" "}
              <code className="text-primary">Priya Nair</code> for a low-score path.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function EligibilityPill({ value }: { value?: string }) {
  if (!value) return <span>—</span>;
  const cls =
    value === "High"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : value === "Medium"
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : "bg-rose-500/15 text-rose-400 border-rose-500/30";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {value}
    </span>
  );
}
