import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// ─────────────────────────────────────────────────────────────
// PHONARA Ω v3.1 — PHASE 1: OLD ARCHITECTURE 봉쇄
//   옛 구조가 다시 들어오는 것 자체를 물리적으로 차단.
//   - sonner 직접 호출 금지 → `@/lib/notify`
//   - supabase.channel(...) 직접 호출 금지 → `@pkg/realtime/*` or `@/hooks/use-realtime-channel`
//   - critical 경로(@pkg/wallet, @pkg/core, integrations)에서
//     framer-motion / @pkg/operator / @pkg/live / @pkg/avatar-nft import 금지
// ─────────────────────────────────────────────────────────────

const NOTIFY_WRAPPERS = [
  "src/lib/notify.ts",
  "src/components/ui/sonner.tsx",
];

const REALTIME_WRAPPERS = [
  "src/hooks/use-realtime-channel.ts",
  "src/lib/realtime-bus.ts",
  "src/packages/realtime/**",
];

// TODO PHASE 2 — 이 목록은 detox 진행하며 0으로 줄여야 함.
//   각 파일을 notify wrapper / realtime wrapper 사용으로 마이그레이션 후 항목 제거.
//   새로 추가되는 파일은 절대 이 목록에 들어가면 안 됨 (error 규칙이 막음).
const LEGACY_DIRECT_SONNER = [
  "src/components/NeonNotificationFeed.tsx",
  "src/lib/layout-shift-monitor.ts",
];

// PR-J: legacy raw-channel grandparent list — emptied. All non-freeze callers migrated
// to @pkg/realtime wrappers. Freeze money-flow paths retain direct useRealtimeChannel
// usage by design (see PR-J_FREEZE below).
const LEGACY_RAW_CHANNEL = [];

// Money-flow FREEZE paths — git diff = 0 required. They keep direct
// `useRealtimeChannel` to avoid touching these files.
const PRJ_FREEZE_RAW_CHANNEL = [
  "src/packages/wallet/hooks/useDeposit.ts",
  "src/packages/wallet/hooks/useDepositRealtime.ts",
  "src/packages/wallet/hooks/useDepositCountdown.ts",
  "src/lib/paper-trading/bybit-feed.ts",
  "src/components/crash/hooks/useCrashRound.ts",
  "src/components/trading/MegaOrderPanel.tsx",
  "src/hooks/use-kill-switches.ts",
  "src/hooks/use-auto-bet.ts",
];

// Critical money path — 절대 무거워지면 안 됨.
const CRITICAL_PATHS = [
  "src/packages/wallet/**",
  "src/packages/core/**",
  "src/packages/performance/**",
  "src/packages/telemetry/**",
  "src/packages/realtime/**",
  "src/integrations/**",
  "src/lib/notify.ts",
];

const restrictSonnerRule = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "sonner",
          message:
            "Direct sonner import is forbidden. Use `import { notify } from '@/lib/notify'` instead. (PHASE 1 lockdown)",
        },
        {
          name: "@/hooks/use-realtime-channel",
          message:
            "Direct `useRealtimeChannel` import is forbidden. Use `@pkg/realtime` wrappers (useWalletChannel / useGameChannel / useChatChannel / useMarketChannel). (PR-J)",
        },
      ],
    },
  ],
};

const restrictRawChannelRule = {
  "no-restricted-syntax": [
    "error",
    {
      selector:
        "CallExpression[callee.object.name='supabase'][callee.property.name='channel']",
      message:
        "Direct `supabase.channel(...)` is forbidden. Use `@pkg/realtime/*` wrappers (useWalletChannel / useGameChannel / useChatChannel / useMarketChannel). (PHASE 1 lockdown)",
    },
  ],
};

const restrictCriticalImportsRule = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "sonner",
          message: "Critical layer cannot import sonner. Use `@/lib/notify`.",
        },
        {
          name: "framer-motion",
          message:
            "Critical layer (wallet/core/integrations) cannot import framer-motion. Animations belong in Layer 2/3 only. (PHASE 1 lockdown)",
        },
      ],
      patterns: [
        {
          group: ["@pkg/operator/*", "@pkg/operator"],
          message:
            "Critical layer cannot import operator code. Operator must stay in its own bundle. (PHASE 1 lockdown)",
        },
        {
          group: ["@pkg/live/*", "@pkg/avatar-nft/*"],
          message:
            "Critical layer cannot import optional UX modules (live / avatar). Those are optional and must be SoftBoundary-wrapped at Layer 2+. (PHASE 1 lockdown)",
        },
      ],
    },
  ],
};

export default tseslint.config(
  { ignores: ["dist", "phonara-unicorn/**", "supabase/functions/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      ...restrictSonnerRule,
      ...restrictRawChannelRule,
    },
  },
  // Wrappers themselves are allowed to use the raw primitives.
  {
    files: [...NOTIFY_WRAPPERS, ...REALTIME_WRAPPERS],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
  // Legacy violators — tracked, will be migrated in PHASE 2.
  // Keep as warning so CI still flags them but main build is not blocked
  // by pre-existing tech debt while the lockdown rule is rolling out.
  {
    files: [...LEGACY_DIRECT_SONNER, ...LEGACY_RAW_CHANNEL],
    rules: {
      "no-restricted-imports": "warn",
      "no-restricted-syntax": "warn",
    },
  },
  // PR-J FREEZE: money-flow paths retain direct `useRealtimeChannel` by design
  // (git diff = 0 requirement). Other realtime imports stay forbidden.
  {
    files: PRJ_FREEZE_RAW_CHANNEL,
    rules: {
      "no-restricted-imports": "off",
    },
  },
  // Critical money path — strictest rules.
  {
    files: CRITICAL_PATHS,
    rules: {
      ...restrictCriticalImportsRule,
    },
  },
  // Wrappers re-exemption (must come AFTER critical block to override).
  {
    files: [...NOTIFY_WRAPPERS, ...REALTIME_WRAPPERS],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
);
