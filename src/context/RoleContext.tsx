import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type DemoRole = "viewer" | "analyst" | "engineer";

type RoleContextValue = {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

const STORAGE_KEY = "kyc-demo-role";

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DemoRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as DemoRole | null;
    return saved || "viewer";
  });

  const setRole = (next: DemoRole) => {
    localStorage.setItem(STORAGE_KEY, next);
    setRoleState(next);
  };

  const value = useMemo(() => ({ role, setRole }), [role]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
