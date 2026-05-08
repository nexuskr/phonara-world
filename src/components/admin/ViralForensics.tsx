import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Activity, FileText } from "lucide-react";

type SubTab = "verifications" | "events" | "audit";

type VerifRow = {
  submission_id: string;
  user_id: string;
  verification_status: "valid" | "invalid" | "suspect";
  risk_score: number;
  decided_by: string;
  created_at: string;
};

type EventRow = {
  id: string;
  submission_id: string | null;
  event_type: string;
  signals_raw: Record<string, unknown>;
  created_at: string;
};

type AuditRow = {
  id: string;
  submission_id: string | null;
  event_type: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
};

const STATUS_PILL: Record<string, string> = {
  valid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  invalid: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  suspect: "bg-amber-500/15 text-amber-300 border-amber-500/40",
};

const EVENT_PILL: Record<string, string> = {
  attempted: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  settled: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  gate_blocked: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  race_skipped: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  ai_signal: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  ai_drift_alert: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  ai_skipped_circuit_open: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  ai_error: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};

function pill(map: Record<string, string>, key: string) {
  return map[key] ?? "bg-muted/40 text-muted-foreground border-border/40";
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { hour12: false });
}

function shortId(id?: string | null) {
  if (!id) return "—";
  return id.slice(0, 8);
}

export default function ViralForensics() {
  const [tab, setTab] = useState<SubTab>("verifications");

  const counts = useTabCounts();

  return (
    <div className="space-y-3">
      <CircuitBanner />

      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
        <SubBtn active={tab === "verifications"} onClick={() => setTab("verifications")} icon={ShieldCheck}>
          검증 ({counts.verifications})
        </SubBtn>
        <SubBtn active={tab === "events"} onClick={() => setTab("events")} icon={Activity}>
          이벤트 스트림 ({counts.events})
        </SubBtn>
        <SubBtn active={tab === "audit"} onClick={() => setTab("audit")} icon={FileText}>
          정산 감사 ({counts.audit})
        </SubBtn>
      </div>

      {tab === "verifications" && <VerificationList />}
      {tab === "events" && <EventStream />}
      {tab === "audit" && <AuditLog />}
    </div>
  );
}

function SubBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 min-h-[40px] rounded-xl text-xs font-bold flex items-center gap-1.5 break-keep whitespace-nowrap transition border ${
        active
          ? "bg-gradient-gold text-gold-foreground glow-gold border-transparent"
          : "glass text-muted-foreground border-border/40"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}

function useTabCounts() {
  const [counts, setCounts] = useState({ verifications: 0, events: 0, audit: 0 });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [v, e, a] = await Promise.all([
        supabase.from("viral_verification_log").select("submission_id", { count: "exact", head: true }),
        supabase.from("viral_verification_events").select("id", { count: "exact", head: true }),
        supabase.from("viral_settlement_audit").select("id", { count: "exact", head: true }),
      ]);
      if (!alive) return;
      setCounts({ verifications: v.count ?? 0, events: e.count ?? 0, audit: a.count ?? 0 });
    };
    load();
    const ch = supabase
      .channel("admin:vf:counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "viral_verification_log" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "viral_verification_events" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "viral_settlement_audit" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);
  return counts;
}

function CircuitBanner() {
  const [state, setState] = useState<{ state: string; reason: string | null; opened_at: string | null } | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("viral_ai_circuit_state")
        .select("state, reason, opened_at")
        .eq("id", 1)
        .maybeSingle();
      if (alive) setState(data as any);
    };
    load();
    const ch = supabase
      .channel("admin:vf:circuit")
      .on("postgres_changes", { event: "*", schema: "public", table: "viral_ai_circuit_state" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  if (!state) return null;
  const isOpen = state.state === "open";
  const isHalf = state.state === "half_open";
  const cls = isOpen
    ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
    : isHalf
    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300";
  const Icon = isOpen ? ShieldAlert : isHalf ? ShieldQuestion : ShieldCheck;
  return (
    <div className={`glass-strong rounded-2xl border ${cls} p-3 flex items-center gap-3`}>
      <Icon className="w-5 h-5 shrink-0" />
      <div className="text-xs">
        <div className="font-bold uppercase tracking-wider">AI Circuit · {state.state}</div>
        <div className="text-muted-foreground">
          {state.reason || "deterministic verification 보호 중"}
          {state.opened_at && ` · opened ${fmtTime(state.opened_at)}`}
        </div>
      </div>
    </div>
  );
}

function VerificationList() {
  const [rows, setRows] = useState<VerifRow[]>([]);
  const [filter, setFilter] = useState<"all" | "valid" | "invalid" | "suspect">("all");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("viral_verification_log")
        .select("submission_id,user_id,verification_status,risk_score,decided_by,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (alive) setRows((data as VerifRow[]) ?? []);
    };
    load();
    const ch = supabase
      .channel("admin:vf:verif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "viral_verification_log" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.verification_status === filter)),
    [rows, filter]
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 text-[11px]">
        {(["all", "valid", "invalid", "suspect"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg border ${
              filter === f ? "bg-primary/20 border-primary/60 text-primary" : "glass border-border/40 text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <div key={r.submission_id} className="glass rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${pill(STATUS_PILL, r.verification_status)}`}>
                    {r.verification_status}
                  </span>
                  <span className="text-muted-foreground">risk {r.risk_score}</span>
                  <span className="text-muted-foreground">· {r.decided_by}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                  sub {shortId(r.submission_id)} · user {shortId(r.user_id)} · {fmtTime(r.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventStream() {
  const [rows, setRows] = useState<EventRow[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("viral_verification_events")
        .select("id,submission_id,event_type,signals_raw,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (alive) setRows((data as EventRow[]) ?? []);
    };
    load();
    const ch = supabase
      .channel("admin:vf:events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "viral_verification_events" }, (p) =>
        setRows((prev) => [p.new as EventRow, ...prev].slice(0, 200))
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  if (rows.length === 0) return <Empty />;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="glass rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${pill(EVENT_PILL, r.event_type)}`}>
              {r.event_type}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">sub {shortId(r.submission_id)} · {fmtTime(r.created_at)}</span>
          </div>
          <pre className="text-[10px] text-muted-foreground mt-1.5 overflow-x-auto font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(r.signals_raw, null, 0)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("viral_settlement_audit")
        .select("id,submission_id,event_type,actor,details,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (alive) setRows((data as AuditRow[]) ?? []);
    };
    load();
    const ch = supabase
      .channel("admin:vf:audit")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "viral_settlement_audit" }, (p) =>
        setRows((prev) => [p.new as AuditRow, ...prev].slice(0, 200))
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  if (rows.length === 0) return <Empty />;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="glass rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${pill(EVENT_PILL, r.event_type)}`}>
              {r.event_type}
            </span>
            <span className="text-[10px] text-muted-foreground">{r.actor}</span>
            <span className="text-[10px] text-muted-foreground font-mono ml-auto">sub {shortId(r.submission_id)} · {fmtTime(r.created_at)}</span>
          </div>
          <pre className="text-[10px] text-muted-foreground mt-1.5 overflow-x-auto font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(r.details, null, 0)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">데이터가 없습니다</div>;
}
