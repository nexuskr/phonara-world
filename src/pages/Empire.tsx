import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import EmpireFoundingCounter from "@/components/EmpireFoundingCounter";
import EmpireDayCountdown from "@/components/EmpireDayCountdown";
import { Crown, Trophy, Lock } from "lucide-react";
import { formatKRW } from "@/lib/store";

type Founding = {
  id: string;
  founding_seat_no: number | null;
  total_settled: number;
  package_name: string;
};

export default function Empire() {
  const user = useRequireAuth();
  const nav = useNavigate();
  const [me, setMe] = useState<Founding | null>(null);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<{ seat_no: number; nickname: string | null }[]>([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data: mine } = await supabase
        .from("package_purchases")
        .select("id,founding_seat_no,total_settled,package_name")
        .eq("user_id", user.id)
        .eq("is_empire_founding_member", true)
        .maybeSingle();
      if (!mounted) return;
      setMe((mine as Founding) ?? null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <div className="container pt-6 pb-10 animate-liquid-in">
        <div className="mb-6">
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <Crown className="w-6 h-6 text-gold" />
            <span className="text-gradient-gold">Empire Lounge</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Founding Member 30석 한정 · Empire Day(매월 1·15일) Day 4+ 보유자 +50%</p>
        </div>

        {loading ? null : !me ? (
          <div className="glass-strong rounded-3xl p-8 text-center neon-border">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="font-display font-black text-lg mb-1">Founding Member 전용 공간</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Empire 패키지를 구매하시면 Founding 좌석(30석 한정) 자동 시도 + 라운지가 열립니다.
            </p>
            <div className="space-y-3 max-w-sm mx-auto">
              <EmpireFoundingCounter />
              <EmpireDayCountdown />
            </div>
            <button onClick={() => nav("/packages")}
              className="mt-5 px-6 py-3 rounded-xl bg-gradient-to-r from-gold via-primary to-gold font-display font-black text-sm text-background">
              Empire 보기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass-strong rounded-3xl p-6 neon-border relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/30 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs text-gold font-bold mb-1">
                  <Crown className="w-4 h-4" /> Founding Seat #{me.founding_seat_no}
                </div>
                <h2 className="font-display font-black text-xl">{me.package_name}</h2>
                <p className="text-[11px] text-muted-foreground mt-1">평생 Founding 뱃지 · Day 4+ Empire Day 자동 +50%</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="glass rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground">누적 수확</div>
                    <div className="font-display font-black text-base text-gradient-gold">{formatKRW(me.total_settled)}</div>
                  </div>
                  <div className="glass rounded-xl p-3 flex items-center justify-center">
                    <EmpireDayCountdown />
                  </div>
                </div>
              </div>
            </div>

            <EmpireFoundingCounter />

            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold mb-3">
                <Trophy className="w-4 h-4 text-gold" /> Founding 좌석 현황
              </div>
              <p className="text-[10px] text-muted-foreground">
                ※ 좌석 1~30 · 본인 외 다른 Founding 멤버 정보는 비공개
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
