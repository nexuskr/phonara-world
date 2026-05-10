import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { ShieldAlert, Smartphone, Zap, Activity, ShieldCheck } from "lucide-react";

type Event = {
  id: string;
  rule: string;
  severity: string;
  evidence: any;
  created_at: string;
  acknowledged: boolean;
};

const RULE_META: Record<string, { label: string; icon: any; describe: (e: any) => string }> = {
  new_device: {
    label: "새 디바이스 로그인",
    icon: Smartphone,
    describe: (ev) =>
      ev?.ua ? `${String(ev.ua).slice(0, 60)} (#${ev?.fp_hash_prefix ?? ""})` : `디바이스 #${ev?.fp_hash_prefix ?? ""}`,
  },
  withdrawal_velocity: {
    label: "출금 빈도 이상",
    icon: Zap,
    describe: (ev) => `최근 ${ev?.window ?? ""} 동안 ${ev?.count ?? "다수"}건의 출금 시도가 감지되었습니다.`,
  },
};

function severityClass(s: string) {
  switch (s) {
    case "critical": return "border-destructive/40 bg-destructive/10 text-destructive";
    case "warning":
    case "warn":
    case "high":
      return "border-gold/40 bg-gold/10 text-gold";
    default:
      return "border-primary/30 bg-primary/5 text-primary";
  }
}

export default function MySecurityEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_my_security_events", { _limit: 20 });
    if (error) {
      notify.fail("보안 이벤트 불러오기 실패", error);
      setLoading(false);
      return;
    }
    setEvents((data ?? []) as Event[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  if (loading) return <LoadingList rows={3} />;

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="w-8 h-8" />}
        title="이상 신호 없음"
        description="최근 의심스러운 활동이 감지되지 않았습니다."
        size="sm"
        variant="muted"
      />
    );
  }

  return (
    <div className="space-y-2">
      {events.map((e) => {
        const meta = RULE_META[e.rule] ?? {
          label: e.rule,
          icon: Activity,
          describe: () => "보안 시스템이 이 활동을 자동 기록했습니다.",
        };
        const Icon = meta.icon;
        return (
          <div
            key={e.id}
            className={`glass-strong rounded-2xl p-3 flex items-start gap-3 border ${severityClass(e.severity)}`}
          >
            <div className="p-2 rounded-xl bg-background/50 shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-bold text-sm truncate text-foreground">{meta.label}</div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase bg-background/40">
                  {e.severity}
                </span>
                {!e.acknowledged && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-black tracking-wider">
                    NEW
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 break-keep line-clamp-2">
                {meta.describe(e.evidence)}
              </div>
              <div className="text-[10px] text-muted-foreground/70 mt-1 tabular-nums">
                {new Date(e.created_at).toLocaleString("ko-KR")}
              </div>
            </div>
          </div>
        );
      })}
      {events.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center pt-1 break-keep">
          본인이 한 활동이 맞다면 무시해도 됩니다. 아니라면 즉시 비밀번호 변경 + 의심 디바이스 제거를 권장합니다.
        </p>
      )}
    </div>
  );
}
