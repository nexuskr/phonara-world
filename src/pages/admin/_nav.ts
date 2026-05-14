/**
 * Phonara Admin — Mission Control IA
 * Single source of truth for sidebar sections, routes, AAL2 protection,
 * pending-badge sources, and ⌘K command palette entries.
 */
import {
  Crown, Activity, TrendingUp, GitBranch,
  ArrowDownToLine, ArrowUpFromLine, Coins, ShieldCheck, ShieldAlert,
  HeartHandshake, ScrollText, Flame, Lock, Users, Wallet,
  Gauge, KeyRound, FlaskConical, Bot, HeartPulse, BarChart3,
  Target, MessageSquare, LifeBuoy, Zap, AlertTriangle, Send, Sliders,
  Gem, Megaphone, Bell, FileSearch, Sparkles, Rocket,
} from "lucide-react";

export type AdminBadgeSource =
  | "deposits_pending"
  | "withdrawals_pending"
  | "aml_pending"
  | "refund_pending"
  | "anomalies_unack";

export type AdminNavItem = {
  id: string;
  name: string;
  to: string;
  icon: any;
  /** Show realtime pending counter from this source */
  badge?: AdminBadgeSource;
  /** Hide from sidebar but keep route resolvable */
  hidden?: boolean;
};

export type AdminNavSection = {
  id: "command" | "treasury" | "compliance" | "operations" | "growth" | "game" | "product";
  label: string;
  emoji: string;
  /** AAL2 step-up required for every route under this section */
  aal2: boolean;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavSection[] = [
  {
    id: "command",
    label: "지휘본부",
    emoji: "🎯",
    aal2: false,
    items: [
      { id: "empire",   name: "🌍 Empire Overview", to: "/admin",            icon: Gem },
      { id: "cockpit",  name: "콕핏 (구버전)",      to: "/admin/cockpit",    icon: Crown },
      { id: "funnel",   name: "퍼널 분석",          to: "/admin/funnel",     icon: GitBranch },
      { id: "revenue",  name: "매출 · 코호트",      to: "/admin/revenue",    icon: TrendingUp },
    ],
  },
  {
    id: "treasury",
    label: "자금 관리",
    emoji: "💰",
    aal2: true,
    items: [
      { id: "deposits",    name: "충전 신청",          to: "/admin/treasury/deposits",    icon: ArrowUpFromLine, badge: "deposits_pending" },
      { id: "withdrawals", name: "출금 신청",          to: "/admin/treasury/withdrawals", icon: ArrowDownToLine, badge: "withdrawals_pending" },
      { id: "packages",    name: "패키지 구매",        to: "/admin/treasury/packages",    icon: Crown },
      { id: "coin",        name: "코인 주소 관리",     to: "/admin/treasury/coin",        icon: Coins },
      { id: "accounting",  name: "회계 (제로로스)",    to: "/admin/treasury/accounting",  icon: Wallet },
      { id: "insurance",   name: "보험 기금",          to: "/admin/treasury/insurance",   icon: ShieldCheck },
      { id: "pay",         name: "Phonara Pay (TRC20)", to: "/admin/treasury/pay",       icon: Send },
    ],
  },
  {
    id: "compliance",
    label: "컴플라이언스",
    emoji: "🛡️",
    aal2: true,
    items: [
      { id: "aml",     name: "AML 심사 큐",            to: "/admin/compliance/aml",     icon: ShieldAlert, badge: "aml_pending" },
      { id: "trust",   name: "신뢰 (환불 · 손실보호)", to: "/admin/compliance/trust",   icon: HeartHandshake, badge: "refund_pending" },
      { id: "risk",    name: "🚨 리스크 알림 센터",   to: "/admin/compliance/risk",    icon: AlertTriangle },
      { id: "payout",  name: "출금 감사 로그",         to: "/admin/compliance/payout",  icon: ScrollText },
      { id: "viral",   name: "바이럴 포렌식",          to: "/admin/compliance/viral",   icon: Flame },
      { id: "perms",   name: "권한 관리",              to: "/admin/compliance/perms",   icon: Lock },
      { id: "rules",   name: "자동 규칙",              to: "/admin/compliance/rules",   icon: Zap },
    ],
  },
  {
    id: "operations",
    label: "운영",
    emoji: "⚙️",
    aal2: true,
    items: [
      { id: "observability", name: "관측 (옵저버빌리티)", to: "/admin/ops/observability", icon: Activity },
      { id: "errors",        name: "에러 · 이상감지",     to: "/admin/ops/errors",        icon: AlertTriangle, badge: "anomalies_unack" },
      { id: "audit",         name: "📜 감사 로그",        to: "/admin/ops/audit",         icon: FileSearch },
      { id: "audit-log",     name: "🔍 감사 검색 + RLS",  to: "/admin/ops/audit-log",     icon: FileSearch },
      { id: "notify",        name: "🔔 공지 센터",        to: "/admin/ops/notify",        icon: Bell },
      { id: "recovery",      name: "🔐 관리자 복구",      to: "/admin/ops/recovery",      icon: KeyRound },
      { id: "security",      name: "보안 감사",           to: "/admin/ops/security",      icon: ShieldCheck },
      { id: "cron",          name: "Cron · 웹훅",         to: "/admin/ops/cron",          icon: Zap },
      { id: "report",        name: "AI 일일 리포트",      to: "/admin/ops/report",        icon: BarChart3 },
      { id: "thresholds",    name: "임계값 · SLA",        to: "/admin/ops/thresholds",    icon: Sliders },
    ],
  },
  {
    id: "growth",
    label: "성장 랩",
    emoji: "🚀",
    aal2: false,
    items: [
      { id: "marketing",  name: "📢 마케팅 도구",    to: "/admin/growth/marketing", icon: Megaphone },
      { id: "ab",         name: "A/B 실험",          to: "/admin/growth/ab",        icon: FlaskConical },
      { id: "conversion", name: "💱 SIM→Real 전환",  to: "/admin/growth/conversion", icon: Sparkles },
      { id: "bots",       name: "봇 콘솔",           to: "/admin/growth/bots",      icon: Bot },
      { id: "ev",         name: "EV 헬스",           to: "/admin/growth/ev",        icon: HeartPulse },
      { id: "ugc",        name: "UGC 성과",          to: "/admin/growth/ugc",       icon: BarChart3 },
      { id: "referrals",  name: "추천 윈도우",       to: "/admin/growth/referrals", icon: Users },
      { id: "whales",     name: "고래 스트라이크",   to: "/admin/growth/whales",    icon: Flame },
    ],
  },
  {
    id: "game",
    label: "게임 컨피그",
    emoji: "🎮",
    aal2: true,
    items: [
      { id: "bias",          name: "Demo Bias 슬라이더",  to: "/admin/game/bias",          icon: Sliders },
      { id: "nearmiss",      name: "Near-Miss 확률",      to: "/admin/game/nearmiss",      icon: Target },
      { id: "particles",     name: "Crown 파티클 강도",   to: "/admin/game/particles",     icon: Sparkles },
      { id: "crown-trigger", name: "👑 Manual Crown",     to: "/admin/game/crown-trigger", icon: Rocket },
    ],
  },
  {
    id: "product",
    label: "프로덕트",
    emoji: "👥",
    aal2: false,
    items: [
      { id: "users",    name: "회원 관리",         to: "/admin/product/users",    icon: Users },
      { id: "support",  name: "고객 지원",         to: "/admin/product/support",  icon: LifeBuoy },
      { id: "missions", name: "AI 미션",           to: "/admin/product/missions", icon: Target },
      { id: "founding", name: "창립 시즌",         to: "/admin/product/founding", icon: Crown },
      { id: "beta",     name: "베타 코드",         to: "/admin/product/beta",     icon: KeyRound },
    ],
  },
];

/** Flatten for ⌘K command palette + breadcrumb resolution */
export const ADMIN_NAV_FLAT: Array<AdminNavItem & { sectionId: AdminNavSection["id"]; sectionLabel: string; aal2: boolean }> =
  ADMIN_NAV.flatMap((s) =>
    s.items.map((i) => ({ ...i, sectionId: s.id, sectionLabel: s.label, aal2: s.aal2 }))
  );

/** Section IDs that require AAL2 step-up for every child route. */
export const AAL2_SECTIONS: ReadonlyArray<AdminNavSection["id"]> =
  ADMIN_NAV.filter((s) => s.aal2).map((s) => s.id);

/** Returns true when a given pathname must pass AAL2. */
export function isAal2Path(pathname: string): boolean {
  return AAL2_SECTIONS.some((id) => pathname.startsWith(`/admin/${id}/`));
}

/** Legacy → new URL map (deep-link redirects, PR-1) */
export const ADMIN_LEGACY_REDIRECTS: Record<string, string> = {
  "/admin/kpi":        "/admin/funnel",
  "/admin/revenue":    "/admin/revenue",
  "/admin/ops-report": "/admin/ops/report",
  "/admin/support":    "/admin/product/support",
};
