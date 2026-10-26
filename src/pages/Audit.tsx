import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Audit() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit"],
    queryFn: api.audit,
  });

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Audit explorer</h1>
        <p className="mt-1 text-muted-foreground">
          Attestations and analyst decisions — the compliance story in one place
        </p>

        {isLoading && <p className="mt-6 text-muted-foreground">Loading audit trail…</p>}
        {error && <p className="mt-6 text-destructive">{(error as Error).message}</p>}

        {data && (
          <Tabs defaultValue="attestations" className="mt-8">
            <TabsList>
              <TabsTrigger value="attestations">
                Attestations ({data.attestations.length})
              </TabsTrigger>
              <TabsTrigger value="decisions">Decisions ({data.decisions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="attestations">
              <Card className="border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Eligibility</TableHead>
                      <TableHead>Audit hash</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.attestations.map((a) => (
                      <TableRow key={String(a.id)}>
                        <TableCell>
                          <Link
                            className="text-primary hover:underline"
                            to={`/console/customers/${a.customer_id}`}
                          >
                            {String(a.display_name)}
                          </Link>
                        </TableCell>
                        <TableCell className="tabular-nums">{String(a.risk_score)}</TableCell>
                        <TableCell>{String(a.eligibility)}</TableCell>
                        <TableCell className="max-w-[220px] truncate font-mono text-xs">
                          {String(a.audit_hash)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(String(a.created_at)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="decisions">
              <Card className="border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.decisions.map((d) => (
                      <TableRow key={String(d.id)}>
                        <TableCell>
                          <Link
                            className="text-primary hover:underline"
                            to={`/console/customers/${d.customer_id}`}
                          >
                            {String(d.display_name)}
                          </Link>
                        </TableCell>
                        <TableCell className="capitalize">
                          {String(d.decision).replace("_", " ")}
                        </TableCell>
                        <TableCell className="max-w-md text-sm text-muted-foreground">
                          {String(d.reason)}
                        </TableCell>
                        <TableCell>{String(d.actor_role)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(String(d.created_at)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
