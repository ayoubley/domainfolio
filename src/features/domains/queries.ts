import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useAuth } from "@/features/auth/AuthProvider";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  archiveDomain,
  archiveDomains,
  createDomain,
  createDomainsBulk,
  createFolder,
  deleteDomain,
  deleteFolder,
  fetchActivity,
  fetchDomain,
  fetchDomainActivity,
  fetchDomains,
  fetchFolders,
  loadDemoData,
  renewDomain,
  restoreDomain,
  restoreDomains,
  restoreImportedDomains,
  updateDomain,
  updateFolder,
} from "./api";
import type { DomainRow, DomainUpdate } from "@/types/database";

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

/** Bulk create used by the import wizard. Invalidates the whole portfolio. */
export function useBulkCreateDomains() {
  const { user } = useAuth();
  const workspaceId = useWorkspace().current?.id ?? null;
  const invalidate = useInvalidatePortfolio();

  return useMutation({
    mutationFn: (rows: Record<string, unknown>[]) => {
      if (!workspaceId || !user) throw new Error("No workspace");
      return createDomainsBulk({ workspaceId, userId: user.id, rows });
    },
    onSuccess: invalidate,
  });
}

/**
 * The import's second half: names that sit in the archive come back through a
 * single bulk upsert rather than a write per domain.
 */
export function useRestoreImportedDomains() {
  const { user } = useAuth();
  const workspaceId = useWorkspace().current?.id ?? null;
  const invalidate = useInvalidatePortfolio();

  return useMutation({
    mutationFn: (rows: Record<string, unknown>[]) => {
      if (!workspaceId || !user) throw new Error("No workspace");
      return restoreImportedDomains({ workspaceId, userId: user.id, rows });
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

/* --------------------------- folders (query + CRUD) ------------------------ */

export function useFoldersQuery() {
  const workspaceId = useWorkspace().current?.id ?? null;
  return useQuery({
    queryKey: queryKeys.folders(workspaceId ?? "none"),
    queryFn: () => fetchFolders(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}

function useInvalidateFolders() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["folders"] });
}

export function useCreateFolder() {
  const workspaceId = useWorkspace().current?.id ?? null;
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (input: { name: string; color: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      return createFolder({ workspaceId, ...input });
    },
    onSuccess: invalidate,
  });
}

export function useUpdateFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (input: { id: string; name?: string; color?: string; sort_order?: number }) => updateFolder(input),
    onSuccess: invalidate,
  });
}

export function useDeleteFolder() {
  const invalidate = useInvalidateFolders();
  const invalidatePortfolio = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: async () => {
      await invalidate();
      await invalidatePortfolio();
    },
  });
}

/* ------------------------- inline single-field update ---------------------- */

/**
 * Optimistic update for a single stored field (the Auto/Privacy/Locked switches,
 * folder assignment, URL forwarding). Rolls back if the server rejects it.
 */
export function useQuickUpdateDomain(includeArchived = false) {
  const { user } = useAuth();
  const workspaceId = useWorkspace().current?.id ?? null;
  const queryClient = useQueryClient();
  const invalidate = useInvalidatePortfolio();
  const key = queryKeys.domains(workspaceId ?? "none", includeArchived ? "with-archived" : "active");

  return useMutation({
    mutationFn: (input: { previous: DomainRow; values: DomainUpdate }) => {
      if (!workspaceId || !user) throw new Error("No workspace");
      return updateDomain({ workspaceId, userId: user.id, previous: input.previous, values: input.values });
    },
    onMutate: async input => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DomainRow[]>(key);
      if (previous) {
        queryClient.setQueryData<DomainRow[]>(
          key,
          previous.map(row => (row.id === input.previous.id ? { ...row, ...input.values } : row))
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

/* ------------------------------- delete ----------------------------------- */

export function useDeleteDomain() {
  const { user } = useAuth();
  const workspaceId = useWorkspace().current?.id ?? null;
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (domain: DomainRow) => {
      if (!workspaceId || !user) throw new Error("No workspace");
      return deleteDomain({ workspaceId, userId: user.id, domain });
    },
    onSuccess: invalidate,
  });
}
