import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";

// Plugin: reescreve `dist/sw.js` pós-build, injetando o commit SHA no
// CACHE_NAME. Garante que cada deploy invalida o cache anterior
// automaticamente (browser detecta byte-diff no sw.js → reinstala SW →
// activate limpa caches antigos). Fallback pra timestamp se git falhar.
function swVersioningPlugin() {
  return {
    name: "sw-versioning",
    apply: "build" as const,
    closeBundle() {
      let buildId: string;
      try {
        buildId = execSync("git rev-parse --short HEAD").toString().trim();
      } catch {
        buildId = `t${Date.now()}`;
      }
      const swPath = path.resolve(__dirname, "dist/sw.js");
      if (!fs.existsSync(swPath)) {
        console.warn("[sw-versioning] dist/sw.js not found — skip");
        return;
      }
      const content = fs.readFileSync(swPath, "utf-8");
      const updated = content.replace(
        /const CACHE_NAME = 'rdwth-shell-[^']+';/,
        `const CACHE_NAME = 'rdwth-shell-${buildId}';`
      );
      if (updated === content) {
        console.warn("[sw-versioning] CACHE_NAME pattern not found — skip");
        return;
      }
      fs.writeFileSync(swPath, updated);
      console.log(`[sw-versioning] CACHE_NAME → rdwth-shell-${buildId}`);
    },
  };
}

// F6 — Bundle optimization. Separa vendors em chunks dedicados pra reduzir
// tamanho do bundle inicial e permitir cache mais granular entre deploys
// (atualizar app code não invalida vendor-react etc).
function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return;
  if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
    return "vendor-react";
  }
  if (id.includes("@radix-ui")) return "vendor-radix";
  if (id.includes("@supabase")) return "vendor-supabase";
  if (id.includes("@tanstack")) return "vendor-query";
  if (id.includes("posthog-js")) return "vendor-analytics";
  if (id.includes("lucide-react")) return "vendor-icons";
  if (id.includes("recharts") || id.includes("d3")) return "vendor-charts";
  return "vendor";
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    swVersioningPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
