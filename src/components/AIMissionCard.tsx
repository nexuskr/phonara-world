import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Zap, Loader2, Bot, Clock } from "lucide-react";
import { toast } from "sonner";

interface AIMission {
  id: string;
  template_key: string;
  title: string;
  description: string;
  reward_credit: number;
  reward_xp: number;
  status: "pending" | "approved" | "claimed" | "expired" | "rejected";
  ai_reasoning: string | null;
  expires_at: string;
  created_at: string;
}

export default function AIMissionCard() {
  const [missions, setMissions] = useState<AIMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("ai_generated_missions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"])
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(3);
    setMissions((data ?? []) as AIMission[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    let channel: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`aigm:${user.id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "ai_generated_missions", filter: `user_id=eq.${user.id}` },
          () => load())
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  async function generate() {
    setGenerating(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mission-generator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (r.status === 429) { toast.error("AI 호출이 일시적으로 제한되었습니다 (429)"); return; }
      if (r.status === 402) { toast.error("AI 크레딧이 소진되었습니다 — 워크스페이스 충전 필요"); return; }
      if (!r.ok) { toast.error("AI 미션 생성 실패"); return; }
      const j = await r.json();
      if (j.skipped) toast("⏳ 진행 중인 AI 미션이 이미 있습니다");
      load();
    } finally {
      setGenerating(false);
    }
  }

  async function claim(id: string) {
    setClaiming(id);
    const { error } = await supabase.rpc("claim_ai_mission", { _mission_id: id });
    setClaiming(null);
    if (error) {
      toast.error("청구 실패", { description: error.message });
      return;
    }
    load();
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-cyan-400/40 p-5 bg-gradient-to-br from-cyan-500/10 via-background to-blue-500/5">
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
      <div className="relative">
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-imperial text-lg font-black flex items-center gap-2">
            <Bot className="text-cyan-400 w-5 h-5" />
            AI 맞춤 미션
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-400/15">BETA</span>
          </h2>
          <button
            onClick={generate}
            disabled={generating}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 disabled:opacity-50 flex items-center gap-1.5"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            새 미션 생성
          </button>
        </header>

        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">로딩 중…</div>
        ) : missions.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center break-keep">
            AI가 당신의 활동을 분석해 맞춤형 미션을 만들어 드립니다. 위 버튼을 눌러 시작하세요.
          </div>
        ) : (
          <div className="space-y-2">
            {missions.map((m) => {
              const minLeft = Math.max(0, Math.floor((new Date(m.expires_at).getTime() - Date.now()) / 60000));
              return (
                <div key={m.id} className="rounded-2xl bg-card/80 border border-cyan-400/20 p-3.5 hover:border-cyan-400/50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold break-keep text-sm">{m.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 break-keep">{m.description}</p>
                      {m.ai_reasoning && (
                        <p className="text-[11px] italic text-cyan-300/80 mt-1.5 break-keep">💡 {m.ai_reasoning}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold tabular-nums">+₩{m.reward_credit.toLocaleString()}</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold tabular-nums">+{m.reward_xp} XP</span>
                        <span className="text-muted-foreground tabular-nums flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {minLeft}분
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => claim(m.id)}
                      disabled={m.status !== "approved" || claiming === m.id}
                      className={`shrink-0 text-xs font-black px-3 py-2 rounded-lg ${
                        m.status === "approved"
                          ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-90"
                          : "bg-card text-muted-foreground border border-border"
                      } disabled:opacity-50 flex items-center gap-1`}
                    >
                      {claiming === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      {m.status === "approved" ? "청구" : "결재 대기"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
