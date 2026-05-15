import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from "vite-plugin-compression";
import removeConsole from "vite-plugin-remove-console";

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
    // M-5: strip console.* in production builds (keep error/warn for prod incident triage)
    mode !== "development" && removeConsole({ includes: ["log", "info", "debug", "trace"] }),
    mode !== "development" && compression({ algorithm: "brotliCompress", ext: ".br", threshold: 1024 }),
    mode !== "development" && compression({ algorithm: "gzip", ext: ".gz", threshold: 1024 }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // P5 — split per-language locale modules so only the active language
          // ships at boot. (`src/lib/i18n.ts` dynamic-imports these.)
          if (id.includes("/src/locales/ko")) return "locale-ko";
          if (id.includes("/src/locales/en")) return "locale-en";
          if (id.includes("/src/locales/ja")) return "locale-ja";
          if (id.includes("/src/locales/vi")) return "locale-vi";
          if (!id.includes("node_modules")) return;
          // Three.js / R3F 제거 — chunk hint 더 이상 필요 없음.
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("lightweight-charts")) return "lwcharts";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("date-fns")) return "date";
          if (id.includes("i18next")) return "i18n";
          // H-4: framer-motion own chunk so route bundles don't redownload it
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "motion";
          // M-9: pickers/overlays chunk — heavy but only used by a few routes
          if (
            id.includes("/cmdk/") ||
            id.includes("/vaul/") ||
            id.includes("embla-carousel") ||
            id.includes("react-day-picker")
          ) return "pickers";
          // 나머지(react, react-dom, react-router, radix, tanstack 등)는
          // 단일 vendor chunk로 묶어 createContext 순서 문제를 회피.
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
}));
