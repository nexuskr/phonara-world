import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Sparkles, ArrowRight, Eye, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShareReplayButton } from "@/components/empire/ShareReplayButton";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

type Replay = {
  awarded: number;
  variance: number;
  level: number;
  nick: string;
  views: number;
  shares: number;
  created_at: string;
};

export default function ReplayLanding() {
  const { token = "" } = useParams<{ token: string }>();
  const [data, setData] = useState<Replay | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    document.title = "👑 Crown Reveal · Phonara Empire";
    if (!token) return;
    (async () => {
      const { data: r } = await supabase.rpc("get_public_crown_replay", { _token: token });
      if (!r) { setNotFound(true); setLoading(false); return; }
      setData(r as unknown as Replay);
      setLoading(false);
      // bump view (best-effort)
      supabase.rpc("bump_crown_replay_view", { _token: token }).catch(() => {});
    })();
  }, [token]);

  if (loading) {
    return <div className="min-h-screen bg-background p-6"><LoadingList rows={5} /></div>;
  }
  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-background p-6 grid place-items-center">
        <EmptyState
          title="Replay를 찾을 수 없습니다"
          description="만료되었거나 존재하지 않는 링크입니다."
          actionLabel="제국 입성"
          onAction={() => (window.location.href = "/")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* halo */}
      <motion.div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full"
        style={{ background: "radial-gradient(closest-side, hsl(var(--gold)/0.35), transparent 70%)" }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <main className="relative z-10 max-w-md mx-auto px-5 pt-10 pb-24 text-center">
        <div className="text-[10px] tracking-[0.4em] font-black text-gold mb-4">PHONARA · EMPIRE</div>

        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 9, stiffness: 110 }}
          className="text-7xl"
        >
          👑
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-4 font-display font-black text-6xl tabular-nums bg-gradient-to-r from-gold via-yellow-200 to-gold bg-clip-text text-transparent drop-shadow-[0_0_24px_hsl(var(--gold)/0.4)]"
        >
          +{data.awarded.toLocaleString()} ₡
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", damping: 12 }}
          className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-gold/60 bg-black/40"
        >
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="font-display font-black text-xl text-gold tabular-nums">×{data.variance.toFixed(2)}</span>
          <span className="text-[10px] tracking-[0.3em] text-gold/80 font-bold">VARIANCE</span>
        </motion.div>

        <div className="mt-6 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{data.nick}</span> · LV.<span className="text-gold font-black">{data.level}</span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {data.views.toLocaleString()}</span>
          <span className="inline-flex items-center gap-1"><Share2 className="w-3 h-3" /> {data.shares.toLocaleString()}</span>
        </div>

        {/* CTA card — strong join push */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-10 glass-strong rounded-3xl border border-gold/30 p-6 shadow-[0_0_40px_-12px_hsl(var(--gold)/0.6)]"
        >
          <div className="text-xs text-gold tracking-[0.25em] font-black mb-2">EMPIRE에 자리가 비어있습니다</div>
          <div className="font-display font-black text-2xl mb-2 leading-tight">
            지금 입성하면<br />
            첫 Crown은 당신의 것
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Practice Mode로 무료 체험 후, Empire의 일원이 되어 다음 변동성 폭발의 주인공이 되세요.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-gold via-yellow-300 to-gold text-background font-display font-black text-lg shadow-[0_0_28px_-4px_hsl(var(--gold)/0.8)] active:scale-[0.98] transition"
          >
            <Crown className="w-5 h-5" />
            제국 입성하기
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/dashboard"
            className="block mt-3 text-xs text-muted-foreground hover:text-foreground"
          >
            이미 회원이신가요? 대시보드로
          </Link>
        </motion.div>

        <div className="mt-8">
          <ShareReplayButton token={token} variant="full" />
        </div>

        <div className="mt-10 text-[9px] text-muted-foreground/60">
          ₡ 표기는 SIM(시뮬레이션) 단위입니다. 실제 수익/원화 환산이 아닙니다.
        </div>
      </main>
    </div>
  );
}
