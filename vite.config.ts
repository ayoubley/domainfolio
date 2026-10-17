import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const inPackage = (name: string) =>
            id.includes(`node_modules/${name}/`) || id.includes(`node_modules\\${name}\\`);
          // Charts are the heaviest dependency and only the dashboard needs them.
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("@supabase")) return "supabase";
          if (
            ["react", "react-dom", "scheduler", "react-router", "react-router-dom", "use-sync-external-store"].some(
              inPackage
            )
          ) {
            return "react";
          }
          // Radix and the primitives built on it travel together: a shared chunk
          // keeps them from referencing each other across a circular boundary.
          if (
            [
              "@radix-ui",
              "@floating-ui",
              "cmdk",
              "vaul",
              "sonner",
              "react-remove-scroll",
              "react-remove-scroll-bar",
              "react-style-singleton",
              "use-callback-ref",
              "use-sidecar",
              "aria-hidden",
            ].some(name => id.includes(`node_modules/${name}`))
          ) {
            return "ui";
          }
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) {
            return "motion";
          }
          if (id.includes("i18next")) return "i18n";
          if (id.includes("@tanstack")) return "tanstack";
          // xlsx is only ever reached through a dynamic import (import/export),
          // so it stays a separate, lazily-fetched chunk.
          if (inPackage("xlsx")) return "xlsx";
          return "vendor";
        },
      },
    },
    // Composition is deliberate: framework, UI primitives, charts and i18n each
    // cache independently, and the router splits per page. This ceiling only
    // guards against a dependency accidentally bloating the shared chunks.
    chunkSizeWarningLimit: 650,
  },
});
