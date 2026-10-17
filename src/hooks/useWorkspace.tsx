import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import type { PurchaseCurrency, WorkspaceRole, WorkspaceRow } from "@/types/database";

export type Workspace = WorkspaceRow & { role: WorkspaceRole };

export type WorkspaceContextValue = {
  loading: boolean;
  workspaces: Workspace[];
  current: Workspace | null;
  /** True once the user is signed in but has not set up their first workspace. */
  needsOnboarding: boolean;
  switchWorkspace: (id: string) => void;
  refresh: () => Promise<void>;
  createWorkspace: (input: { name: string; defaultCurrency?: PurchaseCurrency }) => Promise<Workspace | null>;
};

const WORKSPACE_STORAGE_KEY = "domainfolio.workspace";

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(Boolean(userId && configured));
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
  );

  const load = useCallback(async () => {
    if (!userId || !configured) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: memberships, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId);

    if (error || !memberships || memberships.length === 0) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    const ids = memberships.map(member => member.workspace_id);
    const { data: rows } = await supabase.from("workspaces").select("*").in("id", ids);
    const roleById = new Map(memberships.map(member => [member.workspace_id, member.role as WorkspaceRole]));

    const combined: Workspace[] = (rows ?? []).map(row => ({
      ...row,
      role: roleById.get(row.id) ?? "member",
    }));

    setWorkspaces(combined);
    setLoading(false);
    setCurrentId(previous => {
      const valid = previous && combined.some(item => item.id === previous) ? previous : (combined[0]?.id ?? null);
      if (valid && typeof window !== "undefined") {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, valid);
      }
      return valid;
    });
  }, [userId, configured]);

  useEffect(() => {
    void load();
  }, [load]);

  const switchWorkspace = useCallback((id: string) => {
    setCurrentId(id);
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    void queryClient.invalidateQueries({ queryKey: ["domains"] });
  }, [queryClient]);

  const createWorkspace = useCallback<WorkspaceContextValue["createWorkspace"]>(
    async ({ name, defaultCurrency = "USD" }) => {
      const { data, error } = await supabase.rpc("create_workspace", {
        p_name: name,
        p_default_currency: defaultCurrency,
      });
      if (error || !data) return null;

      const { data: row } = await supabase.from("workspaces").select("*").eq("id", data).maybeSingle();
      if (!row) return null;

      const workspace: Workspace = { ...row, role: "owner" };
      setWorkspaces(previous => [...previous, workspace]);
      switchWorkspace(workspace.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      return workspace;
    },
    [queryClient, switchWorkspace]
  );

  const current = useMemo(
    () => workspaces.find(workspace => workspace.id === currentId) ?? workspaces[0] ?? null,
    [workspaces, currentId]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      loading,
      workspaces,
      current,
      needsOnboarding: Boolean(userId && configured && !loading && workspaces.length === 0),
      switchWorkspace,
      refresh: load,
      createWorkspace,
    }),
    [loading, workspaces, current, userId, configured, switchWorkspace, load, createWorkspace]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return context;
}

/** Convenience for components that only render once a workspace exists. */
export function useCurrentWorkspaceId() {
  return useWorkspace().current?.id ?? null;
}
