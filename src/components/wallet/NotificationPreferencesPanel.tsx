import { useEffect, useState } from "react";
import { Bell, Mail, MessageSquare, Smartphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Channel = "push" | "email" | "sms";
type EventKey =
  | "withdraw_pending"
  | "withdraw_processing"
  | "withdraw_approved"
  | "withdraw_completed"
  | "withdraw_rejected";

interface PrefRow {
  user_id: string;
  event: string;
  channel: string;
  enabled: boolean;
}

const EVENTS: { key: EventKey; label: string }[] = [
  { key: "withdraw_pending", label: "출금 요청 접수" },
  { key: "withdraw_processing", label: "관리자 검토 시작" },
  { key: "withdraw_approved", label: "승인 완료" },
  { key: "withdraw_completed", label: "지급 완료" },
  { key: "withdraw_rejected", label: "반려" },
];

const CHANNELS: { key: Channel; label: string; icon: typeof Bell }[] = [
  { key: "push", label: "푸시", icon: Bell },
  { key: "email", label: "이메일", icon: Mail },
  { key: "sms", label: "SMS", icon: Smartphone },
];

const DEFAULT_ENABLED = true;

export default function NotificationPreferencesPanel({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => { void load(); }, [userId]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("event,channel,enabled")
      .eq("user_id", userId);
    if (error) {
      toast({ title: "설정 불러오기 실패", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const map: Record<string, boolean> = {};
    (data as PrefRow[] | null)?.forEach(r => { map[`${r.event}:${r.channel}`] = r.enabled; });
    setPrefs(map);
    setLoading(false);
  }

  async function toggle(event: EventKey, channel: Channel) {
    const key = `${event}:${channel}`;
    const current = prefs[key] ?? DEFAULT_ENABLED;
    const next = !current;
    setSavingKey(key);
    setPrefs(p => ({ ...p, [key]: next }));
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: userId, event, channel, enabled: next, updated_at: new Date().toISOString() },
        { onConflict: "user_id,event,channel" }
      );
    setSavingKey(null);
    if (error) {
      setPrefs(p => ({ ...p, [key]: current }));
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="glass-strong rounded-2xl p-6 border border-border/40 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> 알림 설정 로딩…
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-2xl p-5 border border-primary/20">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4 text-primary" />
        <div className="text-sm font-black tracking-wider">출금 알림 설정</div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">상태 변경 시 받을 채널을 선택하세요.</p>

      <PushEnableRow />

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-xs border-separate border-spacing-y-1">
          <thead>
            <tr className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              <th className="text-left font-bold pb-1">이벤트</th>
              {CHANNELS.map(c => (
                <th key={c.key} className="text-center font-bold pb-1 w-[70px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <c.icon className="w-3.5 h-3.5" />
                    <span>{c.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENTS.map(ev => (
              <tr key={ev.key} className="bg-muted/20 hover:bg-muted/30 transition">
                <td className="px-3 py-2.5 rounded-l-lg text-xs font-bold">{ev.label}</td>
                {CHANNELS.map(c => {
                  const k = `${ev.key}:${c.key}`;
                  const enabled = prefs[k] ?? DEFAULT_ENABLED;
                  const saving = savingKey === k;
                  return (
                    <td key={c.key} className={`text-center py-2 ${c.key === "sms" ? "rounded-r-lg" : ""}`}>
                      <button
                        onClick={() => void toggle(ev.key, c.key)}
                        disabled={saving}
                        className={`relative inline-flex w-10 h-5 rounded-full transition ${enabled ? "bg-gradient-imperial" : "bg-muted"} ${saving ? "opacity-50" : ""}`}
                        aria-pressed={enabled}
                        aria-label={`${ev.label} ${c.label} ${enabled ? "켜짐" : "꺼짐"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-background shadow transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">
        ⓘ 기본값은 모든 채널 켜짐. SMS는 휴대폰 인증이 완료된 계정에서만 발송됩니다. 푸시는 브라우저별로 별도 활성화 필요.
      </p>
    </div>
  );
}

function PushEnableRow() {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    (async () => {
      const { isPushSupported, isPushActive } = await import("@/lib/push");
      setSupported(isPushSupported());
      setActive(await isPushActive());
    })();
  }, []);

  async function onToggle() {
    setBusy(true);
    try {
      const mod = await import("@/lib/push");
      if (active) {
        await mod.unsubscribePush();
        setActive(false);
        toast({ title: "브라우저 푸시를 껐습니다" });
      } else {
        const r = await mod.subscribePush();
        if (!r.ok) {
          toast({ title: "푸시 활성화 실패", description: r.reason, variant: "destructive" });
        } else {
          setActive(true);
          toast({ title: "이 브라우저로 푸시 알림을 받습니다" });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div className="mb-4 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        이 브라우저는 푸시 알림을 지원하지 않습니다.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Bell className={`w-4 h-4 shrink-0 ${active ? "text-secondary" : "text-muted-foreground"}`} />
        <div className="min-w-0">
          <div className="text-xs font-black">브라우저 푸시 알림</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {active ? "이 브라우저로 즉시 알림을 받습니다" : "버튼을 눌러 이 브라우저에서 활성화"}
          </div>
        </div>
      </div>
      <button
        onClick={() => void onToggle()}
        disabled={busy}
        className={`text-[11px] font-black px-3 py-1.5 rounded-lg shrink-0 ${active ? "bg-muted text-foreground" : "bg-gradient-imperial text-imperial-foreground"} disabled:opacity-50`}
      >
        {busy ? "..." : active ? "끄기" : "활성화"}
      </button>
    </div>
  );
}
