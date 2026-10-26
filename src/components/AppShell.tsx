import { Link, NavLink, useNavigate } from "react-router-dom";
import { Shield, RotateCcw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useRole, type DemoRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Case Study", end: true },
  { to: "/console", label: "Console" },
  { to: "/playground", label: "Playground" },
  { to: "/federated", label: "Federated" },
  { to: "/audit", label: "Audit" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, setRole } = useRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const reset = useMutation({
    mutationFn: () => api.reset(),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Demo data reset");
      navigate("/console");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            <span>Verifiable KYC</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                    isActive && "bg-muted text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as DemoRole)}>
              <SelectTrigger className="w-[130px] bg-card">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => reset.mutate()}
              disabled={reset.isPending}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset demo
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
