import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/hooks/useTheme";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";

/**
 * Provider order matters: theme and i18n are outermost (pure client state),
 * then the query cache, then auth, then workspace (which depends on auth).
 */
export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <AuthProvider>
            <WorkspaceProvider>
              <RouterProvider router={router} />
              <Toaster />
            </WorkspaceProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
