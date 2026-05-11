import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, Flame, Crown, TrendingUp, ArrowRight, Clock, Users } from "lucide-react";
import Layout from "@/components/Layout";
import { useDB, formatKRW } from "@/lib/store";
import EarningsSimulator from "@/components/guide/EarningsSimulator";

/**
 * 풀스크린 스토리텔링 가이드
 * 20~70대 한국인을 위한 FOMO 중심 1장씩 스크롤 가이드.
 */
export default function Guide() {
  const [db] = useDB();
  const isLoggedIn = !!db.user?.id;
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <Layout>
      <div
        ref={containerRef}
        className="snap-y snap-mandatory overflow-y-auto h-[calc(100vh-56px)] scroll-smooth"
        style={{ scrollbarWidth: "thin" }}
      >
        <SceneHook />
        <SceneLiveProof />
        <SceneSimulator />
        <SceneTiers />
        <SceneTestimonials />
        <SceneFinalCTA isLoggedIn={isLoggedIn} />
      </div>
    </Layout>
  );
}

/* ------------------ shared scaffolding ------------------ */

function Scene({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`snap-start min-h-[calc(100vh-56px)] flex flex-col justify-center relative overflow-hidden px-5 py-10 ${className}`}>
      {children}
    </section>
  );
}

function ScrollHint() {
  return (
    <motion.div
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 1.6, repeat: Infinity }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[10px] font-bold tracking-[0.3em] text-muted-foreground"
    >
      <span>SCROLL</span>
      <ChevronDown className="w-4 h-4" />
    </motion.div>
  );
}

/* ------------------ Scene 1 — HOOK ------------------ */

function SceneHook() {
  // 실시간 누적 출금 카운터 (시드 + tick)
  const [paid, setPaid] = useState(() => 8_241_500_000 + Math.floor(Math.random() * 5_000_000));
  useEffect(() => {
    const t = setInterval(() => setPaid((p) => p + Math.floor(Math.random() * 380_000 + 50_000)), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <Scene>
      {/* drama bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      <motion.div
        className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-gradient-imperial opacity-30 blur-3xl"
        animate={{ scale: [1, 1.15, 1], rotate: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-gold/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 9, repeat: Infinity }}
      />

      <div className="relative max-w-md mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-primary/40 text-[10px] font-black tracking-[0.3em] text-primary mb-5"
        >
          <Flame className="w-3 h-3 animate-pulse" /> 오늘 24시간 동안
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-imperial font-black text-4xl sm:text-5xl tabular-nums text-gradient-gold mb-3 break-keep"
        >
          {formatKRW(paid)}
        </motion.div>

        <p className="text-base sm:text-lg font-bold break-keep">
          이미 회원들이 <span className="text-money-strong">출금했습니다</span>
        </p>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-imperial text-3xl sm:text-4xl mt-8 leading-snug break-keep"
        >
          당신만 <span className="text-destructive">아직</span>
          <br />
          <span className="text-gradient-primary">시작 안 했습니다.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="text-xs sm:text-sm text-muted-foreground mt-4 break-keep"
        >
          만 19세 이상 · 3분 가입 · 신용카드/주민번호 불필요
        </motion.p>
      </div>

      <ScrollHint />
    </Scene>
  );
}

/* ------------------ Scene 2 — LIVE PROOF ------------------ */

type PayoutRow = { id: string; name: string; amount: number; city: string; minsAgo: number };

const KO_CITIES = ["서울 강남","부산 해운대","대구 수성","인천 송도","경기 분당","경기 일산","대전 둔산","광주 봉선","울산 남구","제주시","수원 영통","성남 판교","고양 일산동구"];
const KO_NICKS = ["김민준","이서연","박도윤","최하은","정지호","강유나","조현우","윤수아","장주원","임지유","한건우","오서윤","서재민","신채원"];

function SceneLiveProof() {
  const [rows, setRows] = useState<PayoutRow[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      name: KO_NICKS[i % KO_NICKS.length].replace(/.$/, "*"),
      amount: 250_000 + Math.floor(Math.random() * 4_800_000),
      city: KO_CITIES[i % KO_CITIES.length],
      minsAgo: 1 + i * 2,
    }))
  );

  useEffect(() => {
    const t = setInterval(() => {
      setRows((prev) => [
        {
          id: `r${Date.now()}`,
          name: KO_NICKS[Math.floor(Math.random() * KO_NICKS.length)].replace(/.$/, "*"),
          amount: 180_000 + Math.floor(Math.random() * 6_500_000),
          city: KO_CITIES[Math.floor(Math.random() * KO_CITIES.length)],
          minsAgo: 0,
        },
        ...prev.slice(0, 5),
      ]);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <Scene className="bg-gradient-to-b from-background to-secondary/5">
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-secondary/40 text-[10px] font-black tracking-[0.3em] text-secondary mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> 실시간 출금
          </div>
          <h2 className="font-imperial text-2xl sm:text-3xl break-keep">
            지금 이 순간에도<br />
            <span className="text-gradient-primary">옆집 아저씨가 받고 있습니다</span>
          </h2>
        </div>

        <div className="space-y-2">
          {rows.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1 - i * 0.12, x: 0 }}
              transition={{ duration: 0.45 }}
              className="glass-strong rounded-2xl p-3 flex items-center gap-3 border border-secondary/20"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary font-display font-black flex items-center justify-center">
                {r.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{r.name} <span className="text-muted-foreground font-normal">({r.city})</span></div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {r.minsAgo === 0 ? "방금" : `${r.minsAgo}분 전`} · 송금 완료
                </div>
              </div>
              <div className="font-display font-black tabular-nums text-money-strong">+{formatKRW(r.amount)}</div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-5 break-keep">
          본인보호를 위해 이름은 일부 가립니다. · 평균 출금 처리 23분
        </p>
      </div>
      <ScrollHint />
    </Scene>
  );
}

/* ------------------ Scene 3 — SIMULATOR ------------------ */

function SceneSimulator() {
  return (
    <Scene className="bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-primary/40 text-[10px] font-black tracking-[0.3em] text-primary mb-3">
            <TrendingUp className="w-3 h-3" /> 60초 수익 시뮬레이터
          </div>
          <h2 className="font-imperial text-2xl sm:text-3xl break-keep">
            10만원이<br />
            <span className="text-gradient-gold">한 달 뒤에 얼마?</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-2 break-keep">
            슬라이더를 움직이면 수익이 실시간으로 계산됩니다
          </p>
        </div>
        <EarningsSimulator />
      </div>
      <ScrollHint />
    </Scene>
  );
}

/* ------------------ Scene 4 — TIERS ------------------ */

const TIERS = [
  { n: "FREE",    sub: "지금 가입하면",    reward: "1×",   limit: "50만",  jp: "4%",  color: "from-muted to-muted/50", emoji: "🪙" },
  { n: "STARTER", sub: "첫 입금 5만+",   reward: "1.5×", limit: "100만", jp: "6%",  color: "from-secondary/30 to-secondary/10", emoji: "🚀" },
  { n: "VIP",     sub: "누적 100만+",   reward: "6×",   limit: "500만", jp: "12%", color: "from-primary/30 to-primary/10", emoji: "💎" },
  { n: "GOD",     sub: "누적 1,000만+", reward: "10×",  limit: "5,000만",jp: "28%", color: "from-accent/30 to-accent/10", emoji: "👑" },
  { n: "EMPIRE",  sub: "황실 직속",      reward: "20×+", limit: "∞",     jp: "65%", color: "from-gold to-gold/50", emoji: "🏰" },
];

function SceneTiers() {
  return (
    <Scene>
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/40 text-[10px] font-black tracking-[0.3em] text-gold mb-3">
            <Crown className="w-3 h-3" /> 등급이 곧 수익
          </div>
          <h2 className="font-imperial text-2xl sm:text-3xl break-keep">
            높은 등급일수록<br />
            <span className="text-gradient-gold">더 적게 일하고 더 많이 받음</span>
          </h2>
        </div>
        <div className="space-y-2.5">
          {TIERS.map((t, i) => (
            <motion.div
              key={t.n}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className={`rounded-2xl p-4 bg-gradient-to-br ${t.color} border border-border/40 ${t.n === "EMPIRE" ? "neon-border" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">{t.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-black text-lg">{t.n}</span>
                    <span className="text-[10px] text-muted-foreground">{t.sub}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-2 text-[10px]">
                    <div><div className="text-muted-foreground">보상</div><div className="font-black tabular-nums">{t.reward}</div></div>
                    <div><div className="text-muted-foreground">한도</div><div className="font-black tabular-nums">{t.limit}</div></div>
                    <div><div className="text-muted-foreground">잭팟</div><div className={`font-black tabular-nums ${t.n === "EMPIRE" ? "text-gold" : "text-primary"}`}>{t.jp}</div></div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <ScrollHint />
    </Scene>
  );
}

/* ------------------ Scene 5 — TESTIMONIALS ------------------ */

const REVIEWS = [
  { name: "박○현, 52세, 부산", text: "은퇴 후 용돈벌이로 시작했는데 월 80만원이 더 들어옵니다. 손녀 학원비 보탬.", profit: "+ 80만/월", tag: "은퇴자" },
  { name: "김○지, 34세, 일산", text: "퇴근 후 출퇴근 지하철에서만 미션 합니다. 첫 달 32만원, 셋째 달 240만원 출금.", profit: "+ 240만/월", tag: "직장맘" },
  { name: "이○수, 26세, 신촌", text: "월세 내고 남는 게 없었는데 지금은 친구한테 술 산다. 진짜.", profit: "+ 64만/월", tag: "사회초년생" },
  { name: "정○성, 67세, 대구", text: "유튜브 본다고 시간 보내느니 차라리 미션을. 한 달 60만원 더 번다.", profit: "+ 60만/월", tag: "시니어" },
];

function SceneTestimonials() {
  return (
    <Scene className="bg-gradient-to-b from-background to-primary/5">
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-primary/40 text-[10px] font-black tracking-[0.3em] text-primary mb-3">
            <Users className="w-3 h-3" /> 실제 회원 후기
          </div>
          <h2 className="font-imperial text-2xl sm:text-3xl break-keep">
            20대부터 70대까지<br />
            <span className="text-gradient-primary">이미 1만 명이</span>
          </h2>
        </div>
        <div className="space-y-2.5">
          {REVIEWS.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-strong rounded-2xl p-4 border border-border/40"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground font-black flex items-center justify-center text-sm">
                    {r.name[0]}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{r.name}</div>
                    <div className="text-[9px] text-primary font-black tracking-widest">{r.tag}</div>
                  </div>
                </div>
                <div className="text-money-strong font-display font-black text-sm tabular-nums">{r.profit}</div>
              </div>
              <p className="text-[12px] text-foreground/85 leading-relaxed break-keep">"{r.text}"</p>
            </motion.div>
          ))}
        </div>
      </div>
      <ScrollHint />
    </Scene>
  );
}

/* ------------------ Scene 6 — FINAL CTA ------------------ */

function SceneFinalCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [seats, setSeats] = useState(347);
  useEffect(() => {
    const t = setInterval(() => setSeats((s) => Math.max(7, s - (Math.random() < 0.35 ? 1 : 0))), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <Scene className="bg-gradient-to-br from-gold/10 via-background to-primary/10">
      <motion.div
        className="absolute inset-0 bg-gradient-imperial opacity-10"
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <div className="relative max-w-md mx-auto w-full text-center">
        <Crown className="w-12 h-12 text-gold mx-auto mb-3 animate-crown" />
        <h2 className="font-imperial text-3xl sm:text-4xl text-gradient-gold leading-tight break-keep">
          오늘 가입하면<br />지급되는 보너스
        </h2>

        <div className="glass-strong neon-border rounded-3xl p-5 mt-6 text-left">
          <div className="space-y-2.5 text-sm">
            <RowBonus emoji="💰" label="신규 가입 보너스" value="+3,000원" />
            <RowBonus emoji="🎯" label="첫 미션 완료 보상" value="+2,000원" />
            <RowBonus emoji="🎁" label="가이드 6단계 완주" value="+5,000원" />
            <RowBonus emoji="🔥" label="첫 입금 100% 매칭" value="최대 +20만" highlight />
          </div>
          <div className="h-px bg-border my-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">합계 (최대)</span>
            <span className="font-imperial text-xl text-gradient-gold tabular-nums">+210,000원</span>
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/15 border border-destructive/40 text-destructive text-xs font-bold">
          <Flame className="w-3.5 h-3.5" />
          오늘 남은 가입 슬롯 <span className="tabular-nums">{seats}</span>석
        </div>

        <Link
          to={isLoggedIn ? "/wallet" : "/auth"}
          className="press sheen mt-6 w-full min-h-[64px] rounded-2xl bg-gradient-gold text-gold-foreground font-display font-black text-lg flex items-center justify-center gap-2 glow-gold"
        >
          {isLoggedIn ? "지금 입금하기" : "1분 안에 가입하기"} <ArrowRight className="w-5 h-5" />
        </Link>

        <Link to="/empire" className="block mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline">
          제국 라운지 미리보기 →
        </Link>

        <p className="text-[10px] text-muted-foreground mt-6 break-keep">
          ⚠️ 본 페이지의 모든 수치는 시뮬레이션이며, 실제 수익을 보장하지 않습니다. 만 19세 이상만 이용 가능.
        </p>
      </div>
    </Scene>
  );
}

function RowBonus({ emoji, label, value, highlight }: { emoji: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-foreground/90"><span>{emoji}</span>{label}</span>
      <span className={`font-display font-black tabular-nums ${highlight ? "text-gold" : "text-money-strong"}`}>{value}</span>
    </div>
  );
}
