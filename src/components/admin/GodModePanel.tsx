/**
 * God Mode Panel — Day 1
 * - Desktop(lg+): right-side fixed panel (~320px), glass-strong + neon-border
 * - Mobile/tablet: floating button → Drawer (vaul) with same content
 *
 * 5 sections (read-only or navigates to existing AAL2-protected routes):
 *  1) Live KPI (useAdminPending + admin presence count)
 *  2) Manual Crown Trigger → /admin/game/crown-trigger
 *  3) RRM Toggle (toggle-rrm edge function, AAL2 stepup)
 *  4) Anomaly Live Feed (useRealtimeChannel on anomaly_events)
 *  5) Flash Event Launcher → /admin/growth/marketing
 *
 * STRICT:
 *  - Only design tokens (glass-strong, neon-border, glow-primary, text-money, text-gold)
 *  - notify (no sonner direct), useChatChannel(no supabase.channel direct)
 *  - No new RPCs, no schema changes
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowUpFromLine,
  Crown, Flame, KeyRound, Loader2, Rocket, ShieldAlert, ShieldCheck,
  Users, Zap, X,
} from "lucide-react";
import { useAdminPending } from "@/hooks/use-admin-pending";
import { useChatChannel } from "@pkg/realtime";
import { useMfaLevel } from "@/hooks/use-mfa-level";
import { useStepUp } from "@/hooks/use-step-up";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

const StepUpGate = lazy(() => import("@/components/security/StepUpGate"));

type Anomaly = {
  id: string;
  rule: string;
  severity: string;
  created_at: string;
  user_id: string | null;
};

/* ------------------------------ Sections ------------------------------ */

function SectionTitle({ icon: Icon, label, hint }: { icon: any; label: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-gold">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      {hint && <span className="text-[9px] text-muted-foreground tabular-nums">{hint}</span>}
    </div>
  );
}

function KpiTile({
  icon: Icon, label, value, tone = "default",
}: { icon: any; label: string; value: number | string; tone?: "default" | "danger" | "gold" }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div
        className={cn(
          "text-base font-black tabular-nums leading-tight",
          tone === "danger" && "text-destructive",
          tone === "gold" && "text-gold",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function LiveKpi() {
  const pending = useAdminPending(true);
  const { isAal2, hasFactor } = useMfaLevel();
  const [admins, setAdmins] = useState(0);

  // Presence — Supabase Realtime presence API는 postgres_changes와 별개이며
  // useRealtimeChannel 단일 진입점이 presence를 wrapping 하지 않으므로
  // 이 한 곳만 직접 supabase.channel() 사용을 허용한다 (whitelisted exception).
  // 이전 버전에는 같은 위치에 빈 bindings의 useRealtimeChannel이 함께 있었으나
  // 채널 1개만 낭비될 뿐 어떤 이벤트도 받지 못해 제거.
  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line no-restricted-syntax -- presence channel whitelisted (PR-J)
    const ch = supabase.channel("admin-presence-godmode", {
      config: { presence: { key: crypto.randomUUID() } },
    });
    ch.on("presence", { event: "sync" }, () => {
      if (!mounted) return;
      const state = ch.presenceState();
      setAdmins(Object.keys(state).length);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ at: Date.now() });
      }
    });
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div>
      <SectionTitle icon={Activity} label="Live KPI" hint={isAal2 ? "AAL2" : hasFactor ? "AAL1" : "NO TOTP"} />
      <div className="grid grid-cols-2 gap-1.5">
        <KpiTile icon={ArrowUpFromLine} label="입금 대기" value={pending.deposits_pending ?? 0} tone="gold" />
        <KpiTile icon={ArrowDownToLine} label="출금 대기" value={pending.withdrawals_pending ?? 0} tone="gold" />
        <KpiTile icon={ShieldAlert} label="이상감지" value={pending.anomalies_unack ?? 0} tone="danger" />
        <KpiTile icon={Users} label="온라인 관리자" value={admins || 1} />
      </div>
    </div>
  );
}

function ManualCrownLink() {
  return (
    <div>
      <SectionTitle icon={Crown} label="Manual Crown" />
      <Link
        to="/admin/game/crown-trigger"
        className="block rounded-xl border border-gold/40 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent
                   px-3 py-2.5 transition hover:border-gold hover:glow-gold focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-gold"
      >
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-gold" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-foreground">황제에게 Crown Explosion</div>
            <div className="text-[10px] text-muted-foreground">유저 검색 → 즉시 보상</div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function RrmToggle() {
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const { isAal2 } = useMfaLevel();
  const { requireStepUp, dialogProps } = useStepUp();

  // Read current value (best-effort).
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "rrm_enabled")
        .maybeSingle();
      if (!alive) return;
      const v = (data as any)?.value;
      setEnabled(v === true || v === "true" || v === "1");
    })();
    return () => { alive = false; };
  }, []);

  async function toggle() {
    if (busy) return;
    if (!isAal2) {
      const ok = await requireStepUp("RRM 토글");
      if (!ok) return;
    }
    const next = !enabled;
    let reason: string | null = null;
    if (!next) {
      reason = window.prompt("RRM 비활성화 사유 (8자 이상)");
      if (!reason || reason.trim().length < 8) {
        notify.error("사유 8자 이상 필요");
        return;
      }
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("toggle-rrm", {
        body: { enabled: next, reason: reason ?? "" },
      });
      if (error) throw error;
      setEnabled(next);
      notify.success(next ? "RRM 활성화" : "RRM 비활성화", { description: (data as any)?.message });
    } catch (e: any) {
      notify.error("RRM 토글 실패", { description: e?.message ?? "unknown" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Suspense fallback={null}><StepUpGate {...dialogProps} /></Suspense>
      <div>
        <SectionTitle
          icon={ShieldCheck}
          label="RRM (Risk Reduce Mode)"
          hint={enabled === null ? "..." : enabled ? "ON" : "OFF"}
        />
        <button
          type="button"
          onClick={toggle}
          disabled={busy || enabled === null}
          className={cn(
            "w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition",
            "flex items-center justify-between",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            enabled
              ? "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/15"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
          )}
        >
          <span className="flex items-center gap-2">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            {enabled ? "RRM 비활성화" : "RRM 활성화"}
          </span>
          <span className="text-[10px] tabular-nums opacity-80">
            {enabled ? "시스템 보호중" : "정상 운영"}
          </span>
        </button>
      </div>
    </>
  );
}

function AnomalyFeed() {
  const [items, setItems] = useState<Anomaly[]>([]);
  const seedRef = useRef(false);

  // Initial fetch
  useEffect(() => {
    if (seedRef.current) return;
    seedRef.current = true;
    (async () => {
      const { data } = await supabase
        .from("anomaly_events" as any)
        .select("id,rule,severity,created_at,user_id")
        .order("created_at", { ascending: false })
        .limit(8);
      if (data) setItems(data as unknown as Anomaly[]);
    })();
  }, []);

  useChatChannel({
    key: "godmode:anomaly_events",
    bindings: [{ event: "INSERT", schema: "public", table: "anomaly_events" }],
    enabled: true,
    onEvent: (p: any) => {
      const row = p?.new as Anomaly | undefined;
      if (!row) return;
      setItems((prev) => [row, ...prev].slice(0, 8));
    },
  });

  const sevColor = (s: string) =>
    s === "critical" ? "text-destructive" :
    s === "warning"  ? "text-gold" :
    "text-muted-foreground";

  return (
    <div>
      <SectionTitle icon={AlertTriangle} label="Anomaly Live" hint={`${items.length}건`} />
      <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-[10px] text-muted-foreground/70 italic px-1">조용함 — 이상감지 없음.</div>
        ) : items.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 rounded-md border border-border/40 bg-background/30 px-2 py-1"
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", sevColor(a.severity).replace("text-", "bg-"))} />
            <div className="flex-1 min-w-0 text-[10px]">
              <div className={cn("font-bold truncate", sevColor(a.severity))}>{a.rule}</div>
              <div className="text-muted-foreground truncate tabular-nums">
                {new Date(a.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Link
        to="/admin/ops/errors"
        className="mt-1.5 block text-center text-[10px] text-primary hover:underline"
      >
        전체 보기 →
      </Link>
    </div>
  );
}

function FlashEventLauncher() {
  return (
    <div>
      <SectionTitle icon={Rocket} label="Flash Event" />
      <Link
        to="/admin/growth/marketing"
        className="block rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent
                   px-3 py-2.5 transition hover:border-primary hover:glow-primary focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-foreground">원클릭 이벤트 런처</div>
            <div className="text-[10px] text-muted-foreground">캠페인 · 부스터 · 보상</div>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ------------------------------ Body ------------------------------ */

function PanelBody() {
  return (
    <div className="space-y-3.5">
      <LiveKpi />
      <ManualCrownLink />
      <RrmToggle />
      <AnomalyFeed />
      <FlashEventLauncher />
    </div>
  );
}

/* ------------------------------ Container ------------------------------ */

export default function GodModePanel() {
  const [open, setOpen] = useState(false);

  // ESC to close mobile drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Desktop: right-side panel */}
      <aside
        aria-label="God Mode Panel"
        className="hidden lg:flex flex-col fixed top-14 right-3 bottom-3 w-[320px] z-20
                   glass-strong neon-border rounded-2xl p-3.5 overflow-hidden"
      >
        <header className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <h2 className="font-imperial text-sm tracking-[0.22em] text-gradient-imperial">
              GOD MODE
            </h2>
          </div>
          <span className="text-[9px] text-muted-foreground tabular-nums uppercase tracking-widest">
            Empire Live
          </span>
        </header>

        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          <PanelBody />
        </div>
      </aside>

      {/* Mobile: floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open God Mode"
        className="lg:hidden fixed bottom-4 right-4 z-30 h-12 w-12 rounded-full
                   bg-gradient-primary text-primary-foreground glow-primary
                   border border-primary/50 flex items-center justify-center
                   active:scale-95 transition"
      >
        <Zap className="w-5 h-5" />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] glass-strong neon-border
                          rounded-t-2xl p-4 overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <header className="flex items-center justify-between mb-3 sticky top-0">
              <h2 className="font-imperial text-sm tracking-[0.22em] text-gradient-imperial">
                GOD MODE
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-md glass border border-border flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <PanelBody />
          </div>
        </div>
      )}
    </>
  );
}
