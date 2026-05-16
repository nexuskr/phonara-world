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
  "src/packages/realtime/**",
];

// TODO PHASE 2 — 이 목록은 detox 진행하며 0으로 줄여야 함.
//   각 파일을 notify wrapper / realtime wrapper 사용으로 마이그레이션 후 항목 제거.
//   새로 추가되는 파일은 절대 이 목록에 들어가면 안 됨 (error 규칙이 막음).
const LEGACY_DIRECT_SONNER = [
  "src/components/NeonNotificationFeed.tsx",
  "src/lib/layout-shift-monitor.ts",
];

const LEGACY_RAW_CHANNEL = [
  "src/components/EmpireFoundingCounter.tsx",
  "src/components/FloatingChat.tsx",
  "src/components/FreezeBanner.tsx",
  "src/components/InsuranceFundDashboard.tsx",
  "src/components/JackpotBanner.tsx",
  "src/components/NeonNotificationFeed.tsx",
  "src/components/RequestTimeline.tsx",
  "src/components/admin/AMLAdmin.tsx",
  "src/components/admin/AnomalyAckQueue.tsx",
  "src/components/admin/AnomalyAutoFixPanel.tsx",
  "src/components/admin/DepositRequestsAdmin.tsx",
  "src/components/admin/FunnelAnalytics.tsx",
  "src/components/admin/GodModePanel.tsx",
  "src/components/admin/PackagePurchasesAdmin.tsx",
  "src/components/admin/PayConsole.tsx",
  "src/components/admin/PermissionsAudit.tsx",
  "src/components/admin/ReferralsAdmin.tsx",
  "src/components/admin/TrustV2Admin.tsx",
  "src/components/admin/ViralForensics.tsx",
  "src/components/admin/WithdrawRequestsAdmin.tsx",
  "src/components/admin/compliance/RiskCenter.tsx",
  "src/components/auth/AuthSocialProof.tsx",
  "src/components/conversion/LivePurchaseTicker.tsx",
  "src/components/dashboard/v3/ActivityEventTicker.tsx",
  "src/components/empire/EmpireLevelBadge.tsx",
  "src/components/empire/EmpireMomentToast.tsx",
  "src/components/empire/FoundingSeasonHall.tsx",
  "src/components/empire/LiveWithdrawalsTable.tsx",
  "src/components/empire/PhonaraPayPanel.tsx",
  "src/components/lounge/GuildLiveFeed.tsx",
  "src/components/trading/PendingOrderManager.tsx",
  "src/components/wallet/ServerTxList.tsx",
  "src/hooks/use-admin-notifications.ts",
  "src/hooks/use-admin-pending.ts",
  "src/hooks/use-admin-siren.ts",
  "src/hooks/use-auth-live-data.ts",
  "src/hooks/use-daily-cap.ts",
  "src/hooks/use-user-notifications.ts",
  "src/lib/layout-shift-monitor.ts",
  "src/pages/Cockpit.tsx",
  "src/pages/EmpireArena.tsx",
  "src/pages/GalaxyAuction.tsx",
  "src/pages/Lounge.tsx",
  "src/pages/Settlements.tsx",
  "src/pages/WarTradingArena.tsx",
  "src/pages/Whales.tsx",
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
        "Direct `supabase.channel(...)` is forbidden. Use `@pkg/realtime/*` wrappers (useWalletChannel / useGameChannel / useChatChannel / useMarketChannel) or `useRealtimeChannel`. (PHASE 1 lockdown)",
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
