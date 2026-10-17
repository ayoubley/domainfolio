import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useAuth } from "@/features/auth/AuthProvider";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  archiveDomain,
  archiveDomains,
  createDomain,
  fetchActivity,
  fetchDomain,
  fetchDomainActivity,
  fetchDomains,
  loadDemoData,
  renewDomain,
  restoreDomain,
  restoreDomains,
  updateDomain,
} from "./api";
import type { DomainRow } from "@/types/database";

/* --------------------------------- queries -------------------------------- */

export function useDomainsQuery(includeArchived = false) {
  const workspaceId = useWorkspace().current?.id ?? null;
  return useQuery({
    queryKey: queryKeys.domains(workspaceId ?? "none", includeArchived ? "with-archived" : "active"),
    queryFn: () => fetchDomains(workspaceId as string, includeArchived),
    enabled: Boolean(workspaceId),
  });
}

export function useDomainQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.domain(id ?? "none"),
    queryFn: () => fetchDomain(id as string),
    enabled: Boolean(id),
  });
}

export function useActivityQuery(limit = 40) {
  const workspaceId = useWorkspace().current?.id ?? null;
  return useQuery({
    queryKey: queryKeys.activity(workspaceId ?? "none"),
    queryFn: () => fetchActivity(workspaceId as string, limit),
    enabled: Boolean(workspaceId),
  });
}

export function useDomainActivityQuery(domainId: string | null) {
  return useQuery({
    queryKey: queryKeys.domainActivity(domainId ?? "none"),
    queryFn: () => fetchDomainActivity(domainId as string),
    enabled: Boolean(domainId),
  });
}

/* ------------------------------- mutations -------------------------------- */

function useInvalidatePortfolio() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["domains"] }),
      queryClient.invalidateQueries({ queryKey: ["activity"] }),
      queryClient.invalidateQueries({ queryKey: ["domain"] }),
    ]);
  };
}

export function useCreateDomain() {
  const { user } = useAuth();
  const workspaceId = useWorkspace().current?.id ?? null;
  const invalidate = useInvalidatePortfolio();

  return useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      if (!workspaceId || !user) throw new Error("No workspace");
      return createDomain({ workspaceId, userId: user.id, values });
    },
    onSuccess: invalidate,
  });
}

export function useUpdateDomain() {
  const { user } = useAuth();
  const workspaceId = useWorkspace().current?.id ?? null;
  const invalidate = useInvalidatePortfolio();

  return useMutation({
    mutationFn: (input: { previous: DomainRow; values: Record<string, unknown> }) => {
      if (!workspaceId || !user) throw new Error("No workspace");
      return updateDomain({ workspaceId, userId: user.id, previous: input.previous, values: input.values });
    },
    onSuccess: invalidate,
  });
}

export function useRenewDomain() {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (input: { domainId: string; renewalCost: number | null; note?: string | null }) =>
      renewDomain(input),
    onSuccess: invalidate,
  });
}

/**
 * Archive is optimistic: the row leaves the list immediately, and rolls back if
 * the server rejects it. Undo (in the toast) calls `restore`.
 */
export function useArchiveDomain(includeArchived = false) {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspace().current?.id ?? null;
  const invalidate = useInvalidatePortfolio();
  const key = queryKeys.domains(workspaceId ?? "none", includeArchived ? "with-archived" : "active");

  return useMutation({
    mutationFn: (input: { domainId: string; reason?: string | null }) => archiveDomain(input),
    onMutate: async input => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DomainRow[]>(key);
      if (previous) {
        queryClient.setQueryData<DomainRow[]>(
          key,
          includeArchived
            ? previous.map(row =>
                row.id === input.domainId ? { ...row, archived_at: new Date().toISOString() } : row
              )
            : previous.filter(row => row.id !== input.domainId)
        );
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: invalidate,
  });
}

export function useRestoreDomain() {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (input: { domainId: string }) => restoreDomain(input),
    onSuccess: invalidate,
  });
}

export function useBulkArchiveDomains() {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (input: { domainIds: string[]; reason?: string | null }) => archiveDomains(input),
    onSuccess: invalidate,
  });
}

export function useBulkRestoreDomains() {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (domainIds: string[]) => restoreDomains(domainIds),
    onSuccess: invalidate,
  });
}

export function useLoadDemoData() {
  const workspaceId = useWorkspace().current?.id ?? null;
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: () => {
      if (!workspaceId) throw new Error("No workspace");
      return loadDemoData(workspaceId);
    },
    onSuccess: invalidate,
  });
}
