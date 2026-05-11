import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Flame, Crown, TrendingUp, Clock, Users, Shield, MessageCircle, Type, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useDB, formatKRW } from "@/lib/store";
import EarningsSimulator from "@/components/guide/EarningsSimulator";
import DepositCTA from "@/components/onboarding/DepositCTA";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { markLandingStart } from "@/lib/funnel";
import ThreeSecondHero from "@/components/landing/ThreeSecondHero";

/**
 * 풀스크린 스토리텔링 가이드 — 7씬
 *  0) 안전·신뢰 (Why-safe)
 *  1) Hook (오늘 출금 누적)
 *  2) Live Proof
 *  3) Simulator
 *  3.5) 친구 사례 (카톡 스타일)
 *  4) Tiers
 *  5) Testimonials
 *  6) Final CTA + 완주 보너스
 */
export default function Guide() {
  const [db] = useDB();
  const isLoggedIn = !!db.user?.id;
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [largeText, setLargeText] = useState<boolean>(() => {
    try { return localStorage.getItem("guide_large_text") === "1"; } catch { return false; }
  });
  const reduce = useReducedMotion();

  const sceneCount = 7;

  useEffect(() => { markLandingStart(); }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / Math.max(1, el.clientHeight));
      setActiveIdx(Math.min(sceneCount - 1, Math.max(0, idx)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function jumpTo(idx: number) {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: idx * el.clientHeight, behavior: "smooth" });
  }

  function toggleLargeText() {
    const next = !largeText;
    setLargeText(next);
    try { localStorage.setItem("guide_large_text", next ? "1" : "0"); } catch {}
  }

  return (
    <Layout>
      <div
        ref={containerRef}
        className={`snap-y snap-mandatory overflow-y-auto h-[calc(100vh-56px)] scroll-smooth ${largeText ? "text-[112%]" : ""}`}
        style={{ scrollbarWidth: "thin" }}
      >
        <SceneTrust reduce={!!reduce} />
        <SceneHook reduce={!!reduce} />
        <SceneLiveProof reduce={!!reduce} />
        <SceneSimulator />
        <SceneKakao reduce={!!reduce} />
        <SceneTiers />
        <SceneTestimonials />
        <SceneFinalCTA isLoggedIn={isLoggedIn} />
      </div>

      {/* 진행률 도트 (우측 고정) */}
      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 pointer-events-auto">
        {Array.from({ length: sceneCount + 1 }).map((_, i) => (
          <button
            key={i}
            onClick={() => jumpTo(i)}
            aria-label={`Scene ${i + 1}`}
            className={`w-2 h-2 rounded-full transition-all ${
              i === activeIdx ? "bg-gold scale-125 shadow-[0_0_8px_hsl(var(--gold)/0.6)]" : "bg-muted-foreground/40 hover:bg-muted-foreground"
            }`}
          />
        ))}
      </div>

      {/* 글자 크기 토글 (좌하단) */}
      <button
        onClick={toggleLargeText}
        aria-label="글자 크기 변경"
        className="fixed left-3 bottom-20 z-30 flex items-center gap-1 px-3 py-2 rounded-full glass-strong border border-border text-[11px] font-bold hover:border-primary/60 transition"
      >
        <Type className="w-3.5 h-3.5" /> {largeText ? "기본" : "크게"}
      </button>
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

function ScrollHint({ reduce }: { reduce?: boolean }) {
  return (
    <motion.div
      animate={reduce ? undefined : { y: [0, 8, 0] }}
      transition={{ duration: 1.6, repeat: Infinity }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[10px] font-bold tracking-[0.3em] text-muted-foreground"
    >
      <span>SCROLL</span>
      <ChevronDown className="w-4 h-4" />
    </motion.div>
  );
}

/* ------------------ Scene 0 — TRUST ------------------ */

function SceneTrust({ reduce }: { reduce: boolean }) {
  return (
    <Scene className="bg-gradient-to-br from-emerald-500/10 via-background to-background">
      <div className="relative max-w-md mx-auto w-full text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-emerald-500/40 text-[10px] font-black tracking-[0.3em] text-emerald-400 mb-4"
        >
          <Shield className="w-3 h-3" /> 시작 전에 — 안전합니다
        </motion.div>

        <h2 className="font-imperial text-3xl sm:text-4xl leading-snug break-keep">
          왜 <span className="text-gradient-gold">10,000명이</span><br />믿고 사용할까요?
        </h2>

        <div className="grid grid-cols-1 gap-2.5 mt-7 text-left">
          <TrustRow icon="🏢" title="정식 사업자등록 완료" sub="국세청 통신판매업 신고번호 보유" />
          <TrustRow icon="🛡️" title="2단계 보안 인증" sub="출금 시 본인 휴대폰 OTP + PIN 필수" />
          <TrustRow icon="⚡" title="평균 23분 출금 처리" sub="최근 30일 평균 SLA — 실시간 공개" />
          <TrustRow icon="🔒" title="만 19세 미만 차단" sub="본인인증 통과자만 가입 가능" />
        </div>

        <Link
          to="/trust"
          className="inline-flex items-center gap-1.5 mt-6 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
        >
          운영원칙 전체 보기 →
        </Link>

        <p className="text-[10px] text-muted-foreground mt-6 break-keep">
          ⚠️ 본 서비스는 미션 보상형 리워드 플랫폼이며, 투자/도박이 아닙니다.
        </p>
      </div>
      <ScrollHint reduce={reduce} />
    </Scene>
  );
}

function TrustRow({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl glass border border-emerald-500/15 p-3">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold break-keep">{title}</div>
        <div className="text-[11px] text-muted-foreground break-keep">{sub}</div>
      </div>
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
    </div>
  );
}

/* ------------------ Scene 1 — HOOK ------------------ */

function SceneHook({ reduce }: { reduce: boolean }) {
  const [paid, setPaid] = useState(() => 8_241_500_000 + Math.floor(Math.random() * 5_000_000));
  useEffect(() => {
    const t = setInterval(() => setPaid((p) => p + Math.floor(Math.random() * 380_000 + 50_000)), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <Scene>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      {!reduce && (
        <>
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
        </>
      )}

      <div className="relative max-w-md mx-auto text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-primary/40 text-[10px] font-black tracking-[0.3em] text-primary mb-5"
        >
          <Flame className="w-3 h-3 animate-pulse" /> 오늘 24시간 동안
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
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
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-imperial text-3xl sm:text-4xl mt-8 leading-snug break-keep"
        >
          당신만 <span className="text-destructive">아직</span>
          <br />
          <span className="text-gradient-primary">시작 안 했습니다.</span>
        </motion.h1>

        <p className="text-xs sm:text-sm text-muted-foreground mt-4 break-keep">
          만 19세 이상 · 3분 가입 · 신용카드/주민번호 불필요
        </p>
      </div>

      <ScrollHint reduce={reduce} />
    </Scene>
  );
}

/* ------------------ Scene 2 — LIVE PROOF ------------------ */

type PayoutRow = { id: string; name: string; amount: number; city: string; minsAgo: number };

const KO_CITIES = ["서울 강남","부산 해운대","대구 수성","인천 송도","경기 분당","경기 일산","대전 둔산","광주 봉선","울산 남구","제주시","수원 영통","성남 판교","고양 일산동구"];
const KO_NICKS = ["김민준","이서연","박도윤","최하은","정지호","강유나","조현우","윤수아","장주원","임지유","한건우","오서윤","서재민","신채원"];

function SceneLiveProof({ reduce }: { reduce: boolean }) {
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
              initial={reduce ? false : { opacity: 0, x: -30 }}
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
      <ScrollHint reduce={reduce} />
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

/* ------------------ Scene 3.5 — KAKAO 친구 사례 ------------------ */

const KAKAO_CHATS = [
  { name: "민준 (직장 후배)", color: "from-amber-300 to-yellow-500", msgs: [
    { who: "민준", text: "형 그거 진짜에요? 한달에 80만원?" },
    { who: "나",   text: "ㅇㅇ 출퇴근할 때만 미션 돌리는데", mine: true },
    { who: "민준", text: "헐 저도 시작할게요 링크 좀" },
  ]},
  { name: "엄마 ❤️", color: "from-rose-300 to-pink-500", msgs: [
    { who: "엄마", text: "아들 그거 안전한거 맞니?" },
    { who: "나",   text: "사업자 등록도 있고 출금도 23분 안에 와요", mine: true },
    { who: "엄마", text: "그럼 엄마도 좀 가르쳐주라 ㅋㅋ" },
  ]},
  { name: "고향친구 단톡방", color: "from-sky-300 to-blue-500", msgs: [
    { who: "친구A", text: "야 진짜 박○현 형 출금 보여줬다" },
    { who: "친구B", text: "이번달 240만원 ㄷㄷ" },
    { who: "나",    text: "ㄹㅇ 다들 시작해라", mine: true },
  ]},
];

function SceneKakao({ reduce }: { reduce: boolean }) {
  return (
    <Scene className="bg-gradient-to-b from-background to-amber-500/5">
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-amber-500/40 text-[10px] font-black tracking-[0.3em] text-amber-400 mb-3">
            <MessageCircle className="w-3 h-3" /> 친구·가족 단톡방
          </div>
          <h2 className="font-imperial text-2xl sm:text-3xl break-keep">
            친구들도 이미<br />
            <span className="text-gradient-gold">조용히 시작했습니다</span>
          </h2>
        </div>

        <div className="space-y-3">
          {KAKAO_CHATS.map((c, idx) => (
            <motion.div
              key={c.name}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: idx * 0.1, duration: 0.45 }}
              className="rounded-2xl p-3 bg-yellow-50/95 dark:bg-amber-50/90 border border-amber-200/40 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-xs font-black text-white`}>
                  {c.name[0]}
                </div>
                <div className="text-xs font-bold text-slate-700">{c.name}</div>
              </div>
              <div className="space-y-1.5">
                {c.msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] px-3 py-1.5 rounded-2xl text-[12px] leading-snug break-keep ${
                      m.mine ? "bg-yellow-300 text-slate-900 rounded-br-sm" : "bg-white text-slate-800 rounded-bl-sm border border-slate-200"
                    }`}>
                      {!m.mine && <div className="text-[9px] font-bold text-slate-500 mb-0.5">{m.who}</div>}
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-4 break-keep">
          * 실제 회원 후기 기반 재구성 — 개인정보 보호를 위해 익명 처리
        </p>
      </div>
      <ScrollHint reduce={reduce} />
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

/* ------------------ Scene 6 — FINAL CTA + 완주 보너스 ------------------ */

function SceneFinalCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [seats, setSeats] = useState(347);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const claimedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setSeats((s) => Math.max(7, s - (Math.random() < 0.35 ? 1 : 0))), 2400);
    return () => clearInterval(t);
  }, []);

  // 마지막 씬 도달 시 1회 한정 완주 보너스 자동 청구 (로그인 사용자만)
  useEffect(() => {
    if (!isLoggedIn || claimedRef.current) return;
    const io = new IntersectionObserver(async (entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !claimedRef.current) {
          claimedRef.current = true;
          try {
            const { data, error } = await supabase.rpc("complete_guide_bonus" as any);
            const r = data as any;
            if (!error && r?.ok) {
              setBonusClaimed(true);
              notify.success("🎉 가이드 완주 보너스 +5,000원!", {
                description: "지갑에 즉시 입금되었습니다 · 업적 '가이드 마스터' 획득",
              });
              try { window.dispatchEvent(new Event("wallet:refresh")); } catch {}
            } else if (r?.error === "already_claimed") {
              setBonusClaimed(true);
            }
          } catch {}
        }
      }
    }, { threshold: 0.6 });
    const el = document.getElementById("guide-final-anchor");
    if (el) io.observe(el);
    return () => io.disconnect();
  }, [isLoggedIn]);

  return (
    <Scene className="bg-gradient-to-br from-gold/10 via-background to-primary/10">
      <motion.div
        className="absolute inset-0 bg-gradient-imperial opacity-10"
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <div id="guide-final-anchor" className="relative max-w-md mx-auto w-full text-center">
        <Crown className="w-12 h-12 text-gold mx-auto mb-3 animate-crown" />
        <h2 className="font-imperial text-3xl sm:text-4xl text-gradient-gold leading-tight break-keep">
          오늘 가입하면<br />지급되는 보너스
        </h2>

        {bonusClaimed && isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            완주 보너스 +5,000원 지급 완료
          </motion.div>
        )}

        <div className="glass-strong neon-border rounded-3xl p-5 mt-6 text-left">
          <div className="space-y-2.5 text-sm">
            <RowBonus emoji="💰" label="신규 가입 보너스" value="+3,000원" />
            <RowBonus emoji="🎯" label="첫 미션 완료 보상" value="+2,000원" />
            <RowBonus emoji="🎁" label="가이드 7단계 완주" value="+5,000원" highlight={bonusClaimed} />
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

        <div className="mt-6">
          <DepositCTA />
        </div>

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
