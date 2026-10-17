import { QueryClient } from "@tanstack/react-query";

/**
 * One cache for the whole app. Sensible defaults: data is fresh for a minute,
 * cached for five, and a single retry — anything more just hides real errors.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** Every query key lives here so invalidation never guesses. */
export const queryKeys = {
  session: ["session"] as const,
  profile: (userId: string) => ["profile", userId] as const,
  workspaces: ["workspaces"] as const,
  workspaceMembers: (workspaceId: string) => ["workspaces", workspaceId, "members"] as const,
  domains: (workspaceId: string, scope: string) => ["domains", workspaceId, scope] as const,
  domain: (id: string) => ["domain", id] as const,
  folders: (workspaceId: string) => ["folders", workspaceId] as const,
  activity: (workspaceId: string) => ["activity", workspaceId] as const,
  domainActivity: (domainId: string) => ["activity", "domain", domainId] as const,
  savedViews: (workspaceId: string) => ["saved-views", workspaceId] as const,
  customOptions: (workspaceId: string) => ["custom-options", workspaceId] as const,
  settings: (userId: string) => ["settings", userId] as const,
};
