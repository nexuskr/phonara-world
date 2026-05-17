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
      "@pkg": path.resolve(__dirname, "./src/packages"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // PR-B: modulepreload 화이트리스트.
    // - locale-ja/vi : i18n.ts 가 active language 만 dynamic import → 비활성 청크는 preload 불필요.
    // - motion : MotionConfig 제거 후 entry 정적 그래프에서 분리되었더라도 preload 만 차단.
    // - icons (lucide) : 첫 페인트 시 일부 아이콘만 필요. 실제 임포트 시 fetch 됨 (waterfall ~80ms 허용).
    // - supabase : auth-bridge 가 useEffect 안에서 호출. 첫 페인트엔 불필요.
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) =>
        deps.filter((d) =>
          !/\/locale-(ja|vi)-[^/]+\.js$/.test(d) &&
          !/\/motion-[^/]+\.js$/.test(d) &&
          !/\/icons-[^/]+\.js$/.test(d) &&
          !/\/supabase-[^/]+\.js$/.test(d) &&
          // Phase D — three3d 청크(아바타/로비)는 Layer 1 preload 금지.
          !/\/three3d-[^/]+\.js$/.test(d) &&
          // PR-K: operator chunk(s) must NEVER preload on Layer 1.
          // Loaded only when user hits /admin/* via React.lazy.
          !/\/operator(-[^/]+)?\.js$/.test(d),
        ),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // P5 — split per-language locale modules so only the active language
          // ships at boot. (`src/lib/i18n.ts` dynamic-imports these.)
          if (id.includes("/src/locales/ko")) return "locale-ko";
          if (id.includes("/src/locales/en")) return "locale-en";
          if (id.includes("/src/locales/ja")) return "locale-ja";
          if (id.includes("/src/locales/vi")) return "locale-vi";

          // PR-A: signature-engine 수동 그룹 제거.
          // 이전 manualChunks 그룹은 `cn` 같은 공용 유틸을 흡수해서
          // 모든 페이지에서 import → 자동 modulepreload 되며 Layer 1을 73KB 부풀렸음.
          // 슬롯 페이지가 router-lazy 이므로 자연 코드 스플리팅에 맡긴다.

          // 사운드 매니저(소스) — 슬롯 공통이지만 슬롯 페이지가 router-lazy 이므로
          // async chunk 로 자연 분리됨. 명시적 그룹화는 위와 같은 흡수 이슈를 유발하므로 제거.

          // PR-K — Operator Isolation.
          // 모든 admin/operator 코드를 단일 "operator" 청크로 강제 격리한다.
          // Layer 1(일반 유저) 번들에서 0바이트가 되어야 한다.
          // 검증: `node scripts/check-operator-isolation.mjs`.
          if (
            id.includes("/src/pages/admin/") ||
            id.includes("/src/components/admin/") ||
            id.includes("/src/packages/operator/") ||
            id.endsWith("/src/pages/Admin.tsx") ||
            id.endsWith("/src/pages/Cockpit.tsx") ||
            id.endsWith("/src/pages/CockpitV2.tsx")
          ) {
            return "operator";
          }

          if (!id.includes("node_modules")) return;

          // PR-C: 라이브러리 수동 그룹화 최소화.
          // 부트 핵심(supabase auth / i18n / icons / motion) 만 별도 청크로 유지.
          // 그 외(howler/recharts/d3/lightweight-charts/date-fns)는 자연 코드 스플리팅에 맡겨
          // 자동 modulepreload 흡수 이슈를 차단한다.
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("i18next")) return "i18n";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "motion";
          // Phase D — Avatar v3 + Lobby v3: three.js + r3f + drei 분리.
          // 사용 페이지(/avatar/studio, /lobby)가 router-lazy 이므로 자연 코드 스플리팅에 맡기되,
          // 명시적 그룹으로 묶어 두 페이지가 같은 청크를 공유하도록 강제 (중복 방지).
          if (
            id.includes("/node_modules/three/") ||
            id.includes("/node_modules/@react-three/")
          ) return "three3d";
          // PR-B: pickers 수동 그룹 제거.
          // cmdk/vaul/embla/day-picker는 admin/special 페이지만 사용하며
          // 해당 페이지는 router-lazy. 수동 그룹화 시 공용 청크로 승격되어
          // 자동 modulepreload 됨 (signature-engine 과 동일 패턴).
          // 나머지(react, react-dom, react-router, radix, tanstack 등)는
          // 단일 vendor chunk로 묶어 createContext 순서 문제를 회피.
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
}));
