import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowUp, ArrowDown, ShieldCheck, Clock, Crown, Sparkles } from "lucide-react";
import LivePayoutSlaBadge from "@/components/landing/LivePayoutSlaBadge";
import PayoutTicker from "@/components/PayoutTicker";

/**
 * Phase 4 — 씬 2~6 (PROBLEM / SOLUTION / PROOF / PERSONA / PACKAGE).
 * 모든 색은 디자인 토큰만, framer-motion whileInView 사용.
 */

function Scene({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`snap-start min-h-[calc(100vh-56px)] flex flex-col justify-center relative overflow-hidden px-5 py-10 ${className}`}>
      {children}
    </section>
  );
}

/* 씬2 — PROBLEM */
export function SceneProblem() {
  const reduce = useReducedMotion();
  const items = [
    { tag: "주식", loss: "−42%", desc: "1년에 평균 손실 비율 (개인투자자)" },
    { tag: "전세사기", loss: "1.2조원", desc: "2024년 한국 피해액" },
    { tag: "다단계", loss: "98%", desc: "참여자 중 손해 보는 비율" },
  ];
  return (
    <Scene className="bg-gradient-to-b from-background to-destructive/10">
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-destructive/40 text-[10px] font-black tracking-[0.3em] text-destructive mb-3">
            <AlertTriangle className="w-3 h-3" /> 한국인이 매년 잃는 돈
          </div>
          <h2 className="font-imperial text-2xl sm:text-3xl break-keep">
            주식·전세사기·다단계로<br />
            <span className="text-destructive">평생 모은 돈을 잃습니다</span>
          </h2>
        </div>
        <div className="space-y-2.5">
          {items.map((it, i) => (
            <motion.div
              key={it.tag}
              initial={reduce ? false : { opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08 }}
              className="glass-strong rounded-2xl p-4 flex items-center gap-3 border border-destructive/20"
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/15 text-destructive font-display font-black flex items-center justify-center text-xs break-keep">
                {it.tag}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-imperial font-black text-destructive tabular-nums">{it.loss}</div>
                <div className="text-[11px] text-muted-foreground break-keep">{it.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-5 break-keep">
          이제 그만 잃으세요. 다음 화면에서 완전히 다른 길을 보여드립니다.
        </p>
      </div>
    </Scene>
  );
}

/* 씬3 — SOLUTION (60초 군대 배틀 1탭 데모) */
export function SceneSolution() {
  const reduce = useReducedMotion();
  return (
    <Scene className="bg-gradient-to-br from-primary/10 via-background to-secondary/5">
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-primary/40 text-[10px] font-black tracking-[0.3em] text-primary mb-3">
            <Sparkles className="w-3 h-3" /> 60초 군대 배틀
          </div>
          <h2 className="font-imperial text-2xl sm:text-3xl break-keep">
            버튼은 단 2개<br />
            <span className="text-gradient-gold">위 ↑ 또는 아래 ↓</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-2 break-keep">
            비트코인이 오르면 내 군대 승리, 내리면 적 군대 승리. 끝.
          </p>
        </div>

        {/* 2버튼 데모 */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-strong rounded-2xl border border-secondary/40 p-5 text-center"
          >
            <ArrowUp className="w-10 h-10 mx-auto text-secondary" />
            <div className="font-imperial font-black text-xl mt-2 text-secondary">위 ↑</div>
            <div className="text-[11px] text-muted-foreground mt-1 break-keep">오를 거 같으면</div>
          </motion.div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="glass-strong rounded-2xl border border-destructive/40 p-5 text-center"
          >
            <ArrowDown className="w-10 h-10 mx-auto text-destructive" />
            <div className="font-imperial font-black text-xl mt-2 text-destructive">아래 ↓</div>
            <div className="text-[11px] text-muted-foreground mt-1 break-keep">내릴 거 같으면</div>
          </motion.div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground glass rounded-2xl p-3 border border-border">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <span className="break-keep">단 60초만에 결과 확인 — 출퇴근·점심시간에도 1판</span>
        </div>
      </div>
    </Scene>
  );
}

/* 씬4 — PROOF */
export function SceneProof() {
  return (
    <Scene className="bg-gradient-to-b from-background to-emerald-500/5">
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-emerald-500/40 text-[10px] font-black tracking-[0.3em] text-emerald-400 mb-3">
            <ShieldCheck className="w-3 h-3" /> 실시간 증명
          </div>
          <h2 className="font-imperial text-2xl sm:text-3xl break-keep">
            지금도 출금되고 있습니다<br />
            <span className="text-gradient-gold">운영자 무손실 인장</span>
          </h2>
        </div>
        <div className="space-y-3">
          <LivePayoutSlaBadge />
          <PayoutTicker />
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-4 break-keep">
          평균 출금 처리 23분 · 2단계 인증(OTP) 필수 · 사업자 정식 등록
        </p>
      </div>
    </Scene>
  );
}

/* 씬5 — PERSONA */
export function ScenePersona() {
  const reduce = useReducedMotion();
  const personas = [
    { age: "20대", emoji: "💼", title: "직장 새내기", line: "퇴근 후 60초로 월 80만원" },
    { age: "40대", emoji: "👨‍👩‍👧", title: "가장 · 자영업자", line: "주식 손실 회복 + 부수입" },
    { age: "60대", emoji: "🌸", title: "주부 · 사업자", line: "예금 이자보다 빠른 손주 용돈" },
  ];
  return (
    <Scene>
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <h2 className="font-imperial text-2xl sm:text-3xl break-keep">
            당신과 같은 사람도<br />
            <span className="text-gradient-primary">이미 제국을 쌓고 있습니다</span>
          </h2>
        </div>
        <div className="space-y-2.5">
          {personas.map((p, i) => (
            <motion.div
              key={p.age}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08 }}
              className="glass-strong rounded-2xl p-4 flex items-center gap-4 border border-primary/15"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center text-3xl shrink-0">
                {p.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-widest font-black text-primary">{p.age}</div>
                <div className="font-bold text-sm break-keep">{p.title}</div>
                <div className="text-xs text-muted-foreground break-keep">{p.line}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Scene>
  );
}

/* 씬6 — PACKAGE */
export function ScenePackage() {
  return (
    <Scene className="bg-gradient-to-br from-gold/10 via-background to-primary/10">
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/40 text-[10px] font-black tracking-[0.3em] text-gold mb-3">
            <Crown className="w-3 h-3" /> 제국 군주 패키지
          </div>
          <h2 className="font-imperial text-2xl sm:text-3xl break-keep">
            패키지 1회로<br />
            <span className="text-gradient-gold">모든 미션이 자동 완료</span>
          </h2>
        </div>

        <div className="glass-strong rounded-3xl p-5 border border-gold/40 space-y-3">
          <Row icon="💎" title="손실 자동 보상" sub="군대 배틀 패배 시 일정 비율 자동 환급" />
          <Row icon="⚡" title="보상 가속" sub="모든 미션 보상 최대 4배 가속" />
          <Row icon="👑" title="우선 출금" sub="평균 23분 → 최대 5분 이내 처리" />
          <Row icon="🎁" title="VIP 룰렛" sub="최대 100만원 + 메가 잭팟 1탭" />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 break-keep">
          50,000원부터 시작 · 입금 즉시 적용
        </p>
      </div>
    </Scene>
  );
}

function Row({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold break-keep">{title}</div>
        <div className="text-[11px] text-muted-foreground break-keep">{sub}</div>
      </div>
    </div>
  );
}
