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
  id: "command" | "treasury" | "compliance" | "operations" | "growth" | "product";
  label: string;
  emoji: string;
  /** AAL2 step-up required for every route under this section */
  aal2: boolean;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavSection[] = [
  {
    id: "command",
    label: "COMMAND",
    emoji: "🎯",
    aal2: false,
    items: [
      { id: "cockpit",  name: "Cockpit",          to: "/admin",          icon: Crown },
      { id: "funnel",   name: "Funnel",           to: "/admin/funnel",   icon: GitBranch },
      { id: "revenue",  name: "Revenue & Cohorts",to: "/admin/revenue",  icon: TrendingUp },
    ],
  },
  {
    id: "treasury",
    label: "TREASURY",
    emoji: "💰",
    aal2: true,
    items: [
      { id: "deposits",    name: "Deposits",     to: "/admin/treasury/deposits",    icon: ArrowUpFromLine, badge: "deposits_pending" },
      { id: "withdrawals", name: "Withdrawals",  to: "/admin/treasury/withdrawals", icon: ArrowDownToLine, badge: "withdrawals_pending" },
      { id: "packages",    name: "Packages",     to: "/admin/treasury/packages",    icon: Crown },
      { id: "coin",        name: "Coin Addresses", to: "/admin/treasury/coin",      icon: Coins },
      { id: "accounting",  name: "Accounting (Zero-Loss)", to: "/admin/treasury/accounting", icon: Wallet },
      { id: "insurance",   name: "Insurance Fund", to: "/admin/treasury/insurance", icon: ShieldCheck },
      { id: "pay",         name: "Phonara Pay (TRC20)", to: "/admin/treasury/pay", icon: Send },
    ],
  },
  {
    id: "compliance",
    label: "COMPLIANCE",
    emoji: "🛡️",
    aal2: true,
    items: [
      { id: "aml",     name: "AML Queue",        to: "/admin/compliance/aml",     icon: ShieldAlert, badge: "aml_pending" },
      { id: "trust",   name: "Trust v2 (Refund/LP)", to: "/admin/compliance/trust", icon: HeartHandshake, badge: "refund_pending" },
      { id: "payout",  name: "Payout Audit",     to: "/admin/compliance/payout",  icon: ScrollText },
      { id: "viral",   name: "Viral Forensics",  to: "/admin/compliance/viral",   icon: Flame },
      { id: "perms",   name: "Permissions",      to: "/admin/compliance/perms",   icon: Lock },
      { id: "rules",   name: "Auto-Rules",       to: "/admin/compliance/rules",   icon: Zap },
    ],
  },
  {
    id: "operations",
    label: "OPERATIONS",
    emoji: "⚙️",
    aal2: true,
    items: [
      { id: "observability", name: "Observability", to: "/admin/ops/observability", icon: Activity },
      { id: "errors",        name: "Errors",        to: "/admin/ops/errors",        icon: AlertTriangle, badge: "anomalies_unack" },
      { id: "security",      name: "Security Audit",to: "/admin/ops/security",      icon: ShieldCheck },
      { id: "cron",          name: "Cron / Webhooks", to: "/admin/ops/cron",        icon: Zap },
      { id: "report",        name: "Daily AI Report", to: "/admin/ops/report",      icon: BarChart3 },
      { id: "thresholds",    name: "임계값 / SLA",     to: "/admin/ops/thresholds",  icon: Sliders },
    ],
  },
  {
    id: "growth",
    label: "GROWTH LAB",
    emoji: "🚀",
    aal2: false,
    items: [
      { id: "ab",         name: "A/B Experiments", to: "/admin/growth/ab",        icon: FlaskConical },
      { id: "bots",       name: "Bot Console",     to: "/admin/growth/bots",      icon: Bot },
      { id: "ev",         name: "EV Health",       to: "/admin/growth/ev",        icon: HeartPulse },
      { id: "ugc",        name: "UGC Performance", to: "/admin/growth/ugc",       icon: BarChart3 },
      { id: "referrals",  name: "Referral Window", to: "/admin/growth/referrals", icon: Users },
      { id: "whales",     name: "Whale Strike",    to: "/admin/growth/whales",    icon: Flame },
    ],
  },
  {
    id: "product",
    label: "PRODUCT",
    emoji: "👥",
    aal2: false,
    items: [
      { id: "users",    name: "Users",            to: "/admin/product/users",    icon: Users },
      { id: "support",  name: "Support",          to: "/admin/product/support",  icon: LifeBuoy },
      { id: "missions", name: "AI Missions",      to: "/admin/product/missions", icon: Target },
      { id: "founding", name: "Founding Seasons", to: "/admin/product/founding", icon: Crown },
      { id: "beta",     name: "Beta Codes",       to: "/admin/product/beta",     icon: KeyRound },
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
  "/admin/cockpit":    "/admin",
  "/admin/kpi":        "/admin/funnel",
  "/admin/revenue":    "/admin/revenue",
  "/admin/ops-report": "/admin/ops/report",
  "/admin/support":    "/admin/product/support",
};
