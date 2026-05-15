/**
 * Admin Mission Control — child route tree.
 * Mounted at /admin/* via App.tsx. AdminLayout supplies sidebar + header + AAL2 gating.
 */
import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./_AdminLayout";
import { ADMIN_LEGACY_REDIRECTS } from "./_nav";
import { LoadingList } from "@/components/ui/loading-state";

// COMMAND
const EmpireOverview = lazy(() => import("@/components/admin/empire/EmpireOverview"));
const CockpitV2 = lazy(() => import("./CockpitV2"));
const Revenue   = lazy(() => import("./Revenue"));
const Funnel    = lazy(() => import("./Kpi"));

// Legacy big-tab admin (kept as escape hatch at /admin/legacy)
const LegacyAdmin = lazy(() => import("../Admin"));

// Treasury
const DepositRequestsAdmin   = lazy(() => import("@/components/admin/DepositRequestsAdmin"));
const WithdrawRequestsAdmin  = lazy(() => import("@/components/admin/WithdrawRequestsAdmin"));
const AdminTreasuryWithdrawals = lazy(() => import("./treasury/Withdrawals"));
const PackagePurchasesAdmin  = lazy(() => import("@/components/admin/PackagePurchasesAdmin"));
const CoinAddressAdmin       = lazy(() => import("@/components/admin/CoinAddressAdmin"));
const OperatorAccounting     = lazy(() => import("@/components/admin/OperatorAccounting"));
const InsuranceFundDashboard = lazy(() => import("@/components/InsuranceFundDashboard"));

// Compliance
const AMLAdmin               = lazy(() => import("@/components/admin/AMLAdmin"));
const TrustV2Admin           = lazy(() => import("@/components/admin/TrustV2Admin"));
const LeaderboardPayoutAudit = lazy(() => import("@/components/admin/LeaderboardPayoutAudit"));
const ViralForensics         = lazy(() => import("@/components/admin/ViralForensics"));
const PermissionsAudit       = lazy(() => import("@/components/admin/PermissionsAudit"));

// Operations
const ObservabilityCockpit = lazy(() => import("@/components/admin/ObservabilityCockpit"));
const ErrorMonitorAdmin    = lazy(() => import("@/components/admin/ErrorMonitorAdmin"));
const AnomalyAckQueue      = lazy(() => import("@/components/admin/AnomalyAckQueue"));
const AnomalyAutoFixPanel  = lazy(() => import("@/components/admin/AnomalyAutoFixPanel"));
const AnomalyNotifSettings = lazy(() => import("@/components/admin/AnomalyNotificationSettings"));
const SecurityAuditAdmin   = lazy(() => import("@/components/admin/compliance/audit/SecurityAuditAdmin"));
const CronJobsCard         = lazy(() => import("@/components/admin/CronJobsCard"));
const OpsReport            = lazy(() => import("./OpsReport"));
const PayConsole           = lazy(() => import("@/components/admin/PayConsole"));
const AutoRulesAdmin       = lazy(() => import("@/components/admin/AutoRulesAdmin"));
const ThresholdsAdmin      = lazy(() => import("@/components/admin/ThresholdsAdmin"));

// Growth
const AbExperimentsAdmin   = lazy(() => import("@/components/admin/AbExperimentsAdmin"));
const BotStrengthAdmin     = lazy(() => import("@/components/admin/BotStrengthAdmin"));
const BotMixMonitor        = lazy(() => import("@/components/admin/BotMixMonitor"));
const EvHealthAdmin        = lazy(() => import("@/components/admin/EvHealthAdmin"));
const AdminUgc             = lazy(() => import("@/components/admin/AdminUgc"));
const ReferralsAdmin       = lazy(() => import("@/components/admin/ReferralsAdmin"));
const WhaleStrikeFunnelPanel = lazy(() => import("@/components/admin/WhaleStrikeFunnelPanel"));

// Product
const ServerUserAdmin       = lazy(() => import("@/components/admin/ServerUserAdmin"));
const Support               = lazy(() => import("./Support"));
const MissionTemplatesAdmin = lazy(() => import("@/components/admin/MissionTemplatesAdmin"));
const FoundingSeasonsAdmin  = lazy(() => import("@/components/admin/FoundingSeasonsAdmin"));
const BetaInvitesAdmin      = lazy(() => import("@/components/admin/BetaInvitesAdmin"));
const EconomyDashboard      = lazy(() => import("@/components/admin/EconomyDashboard"));

// Day 2 — Empire upgrades
const UserDetail360         = lazy(() => import("@/components/admin/users/UserDetail360"));
const ManualCrownTrigger    = lazy(() => import("@/components/admin/game/ManualCrownTrigger"));
const WithdrawalQueueBulk   = lazy(() => import("@/components/admin/treasury/WithdrawalQueueBulk"));
const RiskCenter            = lazy(() => import("@/components/admin/compliance/RiskCenter"));
const GameConfigPanel       = lazy(() => import("@/components/admin/game/GameConfigPanel"));
const SlotSfxAdmin          = lazy(() => import("@/components/admin/SlotSfxAdmin"));

// Day 3 — Audit, Notify, Marketing, SIM→Real
const AuditLogTable       = lazy(() => import("@/components/admin/ops/AuditLogTable"));
const NotificationCenter  = lazy(() => import("@/components/admin/ops/NotificationCenter"));
const AdminRecovery       = lazy(() => import("./AdminRecovery"));
const AdminAudit          = lazy(() => import("./AdminAudit"));
const MarketingTools      = lazy(() => import("@/components/admin/growth/MarketingTools"));
const SimRealConversion   = lazy(() => import("@/components/admin/growth/SimRealConversion"));
const SelfHeal            = lazy(() => import("./ops/SelfHeal"));

function Section({
  title,
  desc,
  children,
}: {
  title?: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {title && (
        <header>
          <h1 className="font-display font-black text-xl sm:text-2xl">{title}</h1>
          {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
        </header>
      )}
      <Suspense fallback={<LoadingList rows={4} />}>{children}</Suspense>
    </div>
  );
}

function ComingSoon({ area }: { area: string }) {
  return (
    <div className="glass-strong rounded-2xl p-6 border border-dashed border-border/40 text-sm text-muted-foreground">
      <div className="font-display font-bold text-foreground mb-1">🚧 {area}</div>
      Day 2/3 일정에 따라 출시됩니다. 백엔드 RPC와 권한 게이트는 이미 준비되어 있습니다.
    </div>
  );
}

function PayPlaceholder() {
  return (
    <Section title="Phonara Pay (TRC20)" desc="USDT 결제 콘솔 — 곧 출시">
      <div className="glass-strong rounded-2xl p-6 border border-border/40 text-sm text-muted-foreground">
        TRC20 USDT 결제 흐름 모니터링 화면이 여기에 통합됩니다.
      </div>
    </Section>
  );
}

function BotsCombined() {
  return (
    <Section title="Bot Console" desc="시딩 강도 · 봇 비율 · 라우팅 모니터">
      <BotStrengthAdmin />
      <BotMixMonitor />
    </Section>
  );
}

function CronCombined() {
  return (
    <Section title="Cron / Webhooks" desc="스케줄 작업 · 외부 웹훅 디스패처 상태">
      <CronJobsCard />
    </Section>
  );
}

export default function AdminRoutes() {
  return (
    <Routes>
      {/* Legacy URL redirects (preserve deep links) */}
      {Object.entries(ADMIN_LEGACY_REDIRECTS).map(([from, to]) => {
        // Strip the leading "/admin" since this Routes lives under /admin/*
        const fromRel = from.replace(/^\/admin/, "") || "/";
        const toRel = to.replace(/^\/admin/, "") || "/";
        if (fromRel === toRel) return null;
        return (
          <Route
            key={from}
            path={fromRel === "/" ? undefined : fromRel.replace(/^\//, "")}
            element={<Navigate to={`/admin${toRel === "/" ? "" : toRel}`} replace />}
          />
        );
      })}

      <Route element={<AdminLayout />}>
        {/* COMMAND */}
        <Route index element={<Suspense fallback={<LoadingList rows={4} />}><EmpireOverview /></Suspense>} />
        <Route path="cockpit" element={<Suspense fallback={<LoadingList rows={4} />}><CockpitV2 /></Suspense>} />
        <Route path="funnel"  element={<Suspense fallback={<LoadingList rows={4} />}><Funnel /></Suspense>} />
        <Route path="revenue" element={<Suspense fallback={<LoadingList rows={4} />}><Revenue /></Suspense>} />

        {/* TREASURY */}
        <Route path="treasury/deposits"    element={<Section title="Deposits"><DepositRequestsAdmin /></Section>} />
        <Route path="treasury/withdrawals" element={<Section title="Withdrawals"><AdminTreasuryWithdrawals /></Section>} />
        <Route path="treasury/packages"    element={<Section title="Packages"><PackagePurchasesAdmin /></Section>} />
        <Route path="treasury/coin"        element={<Section title="Coin Addresses"><CoinAddressAdmin /></Section>} />
        <Route path="treasury/accounting"  element={<Section title="Accounting (Zero-Loss)"><OperatorAccounting /></Section>} />
        <Route path="treasury/insurance"   element={<Section title="Insurance Fund"><InsuranceFundDashboard /></Section>} />
        <Route path="treasury/pay"         element={<Section><PayConsole /></Section>} />

        {/* COMPLIANCE */}
        <Route path="compliance/aml"    element={<Section title="AML Queue"><AMLAdmin /></Section>} />
        <Route path="compliance/trust"  element={<Section title="Trust v2 — 환불 / 손실보호"><TrustV2Admin /></Section>} />
        <Route path="compliance/payout" element={<Section title="Payout Audit"><LeaderboardPayoutAudit /></Section>} />
        <Route path="compliance/viral"  element={<Section title="Viral Forensics"><ViralForensics /></Section>} />
        <Route path="compliance/perms"  element={<Section title="Permissions"><PermissionsAudit /></Section>} />
        <Route path="compliance/rules"  element={<Section><AutoRulesAdmin /></Section>} />
        <Route path="compliance/risk"   element={<Section><RiskCenter /></Section>} />
        <Route path="compliance/audit"  element={<Section title="Security Audit"><SecurityAuditAdmin /></Section>} />

        {/* OPERATIONS */}
        <Route path="ops/self-heal"     element={<Suspense fallback={<LoadingList rows={4} />}><SelfHeal /></Suspense>} />
        <Route path="ops/observability" element={<Section title="Observability"><ObservabilityCockpit /></Section>} />
        <Route path="ops/errors"        element={<Section title="Errors / Anomalies"><AnomalyNotifSettings /><div className="h-2" /><AnomalyAutoFixPanel /><div className="h-2" /><AnomalyAckQueue /><div className="h-2" /><ErrorMonitorAdmin /></Section>} />
        <Route path="ops/audit"         element={<Section><AuditLogTable /></Section>} />
        <Route path="ops/audit-log"     element={<Suspense fallback={<LoadingList rows={4} />}><AdminAudit /></Suspense>} />
        <Route path="ops/notify"        element={<Section><NotificationCenter /></Section>} />
        <Route path="ops/recovery"      element={<Section><AdminRecovery /></Section>} />
        
        <Route path="ops/cron"          element={<CronCombined />} />
        <Route path="ops/report"        element={<Suspense fallback={<LoadingList rows={4} />}><OpsReport /></Suspense>} />
        <Route path="ops/thresholds"    element={<Section title="Mission Control 임계값"><ThresholdsAdmin /></Section>} />

        {/* GROWTH */}
        <Route path="growth/marketing"  element={<Section><MarketingTools /></Section>} />
        <Route path="growth/ab"         element={<Section title="A/B Experiments"><AbExperimentsAdmin /></Section>} />
        <Route path="growth/conversion" element={<Section><SimRealConversion /></Section>} />
        <Route path="growth/bots"       element={<BotsCombined />} />
        <Route path="growth/ev"         element={<Section title="EV Health"><EvHealthAdmin /></Section>} />
        <Route path="growth/ugc"        element={<Section title="UGC Performance"><AdminUgc /></Section>} />
        <Route path="growth/referrals"  element={<Section title="Referral Window"><ReferralsAdmin /></Section>} />
        <Route path="growth/whales"     element={<Section title="Whale Strike Funnel"><WhaleStrikeFunnelPanel /></Section>} />

        {/* TREASURY (Day 2 bulk) */}
        <Route path="treasury/withdrawals/bulk" element={<Section><WithdrawalQueueBulk /></Section>} />

        {/* GAME CONFIG (AAL2) */}
        <Route path="game/bias"          element={<Section><GameConfigPanel mode="bias" /></Section>} />
        <Route path="game/nearmiss"      element={<Section><GameConfigPanel mode="nearmiss" /></Section>} />
        <Route path="game/particles"     element={<Section><GameConfigPanel mode="particles" /></Section>} />
        <Route path="game/crown-trigger" element={<Section><ManualCrownTrigger /></Section>} />
        <Route path="game/slot-sfx"      element={<Section title="Slot Sound SFX"><SlotSfxAdmin /></Section>} />

        {/* PRODUCT */}
        <Route path="product/users"      element={<Section title="Users"><ServerUserAdmin /></Section>} />
        <Route path="product/users/:uid" element={<Section><UserDetail360 /></Section>} />
        <Route path="product/support"    element={<Suspense fallback={<LoadingList rows={4} />}><Support /></Suspense>} />
        <Route path="product/missions"   element={<Section title="AI Missions"><MissionTemplatesAdmin /></Section>} />
        <Route path="product/founding"   element={<Section title="Founding Seasons"><FoundingSeasonsAdmin /></Section>} />
        <Route path="product/beta"       element={<Section title="Beta Codes"><BetaInvitesAdmin /></Section>} />
        <Route path="economy"            element={<Section title="PHON·NFT 경제"><EconomyDashboard /></Section>} />

        {/* Escape hatch — legacy single-page admin */}
        <Route path="legacy" element={<Suspense fallback={<LoadingList rows={4} />}><LegacyAdmin /></Suspense>} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
