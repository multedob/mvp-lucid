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

// F6 — Bundle optimization. manualChunks REMOVIDO (causava race condition
// em prod: vendors separados tentavam usar React.createContext antes do
// chunk react carregar — "Cannot read properties of undefined" em runtime).
// React.lazy() nas rotas continua ativo — Vite gera chunks por rota
// automaticamente. Vendor split fica como dívida pra reavaliar com cuidado.

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
    chunkSizeWarningLimit: 600,
  },
}));
