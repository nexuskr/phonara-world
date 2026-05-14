import { useEffect, useState } from "react";
import { useVisibleInterval } from "@/lib/util/visible-interval";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import EmpireFoundingCounter from "@/components/EmpireFoundingCounter";
import FoundingSeasonHall from "@/components/empire/FoundingSeasonHall";
import EmpireDayCountdown from "@/components/EmpireDayCountdown";
import { Crown, Trophy, Lock, Users, Flame, Swords, Gem, Award, Activity } from "lucide-react";
import { formatKRW } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { LuxButton, Money } from "@/components/ui/lux";

type Founding = {
  id: string;
  founding_seat_no: number | null;
  total_settled: number;
  package_name: string;
};

/** 1M 카운터 — get_bot_total_users RPC + 60s 폴링 + 부드러운 카운트업 */
function useTotalUsers() {
  const [n, setN] = useState<number>(0);
  const mountedRef = (function(){ const r = useRef(true); useEffect(()=>()=>{r.current=false;},[]); return r; })();
  const rafRef = useRef(0);

  const refresh = async () => {
    const { data } = await supabase.rpc("get_bot_total_users" as any);
    if (!mountedRef.current) return;
    const target = Number(data ?? 0);
    const start = performance.now();
    const from = n;
    const dur = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(from + (target - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  useEffect(() => {
    void refresh();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 60s — 탭 숨김 시 정지.
  useVisibleInterval(() => { void refresh(); }, 60_000);
  return n;
}

const ENTRIES = [
  { to: "/lounge",   icon: Gem,    title: "제국 라운지",    desc: "길드 랭킹 · VIP 라운드테이블", accent: "from-primary/30 to-accent/10" },
  { to: "/whales",   icon: Flame,  title: "고래 랭킹",      desc: "Crown 폭발 · 대형 출금 24h",   accent: "from-gold/30 to-primary/10" },
  { to: "/arena",    icon: Swords, title: "Crown War",     desc: "실전 트레이딩 · Real/Paper",    accent: "from-destructive/25 to-gold/10" },
  { to: "/jackpot",  icon: Award,  title: "제국 대박 보상", desc: "Jackpot 룰렛 · 일 1회 무료",   accent: "from-accent/30 to-gold/10" },
] as const;

export default function Empire() {
  const user = useRequireAuth();
  const nav = useNavigate();
  const { t } = useTranslation("empire");
  const [me, setMe] = useState<Founding | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);
  const [whales24h, setWhales24h] = useState<number>(0);
  const totalUsers = useTotalUsers();

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const [{ data: mine }, { data: seats }, { data: whales }] = await Promise.all([
        supabase.from("package_purchases")
          .select("id,founding_seat_no,total_settled,package_name")
          .eq("user_id", user.id)
          .eq("is_empire_founding_member", true)
          .maybeSingle(),
        supabase.rpc("get_empire_seats_remaining" as any),
        supabase.rpc("get_whale_strikes_24h" as any, { _limit: 50 }),
      ]);
      if (!mounted) return;
      setMe((mine as Founding) ?? null);
      setSeatsLeft(typeof seats === "number" ? seats : null);
      setWhales24h(Array.isArray(whales) ? whales.length : 0);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      {/* HERO — 시네마틱 인트로 */}
      <section className="relative overflow-hidden border-b border-gold/10">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-gold/15 blur-3xl" />
          <div className="absolute top-10 right-0 w-[22rem] h-[22rem] rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--gold)/0.18),transparent_60%)]" />
        </div>
        <div className="container relative pt-8 pb-10 sm:pt-12 sm:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-[10px] font-imperial tracking-[0.24em] text-gold">
              <Crown className="w-3 h-3" /> PHONARA EMPIRE OS
            </div>
            <h1 className="font-imperial font-black text-3xl sm:text-5xl lg:text-6xl mt-3 leading-[1.05] tracking-[0.01em] break-keep">
              <span className="text-gradient-gold">조 단위 제국을 짓는 운영체제.</span>
            </h1>
            <p className="text-xs sm:text-sm text-foreground/75 mt-3 max-w-2xl leading-relaxed break-keep">
              혼자 베팅하고, 군대로 싸우고, 자동으로 정산받는 <b className="text-gold">P2E 제국 OS</b>.
              주식·전세·다단계가 풀지 못한 <b>"기다림 없는 수익 구조"</b>를 코드로 다시 씁니다.
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <KpiTile icon={Users} label="제국 시민" value={totalUsers.toLocaleString()} hint="실시간 동시접속 추정" />
              <KpiTile icon={Activity} label="24h 고래 사건" value={whales24h.toLocaleString()} hint="Crown 폭발 · 대형 출금" />
              <KpiTile icon={Trophy} label="Founding 잔여석" value={seatsLeft != null ? `${seatsLeft}/30` : "—"} hint="Empire 패키지 한정" gold />
              <KpiTile icon={Crown} label="내 좌석" value={me?.founding_seat_no ? `#${me.founding_seat_no}` : "미보유"} hint={me ? "영구 보존" : "Empire 패키지 필요"} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <LuxButton variant="gold" size="lg" onClick={() => nav("/packages")}>
                <Crown className="w-4 h-4" /> 제국 패키지 보기
              </LuxButton>
              <Link
                to="/arena"
                className="press inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold border border-primary/40 text-primary hover:bg-primary/10 transition"
              >
                <Swords className="w-4 h-4" /> Crown War 입장
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container pt-6 pb-10 animate-liquid-in">
        {/* 4대 진입카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {ENTRIES.map((e, i) => {
            const Icon = e.icon;
            return (
              <motion.div
                key={e.to}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.45 }}
              >
                <Link
                  to={e.to}
                  className={`group press block relative overflow-hidden rounded-2xl p-4 glass-strong border border-border/40 hover:border-gold/40 transition`}
                >
                  <div aria-hidden className={`pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${e.accent} blur-2xl opacity-70`} />
                  <Icon className="w-5 h-5 text-gold relative" />
                  <div className="font-imperial font-black text-sm mt-2 relative break-keep">{e.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 relative break-keep">{e.desc}</div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Founding Season Hall (시즌 좌석/홀) */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-end">
            <Link to="/empire/my-seat" className="text-xs text-gold underline min-h-[44px] inline-flex items-center px-2">내 Founding 좌석 →</Link>
          </div>
          <FoundingSeasonHall />
        </div>

        {/* 좌석 / Founding 영역 */}
        {loading ? null : !me ? (
          <div className="glass-strong rounded-3xl p-6 sm:p-8 text-center neon-border relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0,hsl(var(--gold)/0.18),transparent_60%)]" />
            <div className="relative">
              <Lock className="w-9 h-9 text-muted-foreground mx-auto mb-2" />
              <h2 className="font-imperial font-black text-lg break-keep">{t("gateTitle")}</h2>
              <p className="text-xs text-muted-foreground mb-4 break-keep">{t("gateDesc")}</p>
              <div className="space-y-3 max-w-sm mx-auto">
                <EmpireFoundingCounter />
                <EmpireDayCountdown />
              </div>
              <LuxButton variant="gold" size="lg" block onClick={() => nav("/packages")} className="mt-5 max-w-sm mx-auto">
                <Crown className="w-4 h-4" /> {t("goPackages")}
              </LuxButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass-strong rounded-3xl p-6 neon-border relative overflow-hidden">
              <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/30 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs text-gold font-bold mb-1 tabular-nums">
                  <Crown className="w-4 h-4" /> {t("seat", { n: me.founding_seat_no })}
                </div>
                <h2 className="font-imperial font-black text-xl break-keep">{me.package_name}</h2>
                <p className="text-[11px] text-muted-foreground mt-1 break-keep">{t("foreverBadge")}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="glass rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground">{t("totalHarvest")}</div>
                    <Money strong className="font-display font-black text-base block">{formatKRW(me.total_settled)}</Money>
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
                <Trophy className="w-4 h-4 text-gold" /> {t("seatsTitle")}
              </div>
              <p className="text-[10px] text-muted-foreground break-keep">{t("seatsNote")}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  gold,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  gold?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl p-3 sm:p-4 glass-strong border ${gold ? "border-gold/40" : "border-border/40"} overflow-hidden`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${gold ? "text-gold" : "text-primary"}`} />
        <div className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">{label}</div>
      </div>
      <div className={`font-imperial font-black text-lg sm:text-2xl tabular-nums mt-1 ${gold ? "text-gradient-gold" : ""}`}>
        {value}
      </div>
      {hint && <div className="text-[9px] text-muted-foreground mt-0.5 break-keep">{hint}</div>}
    </div>
  );
}
