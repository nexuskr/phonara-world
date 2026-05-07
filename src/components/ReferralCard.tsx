import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, Copy, Share2, Crown, TrendingUp, Sparkles } from "lucide-react";

type Stats = {
  code: string | null;
  invited: number;
  active_7d: number;
  total_commission: number;
  today_commission: number;
};

export default function ReferralCard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [hasInviter, setHasInviter] = useState<boolean>(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("get_referral_stats");
    if (!error && data) setStats(data as any);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: p } = await supabase.from("profiles").select("referred_by").eq("id", u.user.id).maybeSingle();
      setHasInviter(!!(p as any)?.referred_by);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const link = stats?.code ? `${window.location.origin}/?ref=${stats.code}` : "";

  const copy = async (txt: string, label: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast({ title: `${label} 복사됨 ✨` });
    } catch {
      toast({ title: "복사 실패", variant: "destructive" });
    }
  };

  const share = async () => {
    if (!link) return;
    const text = `🚀 폰미션에서 같이 부업해요! 내 추천코드 ${stats?.code} 사용하면 둘 다 보너스 받아요 💰`;
    if (navigator.share) {
      try { await navigator.share({ title: "폰미션 초대", text, url: link }); return; } catch {}
    }
    await copy(`${text}\n${link}`, "초대 메시지");
  };

  const apply = async () => {
    if (applyCode.length !== 8) {
      toast({ title: "코드 8자리", variant: "destructive" });
      return;
    }
    setApplying(true);
    try {
      const { error } = await supabase.rpc("apply_referral_code", { _code: applyCode.toUpperCase() });
      if (error) {
        const m = error.message || "";
        const t = m.includes("already_applied") ? "이미 추천인을 등록했습니다"
          : m.includes("self_referral") ? "본인 코드는 사용 불가"
          : m.includes("code_not_found") ? "존재하지 않는 코드"
          : m;
        toast({ title: "등록 실패", description: t, variant: "destructive" });
        return;
      }
      toast({ title: "🎉 추천인 등록 완료" });
      setApplyCode("");
      load();
    } finally { setApplying(false); }
  };

  if (loading) {
    return <div className="glass-strong rounded-2xl p-5 h-32 animate-pulse" />;
  }

  return (
    <div className="relative glass-strong rounded-3xl p-5 neon-border overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-gold blur-3xl opacity-20" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-gradient-primary blur-3xl opacity-30" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center glow-gold">
            <Crown className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="font-display font-black text-base flex items-center gap-1.5">
              친구 초대 시스템
              <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
            </h3>
            <p className="text-[10px] text-muted-foreground">친구 미션 수익의 <span className="text-gold font-bold">10% 영구 커미션</span></p>
          </div>
        </div>

        {/* Code box */}
        <div className="rounded-2xl bg-gradient-to-br from-gold/15 via-primary/10 to-accent/10 border border-gold/30 p-4 mb-3">
          <div className="text-[10px] text-muted-foreground mb-1">내 추천 코드</div>
          <div className="flex items-center gap-2">
            <div className="font-display font-black text-2xl tracking-widest text-gradient-gold flex-1">
              {stats?.code ?? "—"}
            </div>
            <button onClick={() => copy(stats?.code ?? "", "코드")}
              className="w-9 h-9 rounded-lg glass hover:scale-105 transition flex items-center justify-center">
              <Copy className="w-4 h-4 text-gold" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => copy(link, "초대 링크")}
              className="flex-1 py-2 rounded-xl glass text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/10 transition">
              <Copy className="w-3.5 h-3.5" /> 링크 복사
            </button>
            <button onClick={share}
              className="flex-1 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-1.5 glow-primary hover:scale-[1.02] transition">
              <Share2 className="w-3.5 h-3.5" /> 친구에게 공유
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Stat label="초대 친구" value={`${stats?.invited ?? 0}명`} icon={<Users className="w-3.5 h-3.5" />} accent="text-secondary" />
          <Stat label="활동 중 (7일)" value={`${stats?.active_7d ?? 0}명`} icon={<TrendingUp className="w-3.5 h-3.5" />} accent="text-primary" />
          <Stat label="오늘 커미션" value={`${(stats?.today_commission ?? 0).toLocaleString()}원`} icon={<Sparkles className="w-3.5 h-3.5" />} accent="text-gold" />
          <Stat label="누적 커미션" value={`${(stats?.total_commission ?? 0).toLocaleString()}원`} icon={<Crown className="w-3.5 h-3.5" />} accent="text-gold" />
        </div>

        {/* Apply someone else's code (one-time) */}
        {!hasInviter && (
          <div className="rounded-2xl glass p-3 border border-border">
            <div className="text-[10px] text-muted-foreground mb-1.5">추천인 코드가 있다면 (1회만 등록 가능)</div>
            <div className="flex gap-2">
              <input
                value={applyCode}
                onChange={e => setApplyCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="ABCD1234"
                className="flex-1 px-3 py-2 rounded-lg bg-input/60 border border-border text-sm font-mono tracking-wider focus:border-gold outline-none"
                maxLength={8}
              />
              <button onClick={apply} disabled={applying || applyCode.length !== 8}
                className="px-4 py-2 rounded-lg bg-gradient-gold text-black text-xs font-black disabled:opacity-40">
                등록
              </button>
            </div>
          </div>
        )}

        {/* Rules */}
        <ul className="mt-3 space-y-1 text-[10px] text-muted-foreground">
          <li>• 친구가 미션으로 번 금액의 10%를 가입 후 7일간 자동 적립</li>
          <li>• 본인 코드 사용 불가 · 1회만 추천인 등록 가능</li>
          <li>• 부정행위 적발 시 보상 회수</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="glass rounded-xl p-2.5">
      <div className={`flex items-center gap-1 text-[10px] ${accent}`}>{icon}<span>{label}</span></div>
      <div className="font-display font-black text-sm mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
