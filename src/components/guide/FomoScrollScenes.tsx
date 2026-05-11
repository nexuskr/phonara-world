import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowUp, ArrowDown, ShieldCheck, Clock, Crown, Sparkles, Swords } from "lucide-react";
import LivePayoutSlaBadge from "@/components/landing/LivePayoutSlaBadge";
import PayoutTicker from "@/components/PayoutTicker";
import { GoldNebulaBg, ParticleField, AnimatedCounter, GoldDivider, ImperialSeal, senior } from "./EmpireFX";

/**
 * Phase 4 / 영화급 — 씬2~6.
 * Gold & Dark Empire 1픽셀 불변 · 디자인 토큰만 · whileInView 모션.
 */

function Scene({ children, className = "", large = false }: { children: React.ReactNode; className?: string; large?: boolean }) {
  return (
    <section
      data-large={large}
      className={`snap-start snap-always min-h-[calc(100dvh-56px)] flex flex-col justify-center relative overflow-hidden px-5 py-12 ${className}`}
    >
      {children}
    </section>
  );
}

/* ───────────────── 씬2 — PROBLEM ───────────────── */
export function SceneProblem({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();
  const items = [
    { tag: "주식", val: 42, suffix: "%", prefix: "−", desc: "개인투자자 1년 평균 손실률" },
    { tag: "전세사기", val: 1.2, suffix: "조원", prefix: "", desc: "2024년 한국 피해액" },
    { tag: "다단계", val: 98, suffix: "%", prefix: "", desc: "참여자 중 손해 보는 비율" },
  ];
  return (
    <Scene large={large}>
      <GoldNebulaBg tone="danger" />
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-destructive/50 text-[10px] font-black tracking-[0.3em] text-destructive mb-4">
            <AlertTriangle className="w-3 h-3 animate-pulse" /> 한국인이 매년 잃는 돈
          </div>
          <h2 className={`font-imperial text-3xl sm:text-4xl break-keep leading-[1.15] ${senior.h2}`}>
            주식·전세사기·다단계로<br />
            <span className="text-destructive drop-shadow-[0_0_18px_hsl(var(--destructive)/0.5)]">평생 모은 돈을 잃습니다</span>
          </h2>
        </div>

        <div className="space-y-3">
          {items.map((it, i) => (
            <motion.div
              key={it.tag}
              initial={reduce ? false : { opacity: 0, x: -28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.55 }}
              className="glass-strong rounded-2xl p-4 flex items-center gap-3 border border-destructive/25"
            >
              <div className="w-14 h-14 rounded-xl bg-destructive/15 text-destructive font-display font-black flex items-center justify-center text-xs break-keep">
                {it.tag}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-3xl font-imperial font-black text-destructive">
                  <AnimatedCounter to={it.val} prefix={it.prefix} suffix={it.suffix} duration={1.4} format={(v) => (it.val < 10 ? v.toFixed(1) : v.toLocaleString())} />
                </div>
                <div className={`text-[11px] text-muted-foreground break-keep ${senior.body}`}>{it.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <GoldDivider />
        <p className={`text-center text-sm text-gold break-keep font-bold ${senior.body}`}>
          이제 그만 잃으세요. 다음 화면에서 완전히 다른 길을 보여드립니다 ↓
        </p>
      </div>
    </Scene>
  );
}

/* ───────────────── 씬3 — SOLUTION (SVG 군대 배틀) ───────────────── */
function SoldierRow({ side, count = 5 }: { side: "left" | "right"; count?: number }) {
  const color = side === "left" ? "hsl(var(--gold))" : "hsl(var(--destructive))";
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => (
        <g key={i} transform={`translate(${i * 16}, 0)`}>
          <circle cx="8" cy="8" r="5" fill={color} opacity={0.95} />
          <rect x="5" y="13" width="6" height="14" rx="2" fill={color} opacity={0.9} />
          <rect x="3" y="14" width="2" height="9" rx="1" fill={color} opacity={0.8} />
          <rect x="11" y="14" width="2" height="9" rx="1" fill={color} opacity={0.8} />
        </g>
      ))}
    </g>
  );
}

export function SceneSolution({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <Scene large={large}>
      <GoldNebulaBg tone="gold" />
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/50 text-[10px] font-black tracking-[0.3em] text-gold mb-3">
            <Swords className="w-3 h-3" /> 60초 군대 배틀
          </div>
          <h2 className={`font-imperial text-3xl sm:text-4xl break-keep leading-[1.15] ${senior.h2}`}>
            버튼은 단 2개<br />
            <span className="text-gradient-gold drop-shadow-[0_0_18px_hsl(var(--gold)/0.5)]">위 ↑ 또는 아래 ↓</span>
          </h2>
          <p className={`text-sm text-muted-foreground mt-2 break-keep ${senior.body}`}>
            오르면 내 군대 승리, 내리면 적 군대 승리. 끝.
          </p>
        </div>

        {/* SVG 군대 데모 */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative glass-strong rounded-2xl border border-gold/30 p-4 mb-4 overflow-hidden"
        >
          <svg viewBox="0 0 320 90" className="w-full h-24">
            {/* 좌측 군대 (gold) — 진격 */}
            <motion.g
              initial={reduce ? false : { x: 0 }}
              animate={reduce ? undefined : { x: [0, 60, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <SoldierRow side="left" />
            </motion.g>
            {/* 우측 군대 (red) — 후퇴 */}
            <motion.g
              transform="translate(220, 55)"
              initial={reduce ? false : { x: 0 }}
              animate={reduce ? undefined : { x: [0, 40, 0], opacity: [1, 0.4, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <SoldierRow side="right" />
            </motion.g>
            {/* 가운데 ↑ 화살표 폭발 */}
            <motion.g
              transform="translate(160, 45)"
              animate={reduce ? undefined : { scale: [0.8, 1.4, 0.8], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <polygon points="0,-12 -10,8 10,8" fill="hsl(var(--gold))" />
              <circle r="22" fill="none" stroke="hsl(var(--gold))" strokeWidth="1.5" opacity="0.4" />
            </motion.g>
            {/* 좌측 군대 위치 그룹 */}
            <g transform="translate(20, 55)">
              <SoldierRow side="left" />
            </g>
          </svg>
          <div className="text-center text-[10px] text-muted-foreground tracking-widest mt-1">DEMO · 실제 결과 60초 후</div>
        </motion.div>

        {/* 2 버튼 데모 */}
        <div className="grid grid-cols-2 gap-3">
          <div data-large={large} className={`pointer-events-none glass-strong rounded-2xl border-2 border-gold/50 p-5 text-center min-h-[112px] flex flex-col justify-center ${senior.btn}`}>
            <ArrowUp className="w-12 h-12 mx-auto text-gold" />
            <div className="font-imperial font-black text-2xl mt-1 text-gold">위 ↑</div>
            <div className={`text-[11px] text-muted-foreground mt-1 break-keep ${senior.body}`}>오를 거 같으면</div>
          </div>
          <div data-large={large} className={`pointer-events-none glass-strong rounded-2xl border-2 border-destructive/50 p-5 text-center min-h-[112px] flex flex-col justify-center ${senior.btn}`}>
            <ArrowDown className="w-12 h-12 mx-auto text-destructive" />
            <div className="font-imperial font-black text-2xl mt-1 text-destructive">아래 ↓</div>
            <div className={`text-[11px] text-muted-foreground mt-1 break-keep ${senior.body}`}>내릴 거 같으면</div>
          </div>
        </div>

        <div className={`mt-5 flex items-center gap-2 text-xs text-muted-foreground glass rounded-2xl p-3 border border-gold/20 ${senior.body}`}>
          <Clock className="w-4 h-4 text-gold shrink-0" />
          <span className="break-keep">60초 후 결과 확인 · 출퇴근·점심시간에도 1판</span>
        </div>
      </div>
    </Scene>
  );
}

/* ───────────────── 씬4 — PROOF (운영자 무손실 인장) ───────────────── */
export function SceneProof({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <Scene large={large}>
      <GoldNebulaBg tone="emerald" />
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-emerald-500/50 text-[10px] font-black tracking-[0.3em] text-emerald-400 mb-3">
            <ShieldCheck className="w-3 h-3" /> 실시간 증명
          </div>
          <h2 className={`font-imperial text-3xl sm:text-4xl break-keep leading-[1.15] ${senior.h2}`}>
            지금도 출금되고 있습니다<br />
            <span className="text-gradient-gold">운영자 무손실 인장</span>
          </h2>
        </div>

        {/* 거대 골드 인장 */}
        <div className="relative mx-auto w-44 h-44 mb-6">
          {!reduce && (
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              style={{ background: "conic-gradient(from 0deg, hsl(var(--gold)/0.0), hsl(var(--gold)/0.7), hsl(var(--gold)/0.0))" }}
            />
          )}
          <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center border-2 border-gold/70 shadow-[0_0_40px_hsl(var(--gold)/0.45)]">
            <div className="text-center">
              <Crown className="w-7 h-7 mx-auto text-gold" />
              <div className="font-imperial text-[11px] tracking-[0.25em] text-gold mt-1">GUARANTEED</div>
              <div className={`font-imperial text-base text-gradient-gold leading-tight mt-0.5`}>운영자<br />무손실</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <LivePayoutSlaBadge />
          <PayoutTicker />
        </div>
        <p className={`text-center text-xs text-muted-foreground mt-5 break-keep ${senior.body}`}>
          평균 출금 23분 · OTP 2단계 인증 필수 · 사업자 정식 등록
        </p>
      </div>
    </Scene>
  );
}

/* ───────────────── 씬5 — PERSONA ───────────────── */
export function ScenePersona({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();
  const personas = [
    { age: "20대", emoji: "💼", title: "직장 새내기 김○준 (28)", line: "퇴근 후 60초로 지난달 +84만원" },
    { age: "40대", emoji: "👨‍👩‍👧", title: "자영업 이○호 (45)", line: "주식 손실 회복 + 부수입 +210만원" },
    { age: "60대", emoji: "🌸", title: "주부 박○자 (63)", line: "예금 이자보다 빠른 손주 용돈" },
  ];
  return (
    <Scene large={large}>
      <GoldNebulaBg tone="cyber" />
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-7">
          <h2 className={`font-imperial text-3xl sm:text-4xl break-keep leading-[1.15] ${senior.h2}`}>
            당신과 같은 사람이<br />
            <span className="text-gradient-gold drop-shadow-[0_0_18px_hsl(var(--gold)/0.45)]">이미 제국을 쌓고 있습니다</span>
          </h2>
        </div>

        <div className="space-y-3">
          {personas.map((p, i) => (
            <motion.div
              key={p.age}
              initial={reduce ? false : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.55 }}
              className="relative glass-strong rounded-2xl p-4 flex items-center gap-4 border border-gold/25 overflow-hidden"
            >
              {!reduce && (
                <motion.div
                  className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-gold/15 to-transparent pointer-events-none"
                  animate={{ x: ["0%", "320%"] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: i * 0.4 }}
                />
              )}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/25 to-accent/15 flex items-center justify-center text-3xl shrink-0 ring-2 ring-gold/60 shadow-[0_0_16px_hsl(var(--gold)/0.35)]">
                {p.emoji}
              </div>
              <div className="flex-1 min-w-0 relative">
                <div className="text-[10px] tracking-widest font-black text-gold">{p.age}</div>
                <div className={`font-bold text-sm break-keep ${senior.body}`}>{p.title}</div>
                <div className={`text-xs text-muted-foreground break-keep ${senior.body}`}>{p.line}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Scene>
  );
}

/* ───────────────── 씬6 — PACKAGE (EmpireMonarch) ───────────────── */
export function ScenePackage({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();
  const perks = [
    { icon: "💎", title: "손실 자동 보상 (Recovery)", sub: "군대 배틀 패배 시 일정 비율 자동 환급", boom: true },
    { icon: "⚡", title: "보상 4배 가속", sub: "모든 미션 보상 최대 4배 가속" },
    { icon: "👑", title: "우선 출금", sub: "평균 23분 → 최대 5분 이내 처리" },
    { icon: "🎁", title: "VIP 룰렛", sub: "최대 100만원 + 메가 잭팟 1탭" },
  ];
  return (
    <Scene large={large}>
      <GoldNebulaBg tone="gold" />
      <ParticleField density={10} />
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/60 text-[10px] font-black tracking-[0.3em] text-gold mb-3 shadow-[0_0_14px_hsl(var(--gold)/0.4)]">
            <Crown className="w-3 h-3" /> 제국 군주 패키지
          </div>
          <h2 className={`font-imperial text-3xl sm:text-4xl break-keep leading-[1.15] ${senior.h2}`}>
            패키지 1회로<br />
            <span className="text-gradient-gold drop-shadow-[0_0_18px_hsl(var(--gold)/0.55)]">모든 미션이 자동 완료</span>
          </h2>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative rounded-3xl p-[2px] bg-gradient-imperial shadow-[0_0_40px_hsl(var(--gold)/0.35)]"
        >
          <div className="rounded-3xl bg-card/95 backdrop-blur p-5 space-y-3 border border-gold/40">
            {/* 코너 crown */}
            <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 text-gold drop-shadow-[0_0_10px_hsl(var(--gold)/0.8)]" />

            <div className="text-center mb-2">
              <div className="text-[10px] tracking-widest font-black text-gold/80">EMPIRE MONARCH</div>
              <div className={`font-imperial text-3xl text-gradient-gold ${senior.h2}`}>50,000원~</div>
              <div className={`text-[11px] text-muted-foreground ${senior.body}`}>입금 즉시 적용 · 모든 혜택 자동</div>
            </div>

            {perks.map((p, i) => (
              <motion.div
                key={p.title}
                initial={reduce ? false : { opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: i * 0.08 }}
                className={`relative flex items-center gap-3 rounded-xl p-2 ${p.boom ? "border border-gold/30 bg-gold/5" : ""}`}
              >
                <div className="text-2xl shrink-0">{p.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold break-keep ${senior.body}`}>{p.title}</div>
                  <div className={`text-[11px] text-muted-foreground break-keep ${senior.body}`}>{p.sub}</div>
                </div>
                {p.boom && !reduce && (
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    animate={{ boxShadow: ["0 0 0px hsl(var(--gold)/0)", "0 0 22px hsl(var(--gold)/0.55)", "0 0 0px hsl(var(--gold)/0)"] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className={`text-center text-xs text-muted-foreground mt-4 break-keep ${senior.body}`}>
          <Sparkles className="inline w-3 h-3 text-gold" /> 50,000원부터 시작 · 입금 즉시 적용
        </p>
      </div>
    </Scene>
  );
}
