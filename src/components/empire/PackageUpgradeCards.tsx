import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Crown, Lock, Sparkles, TrendingUp, Shield, Zap, ChevronUp, HelpCircle, Table2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingList } from "@/components/ui/loading-state";
import { notify } from "@/lib/notify";
import TierBenefitMatrix, { type MatrixTier } from "./TierBenefitMatrix";

type EmpireUnit = {
  id: string;
  tier: string;
  level: number;
  xp: number;
  stats: Record<string, any> | null;
  acquired_at: string;
};

type TierMeta = {
  key: string;
  name: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary" | "Mythic";
  rarityKo: string;
  step: number;
  emblem: string;
  color: string;
  glow: string;
  territoryBonus: number;
  recoveryBonus: number;
  /** 일상어 혜택 3줄 — 한눈에 이득이 보이게 */
  benefits: string[];
  /** 잠금 카드 해금 안내 */
  unlockHint: string;
  /** 잠금 카드의 패키지 CTA (없으면 일반 패키지 페이지) */
  unlockCta?: { label: string; focus?: string };
  vipRoulette: boolean;
  priorityWithdraw: boolean;
};

const TIERS: TierMeta[] = [
  {
    key: "free",
    name: "신병 군주",
    rarity: "Common",
    rarityKo: "기본",
    step: 1,
    emblem: "⚔️",
    color: "from-muted/30 to-muted/10",
    glow: "shadow-none",
    territoryBonus: 1,
    recoveryBonus: 5,
    benefits: [
      "손실 5% 자동 보상",
      "보상 가속 +1%",
      "가입 즉시 자동 지급",
    ],
    unlockHint: "가입 즉시 자동 지급",
    vipRoulette: false,
    priorityWithdraw: false,
  },
  {
    key: "easy_starter",
    name: "이지 스타터",
    rarity: "Rare",
    rarityKo: "희귀",
    step: 2,
    emblem: "🛡️",
    color: "from-primary/20 to-primary/5",
    glow: "shadow-[0_0_20px_-8px_hsl(var(--primary)/0.4)]",
    territoryBonus: 3,
    recoveryBonus: 15,
    benefits: [
      "손실 15% 자동 보상",
      "보상 가속 +3%",
      "첫 입금 보너스 즉시 적용",
    ],
    unlockHint: "스타터 패키지 입금 시 자동 지급",
    unlockCta: { label: "스타터 패키지 보기", focus: "easy_starter" },
    vipRoulette: false,
    priorityWithdraw: false,
  },
  {
    key: "easy_50",
    name: "이지 50",
    rarity: "Rare",
    rarityKo: "희귀",
    step: 3,
    emblem: "🏹",
    color: "from-primary/30 to-accent/10",
    glow: "shadow-[0_0_24px_-6px_hsl(var(--primary)/0.5)]",
    territoryBonus: 6,
    recoveryBonus: 25,
    benefits: [
      "손실 25% 자동 보상",
      "보상 가속 +6%",
      "길드 보상 +10%",
    ],
    unlockHint: "50만원 패키지로 자동 지급",
    unlockCta: { label: "50만원 패키지 보기", focus: "easy_50" },
    vipRoulette: false,
    priorityWithdraw: false,
  },
  {
    key: "easy_150",
    name: "이지 150",
    rarity: "Epic",
    rarityKo: "에픽",
    step: 4,
    emblem: "🦅",
    color: "from-accent/30 to-primary/15",
    glow: "shadow-[0_0_28px_-4px_hsl(var(--accent)/0.55)]",
    territoryBonus: 10,
    recoveryBonus: 40,
    benefits: [
      "손실 40% 자동 보상",
      "보상 가속 +10%",
      "VIP 골드 룰렛 입장권",
    ],
    unlockHint: "150만원 패키지로 자동 지급",
    unlockCta: { label: "150만원 패키지 보기", focus: "easy_150" },
    vipRoulette: true,
    priorityWithdraw: false,
  },
  {
    key: "empire",
    name: "제국 군주",
    rarity: "Legendary",
    rarityKo: "전설",
    step: 5,
    emblem: "👑",
    color: "from-gold/40 to-primary/15",
    glow: "shadow-[0_0_36px_-4px_hsl(var(--gold)/0.55)] glow-gold",
    territoryBonus: 15,
    recoveryBonus: 60,
    benefits: [
      "손실 60% 자동 보상",
      "보상 가속 +15%",
      "매일 무료 골드 룰렛 1회",
    ],
    unlockHint: "Empire 패키지로 자동 지급",
    unlockCta: { label: "Empire 패키지 보기", focus: "empire" },
    vipRoulette: true,
    priorityWithdraw: true,
  },
  {
    key: "empire_elite",
    name: "제국 엘리트",
    rarity: "Legendary",
    rarityKo: "전설",
    step: 6,
    emblem: "🐉",
    color: "from-gold/50 to-destructive/20",
    glow: "shadow-[0_0_40px_-2px_hsl(var(--gold)/0.7)] glow-gold",
    territoryBonus: 22,
    recoveryBonus: 80,
    benefits: [
      "손실 80% 자동 보상",
      "보상 가속 +22%",
      "출금 우선 처리 + 길드 보상 2배",
    ],
    unlockHint: "Elite 패키지로 자동 지급",
    unlockCta: { label: "Elite 패키지 보기", focus: "empire_elite" },
    vipRoulette: true,
    priorityWithdraw: true,
  },
  {
    key: "phantom",
    name: "팬텀 황제",
    rarity: "Mythic",
    rarityKo: "신화",
    step: 7,
    emblem: "🌌",
    color: "from-destructive/40 via-gold/40 to-primary/30",
    glow: "shadow-[0_0_50px_0px_hsl(var(--gold)/0.8)] glow-gold",
    territoryBonus: 35,
    recoveryBonus: 100,
    benefits: [
      "손실 100% 자동 보상 (전액)",
      "보상 가속 +35%",
      "명예의 전당 자동 등록 · 모든 혜택 최대",
    ],
    unlockHint: "Phantom 한정 패키지로 자동 지급",
    unlockCta: { label: "Phantom 패키지 보기", focus: "phantom" },
    vipRoulette: true,
    priorityWithdraw: true,
  },
];

const RARITY_BADGE: Record<TierMeta["rarity"], string> = {
  Common: "bg-muted/40 text-muted-foreground",
  Rare: "bg-primary/20 text-primary",
  Epic: "bg-accent/20 text-accent",
  Legendary: "bg-gold/20 text-gold",
  Mythic: "bg-gradient-to-r from-destructive/30 to-gold/30 text-gold",
};

const MATRIX_TIERS: MatrixTier[] = TIERS.map((t) => ({
  key: t.key,
  name: t.name,
  emblem: t.emblem,
  rarityKo: t.rarityKo,
  step: t.step,
  recoveryBonus: t.recoveryBonus,
  territoryBonus: t.territoryBonus,
  vipRoulette: t.vipRoulette,
  priorityWithdraw: t.priorityWithdraw,
}));

export default function PackageUpgradeCards() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState<EmpireUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [evolving, setEvolving] = useState<string | null>(null);
  const [evolvedFlash, setEvolvedFlash] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const ownedByTier = useMemo(() => {
    const m: Record<string, EmpireUnit> = {};
    units.forEach((u) => (m[u.tier] = u));
    return m;
  }, [units]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("empire_units")
      .select("id, tier, level, xp, stats, acquired_at")
      .eq("user_id", user.id)
      .order("acquired_at", { ascending: true });
    setUnits((data ?? []) as EmpireUnit[]);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, [user?.id]);

  async function handleEvolve(unitId: string, tierKey: string) {
    setEvolving(unitId);
    const { error, data } = await supabase.rpc("evolve_empire_unit", { _unit_id: unitId });
    setEvolving(null);
    if (error) {
      if (error.message.includes("insufficient_xp")) {
        notify.error("진화점수 부족", { description: "100점을 모은 뒤 다시 시도하세요" });
      } else {
        notify.error(`진화 실패: ${error.message}`);
      }
      return;
    }
    const newLevel = (data as any)?.level ?? "?";
    notify.success(`🔥 단계 업!`, { description: `LV.${newLevel} 도달 — 혜택이 강화됩니다` });
    setEvolvedFlash(tierKey);
    setTimeout(() => setEvolvedFlash(null), 1800);
    void load();
  }

  function goToPackage(focus?: string) {
    navigate(focus ? `/packages?focus=${focus}` : "/packages");
  }

  if (loading) {
    return (
      <div className="mb-6">
        <LoadingList rows={4} rowHeight="lg" />
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* ── 한눈에 정체/혜택을 알리는 헤더 ─────────────── */}
      <div className="glass-strong rounded-2xl p-4 sm:p-5 mb-4 border border-gold/20">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-imperial font-black text-xl sm:text-2xl text-gradient-gold flex items-center gap-2">
              <Crown className="w-6 h-6 text-gold" /> 제국 군주 카드
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">— 내 혜택 등급</span>
            </h2>
            <p className="text-xs sm:text-sm text-foreground/85 mt-1.5 leading-snug break-keep">
              입금하면 자동 지급되는 <b className="text-gold">"혜택 등급 카드"</b>입니다.
              등급이 오를수록 <b>손실 보험 · 보상 가속 · VIP 혜택</b>이 강해집니다.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-muted-foreground">보유 카드</div>
            <div className="font-imperial font-black text-xl text-gold tabular-nums">
              {units.length}/{TIERS.length}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass hover:bg-muted/30 transition-colors"
            aria-expanded={helpOpen}
          >
            <HelpCircle className="w-3.5 h-3.5" /> 자주 묻는 질문
          </button>

          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors font-bold"
              >
                <Table2 className="w-3.5 h-3.5" /> 등급 비교 한 장으로 보기
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="font-imperial text-gradient-gold flex items-center gap-2">
                  <Crown className="w-5 h-5 text-gold" /> 단계별 혜택 비교
                </DialogTitle>
              </DialogHeader>
              <TierBenefitMatrix tiers={MATRIX_TIERS} />
            </DialogContent>
          </Dialog>
        </div>

        {helpOpen && (
          <div className="mt-3 space-y-2 text-xs sm:text-sm border-t border-border/40 pt-3 animate-fade-in">
            <div>
              <div className="font-bold text-gold">Q. 카드는 어디서 받나요?</div>
              <p className="text-foreground/80 mt-0.5 break-keep">
                패키지를 1회 입금하면 해당 등급 카드가 <b>자동 지급</b>됩니다.
                이후 미션·전투 보상으로 <b>100점(진화점수)</b>이 모이면 다음 단계로 강화됩니다.
              </p>
            </div>
            <div>
              <div className="font-bold text-gold">Q. 추가 비용이 드나요?</div>
              <p className="text-foreground/80 mt-0.5 break-keep">
                아니요. 카드는 상품이 아니라 <b>"혜택 등급"</b>입니다.
                별도 비용 없이 자동으로 강화되고, 강해질수록 손실 보상·보상 가속·VIP 혜택이 늘어납니다.
              </p>
            </div>
            <div>
              <div className="font-bold text-gold">Q. 손실이 자동 보상된다는 게 무슨 뜻인가요?</div>
              <p className="text-foreground/80 mt-0.5 break-keep">
                전투에서 손실이 발생하면, 카드 등급에 따라 일부 금액이 <b>보험금으로 자동 환급</b>됩니다.
                예) 제국 군주(60%) = 손실 1만원 → 6,000원 자동 환급.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 카드 그리드 ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TIERS.map((t, idx) => {
          const owned = ownedByTier[t.key];
          const xpPct = owned ? Math.min(100, (owned.xp / 100) * 100) : 0;
          const canEvolve = owned ? owned.xp >= 100 && owned.level < 100 : false;
          const isEvolving = owned ? evolving === owned.id : false;
          const flashed = evolvedFlash === t.key;

          return (
            <motion.div
              key={t.key}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: flashed ? [1, 1.06, 1] : 1,
              }}
              transition={{ delay: idx * 0.04, scale: { duration: 1.2 } }}
              className="relative"
            >
              <Card
                className={`relative overflow-hidden border-2 p-0 bg-gradient-to-br ${t.color} ${
                  owned ? `border-gold/30 ${t.glow}` : "border-border/30 opacity-90"
                } ${flashed ? "border-gold animate-pulse" : ""}`}
              >
                {/* Locked overlay */}
                {!owned && (
                  <div className="absolute top-2 right-2 z-10 rounded-full bg-background/70 backdrop-blur-md p-1.5">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}

                {/* Rarity + step badge */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${RARITY_BADGE[t.rarity]}`}
                  >
                    {t.rarityKo} · {t.rarity}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-background/60 backdrop-blur text-foreground/80">
                    {t.step}/{TIERS.length}단계
                  </span>
                </div>

                {/* Emblem */}
                <div className="relative h-32 grid place-items-center overflow-hidden">
                  <motion.div
                    animate={
                      owned
                        ? { y: [0, -6, 0], rotate: flashed ? [0, -12, 12, 0] : 0 }
                        : {}
                    }
                    transition={{ duration: flashed ? 1.4 : 3, repeat: flashed ? 0 : Infinity }}
                    className="text-7xl drop-shadow-2xl"
                    style={{
                      filter: owned ? "drop-shadow(0 0 16px hsl(var(--gold)/0.5))" : "grayscale(0.6)",
                    }}
                  >
                    {t.emblem}
                  </motion.div>
                  <AnimatePresence>
                    {flashed && (
                      <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <motion.span
                            key={i}
                            className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full bg-gold"
                            initial={{ x: 0, y: 0, opacity: 1 }}
                            animate={{
                              x: Math.cos((i / 14) * Math.PI * 2) * 80,
                              y: Math.sin((i / 14) * Math.PI * 2) * 80,
                              opacity: 0,
                            }}
                            transition={{ duration: 1.2, delay: i * 0.02 }}
                            style={{ boxShadow: "0 0 8px hsl(var(--gold))" }}
                          />
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Content */}
                <div className="p-4 pt-2 space-y-3">
                  <div>
                    <div className="font-imperial font-black text-lg break-keep">{t.name}</div>
                    {/* 일상어 혜택 3줄 */}
                    <ul className="mt-1.5 space-y-1">
                      {t.benefits.map((b, i) => (
                        <li key={i} className="text-xs sm:text-[13px] text-foreground/90 flex items-start gap-1.5 break-keep">
                          <span className="text-gold font-black mt-0.5 shrink-0">✓</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 수치 미리보기 — 일상어 라벨 */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="glass rounded-lg px-2 py-1.5 flex items-center gap-1.5" title="손실이 났을 때 보험금으로 자동 환급되는 비율">
                      <Shield className="w-3.5 h-3.5 text-gold shrink-0" />
                      <div className="min-w-0">
                        <div className="text-muted-foreground text-[10px]">손실 보상</div>
                        <div className="font-black text-gold tabular-nums">{t.recoveryBonus}%</div>
                      </div>
                    </div>
                    <div className="glass rounded-lg px-2 py-1.5 flex items-center gap-1.5" title="미션·전투 보상이 추가로 늘어나는 비율">
                      <TrendingUp className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-muted-foreground text-[10px]">보상 가속</div>
                        <div className="font-black text-secondary tabular-nums">+{t.territoryBonus}%</div>
                      </div>
                    </div>
                  </div>

                  {/* 진행도 / 잠금 CTA */}
                  {owned ? (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">단계</span>
                        <span className="font-imperial font-black text-base text-gold tabular-nums">
                          LV.{owned.level}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Zap className="w-3 h-3" /> 진화점수
                          </span>
                          <span className="tabular-nums">{owned.xp}/100</span>
                        </div>
                        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-gold"
                            initial={{ width: 0 }}
                            animate={{ width: `${xpPct}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                      </div>
                      <button
                        disabled={!canEvolve || isEvolving}
                        onClick={() => handleEvolve(owned.id, t.key)}
                        title="단계가 오르면 혜택이 강해집니다"
                        className={`w-full py-2.5 rounded-xl font-imperial font-black text-sm transition-all ${
                          canEvolve
                            ? "bg-gradient-gold text-gold-foreground hover:scale-[1.02] glow-gold"
                            : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                        }`}
                      >
                        {isEvolving ? (
                          <span className="flex items-center justify-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 animate-spin" /> 강화 중...
                          </span>
                        ) : canEvolve ? (
                          <span className="flex items-center justify-center gap-1">
                            <ChevronUp className="w-4 h-4" /> 단계 업 (진화점수 100)
                          </span>
                        ) : (
                          `진화점수 ${owned.xp}/100 모으는 중`
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gold/40 p-3 text-center space-y-2">
                      <div className="text-[11px] text-muted-foreground break-keep">{t.unlockHint}</div>
                      {t.unlockCta ? (
                        <button
                          type="button"
                          onClick={() => goToPackage(t.unlockCta!.focus)}
                          className="w-full inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 transition-colors text-xs font-black"
                        >
                          {t.unlockCta.label} <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="text-[11px] font-black text-gold/70">가입 즉시 자동 지급</div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
