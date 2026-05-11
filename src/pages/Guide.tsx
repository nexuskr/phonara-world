import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { ShieldCheck, Crown, Sparkles, Lock, Wallet as WalletIcon, BookOpen, Trophy, Zap, Coins, ArrowLeftRight, Star, CheckCircle2, GraduationCap, Gift, ArrowRight, Share2, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { assertRateLimit, RL_WALLET } from "@/lib/rateLimit";
import { useDB } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import EarningsSimulator from "@/components/guide/EarningsSimulator";
import TrustCounter from "@/components/guide/TrustCounter";
import RecoveryBonusCalculator from "@/components/guide/RecoveryBonusCalculator";
import AMLGate from "@/components/wallet/AMLGate";
import { AML_TIERS, currentTierByVerificationLevel } from "@/lib/aml-tiers";

type Tab = "starter" | "principles" | "tier" | "jackpot" | "wallet";
type StepKey = "step1" | "step2" | "step3" | "step4" | "step5" | "step6";
const STEP_KEYS: StepKey[] = ["step1", "step2", "step3", "step4", "step5", "step6"];
const VALID_TABS: Tab[] = ["starter", "principles", "tier", "jackpot", "wallet"];

export default function Guide() {
  const { t } = useTranslation("guide");
  const [db] = useDB();
  const isLoggedIn = !!db.user?.id;
  const [params, setParams] = useSearchParams();
  const urlTab = params.get("tab") as Tab | null;
  const initialTab: Tab = urlTab && VALID_TABS.includes(urlTab) ? urlTab : (isLoggedIn ? "principles" : "starter");
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (urlTab && VALID_TABS.includes(urlTab) && urlTab !== tab) setTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  const onTab = (id: Tab) => {
    setTab(id);
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: true });
  };

  const tabs = [
    { id: "starter" as const, l: t("tabStarter"), i: GraduationCap },
    { id: "principles" as const, l: t("tabPrinciples"), i: ShieldCheck },
    { id: "tier" as const, l: t("tabTier"), i: Crown },
    { id: "jackpot" as const, l: t("tabJackpot"), i: Trophy },
    { id: "wallet" as const, l: t("tabWallet"), i: WalletIcon },
  ];

  return (
    <Layout>
      <div className="container pt-6 pb-32 animate-liquid-in">
        <h1 className="font-imperial font-black text-2xl flex items-center gap-2 mb-1 break-keep">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-gradient-primary">제국 건설 6단계 가이드</span>
        </h1>
        <p className="text-xs text-muted-foreground mb-4 break-keep">3분 만에 첫 수익을 경험하세요.</p>

        <div className="grid grid-cols-5 gap-1.5 mb-5">
          {tabs.map((tt) => {
            const Icon = tt.i;
            return (
              <button key={tt.id} onClick={() => onTab(tt.id)}
                className={`flex flex-col items-center gap-1 min-h-[56px] py-3 rounded-xl text-[10px] font-bold tracking-[0.06em] break-keep transition ${tab === tt.id ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass text-muted-foreground"}`}>
                <Icon className="w-4 h-4" /> {tt.l}
              </button>
            );
          })}
        </div>

        {tab === "starter" && <StarterGuide t={t} />}
        {tab === "principles" && <Principles t={t} />}
        {tab === "tier" && <TierGuide t={t} />}
        {tab === "jackpot" && <JackpotGuide t={t} />}
        {tab === "wallet" && <WalletGuide t={t} />}
      </div>
    </Layout>
  );
}

function StarterGuide({ t }: any) {
  const [db] = useDB();
  const isLoggedIn = !!db.user?.id;
  const [steps, setSteps] = useState<Record<string, boolean>>({});
  const [bonusPaid, setBonusPaid] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // STEP5: AML 현재 인증 레벨
  const [amlLevel, setAmlLevel] = useState<number>(0);
  const [previewLevel, setPreviewLevel] = useState<1 | 2 | 3 | null>(null);

  // STEP6: 추천인 정보 (0유저 → Founding Inviter 분기)
  const [referral, setReferral] = useState<{ code: string | null; invited: number } | null>(null);

  // 6/6 완료 confetti & auto-claim guard
  const [confetti, setConfetti] = useState(false);
  const autoClaimTried = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;
    (async () => {
      const [{ data: hb }, { data: amlRows }, { data: ref }] = await Promise.all([
        supabase.from("handbook_progress").select("steps_completed, bonus_paid").eq("user_id", db.user!.id).maybeSingle(),
        supabase.from("aml_verifications").select("level, status").eq("user_id", db.user!.id).eq("status", "approved"),
        supabase.rpc("get_referral_stats"),
      ]);
      if (!alive) return;
      setSteps((hb?.steps_completed as Record<string, boolean>) ?? {});
      setBonusPaid(!!hb?.bonus_paid);
      const maxLv = (amlRows ?? []).reduce((m: number, r: any) => Math.max(m, r.level ?? 0), 0);
      setAmlLevel(maxLv);
      const r = ref as any;
      setReferral({ code: r?.code ?? null, invited: Number(r?.invited ?? 0) });
    })();
    return () => { alive = false; };
  }, [isLoggedIn, db.user?.id]);

  const completedCount = STEP_KEYS.filter((k) => steps[k]).length;
  const allDone = completedCount === STEP_KEYS.length;

  async function markStep(k: StepKey) {
    if (!isLoggedIn) {
      toast({ title: t("starter.loginRequired") });
      return;
    }
    setSteps((p) => ({ ...p, [k]: true }));
    const { error } = await supabase.rpc("mark_handbook_step", { _step: k });
    if (error) {
      setSteps((p) => ({ ...p, [k]: false }));
      toast({ title: error.message, variant: "destructive" });
    }
  }

  async function claim(silent = false) {
    if (!isLoggedIn || bonusPaid || !allDone || claiming) return;
    setClaiming(true);
    try {
      await assertRateLimit(RL_WALLET.scope, RL_WALLET.max);
      const { data, error } = await supabase.rpc("claim_handbook_bonus");
      if (error) throw error;
      const r = data as { ok: boolean; amount?: number; error?: string };
      if (r.ok) {
        setBonusPaid(true);
        setConfetti(true);
        window.setTimeout(() => setConfetti(false), 2400);
        import("@/lib/walletRefresh").then(m => m.refreshWallet());
        toast({ title: t("starter.bonusPaidTitle"), description: t("starter.bonusPaidDesc") });
      } else if (!silent) {
        toast({ title: r.error ?? "error", variant: "destructive" });
      }
    } catch (e: any) {
      if (!silent) toast({ title: e.message ?? "error", variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  }

  // 6/6 도달 시 자동 핸드북 보너스 청구 + confetti
  useEffect(() => {
    if (allDone && !bonusPaid && !autoClaimTried.current && isLoggedIn) {
      autoClaimTried.current = true;
      claim(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, bonusPaid, isLoggedIn]);

  const stepDefs: { k: StepKey; titleKey: string; descKey: string; ctaKey: string; href: string }[] = [
    { k: "step1", titleKey: "starter.step1Title", descKey: "starter.step1Desc", ctaKey: "starter.step1Cta", href: "/auth" },
    { k: "step2", titleKey: "starter.step2Title", descKey: "starter.step2Desc", ctaKey: "starter.step2Cta", href: "/dashboard" },
    { k: "step3", titleKey: "starter.step3Title", descKey: "starter.step3Desc", ctaKey: "starter.step3Cta", href: "/missions" },
    { k: "step4", titleKey: "starter.step4Title", descKey: "starter.step4Desc", ctaKey: "starter.step4Cta", href: "/packages" },
    { k: "step5", titleKey: "starter.step5Title", descKey: "starter.step5Desc", ctaKey: "starter.step5Cta", href: "/wallet" },
    { k: "step6", titleKey: "starter.step6Title", descKey: "starter.step6Desc", ctaKey: "starter.step6Cta", href: "/profile" },
  ];

  const myTier = currentTierByVerificationLevel(amlLevel || 1);
  const isFoundingCandidate = isLoggedIn && referral && referral.invited === 0;
  const referralLink = referral?.code ? `${window.location.origin}/?ref=${referral.code}` : "";

  async function shareReferral() {
    if (!referralLink) {
      toast({ title: t("starter.loginRequired") });
      return;
    }
    const text = isFoundingCandidate ? t("starter.step6FoundingPitch") : "";
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "Phonara", text, url: referralLink }); markStep("step6"); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${referralLink}`.trim());
      toast({ title: "추천 링크가 복사되었습니다" });
      markStep("step6");
    } catch {
      toast({ title: "복사 실패", variant: "destructive" });
    }
  }

  return (
    <div className="relative">
      {/* Confetti overlay */}
      {confetti && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="absolute top-[-10px] block w-2 h-3 rounded-sm animate-confetti"
              style={{
                left: `${(i * 97) % 100}%`,
                background: i % 3 === 0 ? "hsl(var(--gold))" : i % 3 === 1 ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                animationDelay: `${(i % 10) * 80}ms`,
                animationDuration: `${1400 + (i % 5) * 180}ms`,
                transform: `rotate(${(i * 37) % 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Hero */}
      <div className="glass-strong rounded-3xl p-5 mb-4 neon-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-imperial blur-3xl opacity-40 pointer-events-none" />
        <div className="relative">
          <div className="text-[10px] tracking-[0.3em] text-secondary font-black flex items-center gap-1.5">
            <GraduationCap className="w-3 h-3 text-gold" /> {t("starter.heroTag")}
          </div>
          <h2 className="font-imperial text-2xl text-gradient-imperial mt-1 whitespace-pre-line break-keep">
            {t("starter.heroTitle")}
          </h2>
          <p className="text-xs text-muted-foreground mt-2 break-keep">{t("starter.heroDesc")}</p>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">{t("starter.progress")}</span>
              <span className="font-display font-black tabular-nums">{completedCount}/6</span>
            </div>
            <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full bg-gradient-gold transition-all duration-500" style={{ width: `${(completedCount / 6) * 100}%` }} />
            </div>
          </div>

          <TrustCounter />
        </div>
      </div>

      {/* Earnings simulator */}
      <EarningsSimulator />

      {/* Recovery Bonus 실시간 계산기 */}
      <RecoveryBonusCalculator />

      {/* 6 steps with inline extras for step5 / step6 */}
      <div className="space-y-2.5">
        {stepDefs.map((s, i) => {
          const done = !!steps[s.k];
          return (
            <div key={s.k} className={`glass-strong rounded-2xl p-4 relative overflow-hidden transition ${done ? "border border-secondary/40" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-display font-black ${done ? "bg-secondary/20 text-secondary" : "bg-gradient-primary text-primary-foreground"}`}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-black text-sm break-keep">{t(s.titleKey)}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 break-keep">{t(s.descKey)}</p>

                  {/* STEP5 — AML 3단 가로 스크롤 카드 + 연습 출금 모달 */}
                  {s.k === "step5" && (
                    <div className="mt-3">
                      <div className="text-[10px] font-bold text-muted-foreground mb-1.5">{t("starter.amlCardsTitle", { defaultValue: "출금 단계별 인증" })}</div>
                      <div className="-mx-1 flex gap-2 overflow-x-auto snap-x pb-1.5">
                        {AML_TIERS.map((tier) => {
                          const isMine = isLoggedIn && tier.level === Math.max(1, amlLevel || 1);
                          return (
                            <button
                              key={tier.level}
                              onClick={() => { setPreviewLevel(tier.level); markStep("step5"); }}
                              className={`snap-start shrink-0 w-[78%] sm:w-[42%] text-left rounded-2xl p-3 border transition ${isMine ? "border-gold bg-gold/10 glow-gold" : "border-border/50 glass hover:border-primary/40"}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-black tracking-[0.18em] ${isMine ? "text-gold" : "text-primary"}`}>LV{tier.level} · {tier.labelKo}</span>
                                {isMine && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold/20 text-gold font-bold">{t("starter.amlCurrent", { defaultValue: "내 단계" })}</span>}
                              </div>
                              <div className="mt-1.5 font-display font-black text-sm tabular-nums">
                                {tier.maxCumulativeKRW === null ? "₩ 1,000만+" : `~ ₩ ${(tier.maxCumulativeKRW / 10000).toLocaleString()}만`}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 break-keep">{tier.descKo}</div>
                              <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-secondary font-bold">
                                <ShieldCheck className="w-3 h-3" /> 출금 수수료 0%
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 break-keep">{t("starter.amlPreviewNote", { defaultValue: "카드를 누르면 실제 출금 없이 인증 단계만 미리 둘러볼 수 있어요." })}</p>
                    </div>
                  )}

                  {/* STEP6 — 0유저 Founding Inviter 분기 */}
                  {s.k === "step6" && (
                    <div className="mt-3">
                      {isFoundingCandidate ? (
                        <div className="rounded-xl p-3 border border-gold/40 bg-gradient-to-br from-gold/15 via-transparent to-primary/10">
                          <div className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.18em] text-gold">
                            <Crown className="w-3 h-3" /> FOUNDING INVITER
                          </div>
                          <p className="text-[11px] mt-1 break-keep">{t("starter.step6FoundingPitch")}</p>
                        </div>
                      ) : referral && referral.invited > 0 ? (
                        <div className="rounded-xl p-3 glass border border-secondary/30 text-[11px] flex items-center gap-2 break-keep">
                          <Sparkles className="w-3.5 h-3.5 text-secondary" />
                          <span>이미 <b className="tabular-nums">{referral.invited}</b>명을 초대했어요 — 계속 키워볼까요?</span>
                        </div>
                      ) : null}
                      {referralLink && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <code className="flex-1 min-w-0 truncate text-[10px] px-2 py-1.5 rounded-lg glass">{referralLink}</code>
                          <button
                            onClick={() => { navigator.clipboard.writeText(referralLink).then(() => toast({ title: "복사됨" })); }}
                            className="press min-h-[32px] px-2 rounded-lg glass text-[10px] font-bold inline-flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {s.k === "step5" ? (
                      <button
                        onClick={() => { setPreviewLevel((Math.max(1, amlLevel || 1) as 1|2|3)); markStep("step5"); }}
                        className="press flex-1 min-h-[44px] px-3 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 glow-primary"
                      >
                        {t(s.ctaKey)} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : s.k === "step6" ? (
                      <button
                        onClick={shareReferral}
                        className="press flex-1 min-h-[44px] px-3 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 glow-primary"
                      >
                        <Share2 className="w-3.5 h-3.5" /> {t(s.ctaKey)}
                      </button>
                    ) : (
                      <Link
                        to={s.href}
                        onClick={() => markStep(s.k)}
                        className="press flex-1 min-h-[44px] px-3 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 glow-primary"
                      >
                        {t(s.ctaKey)} <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    <button
                      onClick={() => markStep(s.k)}
                      disabled={done}
                      className={`min-h-[44px] px-3 rounded-xl text-[11px] font-bold transition ${done ? "bg-secondary/20 text-secondary cursor-default" : "glass text-muted-foreground hover:text-foreground"}`}
                    >
                      {done ? t("starter.markedDone") : t("starter.markDone")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bonus claim */}
      <div className={`glass-strong rounded-3xl p-5 mt-4 relative overflow-hidden ${allDone && !bonusPaid ? "neon-border" : ""}`}>
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-gold blur-3xl opacity-40 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-gold" />
            <h3 className="font-imperial font-black text-base text-gradient-gold break-keep">
              {t("starter.bonusCardTitle")}
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 break-keep">{t("starter.bonusCardDesc")}</p>

          <button
            onClick={() => claim(false)}
            disabled={!allDone || bonusPaid || claiming}
            className={`press mt-4 w-full min-h-[56px] rounded-xl font-display font-black flex items-center justify-center gap-2 transition ${
              bonusPaid ? "bg-secondary/20 text-secondary" : allDone ? "bg-gradient-gold text-gold-foreground glow-gold" : "glass text-muted-foreground"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {bonusPaid ? t("starter.bonusAlreadyPaid") : claiming ? t("starter.bonusClaiming") : allDone ? t("starter.bonusClaim") : t("starter.bonusIncomplete")}
          </button>
        </div>
      </div>

      {/* AML Preview Dialog */}
      {previewLevel !== null && (
        <AMLGate
          open={previewLevel !== null}
          level={previewLevel}
          mode="preview"
          onClose={() => setPreviewLevel(null)}
        />
      )}

      {/* 시뮬레이션 면책 고지 — Phase 4 필수 */}
      <p className="mt-6 text-center text-[10px] text-muted-foreground break-keep">
        본 가이드의 모든 수치는 과거 시뮬레이션 성과이며, 미래 수익을 보장하지 않습니다.
      </p>
    </div>
  );
}

function Section({ icon: Icon, title, children, gold = false }: any) {
  return (
    <div className={`glass-strong rounded-2xl p-5 mb-3 ${gold ? "neon-border" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${gold ? "bg-gradient-gold glow-gold" : "bg-gradient-primary glow-primary"}`}>
          <Icon className={`w-4 h-4 ${gold ? "text-gold-foreground" : "text-primary-foreground"}`} />
        </div>
        <h2 className={`font-imperial font-black text-base break-keep ${gold ? "text-gradient-gold" : ""}`}>{title}</h2>
      </div>
      <div className="text-sm leading-relaxed text-foreground/90 space-y-2 break-keep">{children}</div>
      <div className="mt-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="break-keep">{children}</span></li>
  );
}

function Principles({ t }: any) {
  return (
    <div>
      <div className="glass rounded-2xl p-4 mb-4 text-xs leading-relaxed text-muted-foreground break-keep">
        {t("intro")}
      </div>

      <Section icon={Sparkles} title={t("s1")}>
        <ul className="space-y-1.5">
          <Bullet>{t("s1a")}</Bullet>
          <Bullet>{t("s1b")}</Bullet>
          <Bullet>{t("s1c")}</Bullet>
          <Bullet>{t("s1d")}</Bullet>
        </ul>
      </Section>

      <Section icon={ShieldCheck} title={t("s2")}>
        <ul className="space-y-1.5 text-xs">
          <li className="break-keep">• {t("s2a")}</li>
          <li className="break-keep">• {t("s2b")}</li>
          <li className="break-keep">• {t("s2c")}</li>
        </ul>
        <p className="text-[11px] text-muted-foreground mt-2 break-keep">{t("s2foot")}</p>
      </Section>

      <Section icon={Crown} title={t("s3")}>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                <th className="text-left py-2 px-2">{t("colTier")}</th><th className="text-left">{t("colDiff")}</th><th className="text-left">{t("colReward")}</th><th className="text-left">{t("colNote")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["FREE","Standard","Base","Free, no pressure"],
                ["STARTER","Easy","1.5×","First step"],
                ["VIP","Easier","6×","VIP missions"],
                ["GOD","Very easy","10×","Almost no fail"],
                ["EMPIRE","Effortless","20×+","Revenue share"],
              ].map((r, i) => (
                <tr key={i} className={`border-b border-border/20 ${r[0] === "EMPIRE" ? "text-gold font-bold" : ""}`}>
                  <td className="py-2 px-2 tabular-nums">{r[0]}</td><td>{r[1]}</td><td className="tabular-nums">{r[2]}</td><td>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={Trophy} title={t("s4")}>
        <ul className="space-y-1 text-xs">
          <li className="break-keep">• {t("s4a")}</li>
          <li className="break-keep">• {t("s4b")}</li>
          <li className="break-keep">• {t("s4c")}</li>
          <li className="break-keep">• {t("s4d")}</li>
        </ul>
      </Section>

      <Section icon={Lock} title={t("s5")}>
        <ul className="space-y-1 text-xs">
          <li className="break-keep">• {t("s5a")}</li>
          <li className="break-keep">• {t("s5b")}</li>
          <li className="break-keep">• {t("s5c")}</li>
          <li className="break-keep">• {t("s5d")}</li>
        </ul>
      </Section>

      <Section icon={WalletIcon} title={t("s6")}>
        <ul className="space-y-1 text-xs">
          <li className="break-keep">• {t("s6a")}</li>
          <li className="break-keep">• {t("s6b")}</li>
          <li className="break-keep">• {t("s6c")}</li>
        </ul>
      </Section>

      <Section icon={Crown} title={t("s7")} gold>
        <p className="text-sm break-keep">{t("s7p")}</p>
      </Section>

      <div className="glass-strong neon-border rounded-2xl p-5 mt-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gold/30 blur-3xl" />
        <h3 className="font-imperial font-black text-base mb-2 text-gradient-gold break-keep">{t("promiseTitle")}</h3>
        <p className="text-xs leading-relaxed text-foreground/90 break-keep">{t("promise")}</p>
        <p className="text-xs mt-3 text-right font-bold text-gold">{t("promiseSign")}</p>
      </div>
    </div>
  );
}

function TierGuide({ t }: any) {
  const tiers = [
    { n: "FREE", reward: "1×", limit: "500K", chance: "4%", color: "bg-muted text-foreground", isE: false },
    { n: "STARTER", reward: "1.5×", limit: "1M", chance: "6%", color: "bg-secondary/20 text-secondary", isE: false },
    { n: "PRO", reward: "3×", limit: "3M", chance: "10%", color: "bg-primary/20 text-primary", isE: false },
    { n: "VIP", reward: "6×", limit: "5M", chance: "12%", color: "bg-accent/20 text-accent", isE: false },
    { n: "GOD", reward: "10×", limit: "50M", chance: "28%", color: "bg-cyan-500/20 text-cyan-300", isE: false },
    { n: "EMPIRE", reward: "20×+", limit: "∞", chance: "65%", color: "bg-gradient-gold text-gold-foreground", isE: true },
  ];
  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed break-keep">
        {t("tierIntro")}
      </div>
      {tiers.map((tt, i) => (
        <div key={i} className={`glass-strong rounded-2xl p-4 ${tt.isE ? "neon-border" : ""} relative overflow-hidden`}>
          {tt.isE && <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold/30 blur-3xl" />}
          <div className="relative flex items-start justify-between mb-2">
            <div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${tt.color}`}>{tt.n}</span>
            </div>
            {tt.isE && <Crown className="w-5 h-5 text-gold animate-crown" />}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] my-3">
            <div className="glass rounded-lg p-2"><div className="text-muted-foreground">{t("tierReward")}</div><div className="font-bold text-sm tabular-nums">{tt.reward}</div></div>
            <div className="glass rounded-lg p-2"><div className="text-muted-foreground">{t("tierLimit")}</div><div className="font-bold text-sm tabular-nums">{tt.limit}</div></div>
            <div className="glass rounded-lg p-2"><div className="text-muted-foreground">{t("tierJackpot")}</div><div className={`font-bold text-sm tabular-nums ${tt.isE ? "text-gold" : "text-primary"}`}>{tt.chance}</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function JackpotGuide({ t }: any) {
  return (
    <div className="space-y-3">
      <div className="glass-strong neon-border rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-cyber opacity-20" />
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold/40 blur-3xl animate-float" />
        <div className="relative">
          <h2 className="font-imperial font-black text-lg text-gradient-gold mb-1 flex items-center gap-2 break-keep">
            <Trophy className="w-5 h-5 text-gold" /> {t("jackpotTitle")}
          </h2>
          <p className="text-xs text-muted-foreground break-keep">{t("jackpotSub")}</p>
        </div>
      </div>

      <Section icon={Coins} title={t("jHowTitle")}>
        <ul className="text-xs space-y-1.5">
          <li className="break-keep">• {t("jHow1")}</li>
          <li className="break-keep">• {t("jHow2")}</li>
          <li className="break-keep">• {t("jHow3")}</li>
        </ul>
      </Section>

      <Section icon={Zap} title={t("jWhenTitle")}>
        <ul className="text-xs space-y-1.5">
          <li className="break-keep">• {t("jWhen1")}</li>
          <li className="break-keep">• {t("jWhen2")}</li>
          <li className="break-keep">• {t("jWhen3")}</li>
        </ul>
      </Section>

      <Section icon={Star} title={t("miniTitle")}>
        <ul className="text-xs space-y-1.5">
          <li className="break-keep">• {t("mini1")}</li>
          <li className="break-keep">• {t("mini2")}</li>
          <li className="break-keep">• {t("mini3")}</li>
        </ul>
      </Section>

      <Section icon={Crown} title={t("odds")} gold>
        <div className="space-y-2">
          {[
            { tn: "NORMAL", c: 4 },
            { tn: "VIP", c: 12 },
            { tn: "GOD", c: 28 },
            { tn: "EMPIRE", c: 65 },
          ].map((r, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className={r.tn === "EMPIRE" ? "text-gold font-bold" : "font-semibold"}>{r.tn}</span>
                <span className="tabular-nums font-bold">{r.c}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${r.tn === "EMPIRE" ? "bg-gradient-gold glow-gold" : "bg-gradient-primary"}`} style={{ width: `${r.c}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 break-keep">{t("oddsFoot")}</p>
      </Section>
    </div>
  );
}

function WalletGuide({ t }: any) {
  return (
    <div className="space-y-3">
      <Section icon={Coins} title={t("depositTitle")}>
        <ol className="text-xs space-y-2 list-decimal list-inside">
          <li className="break-keep">{t("d1")}</li>
          <li className="break-keep">{t("d2")}</li>
          <li className="break-keep">{t("d3")}</li>
          <li className="break-keep">{t("d4")}</li>
        </ol>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {["TRC20","ERC20","BEP20"].map(n => (
            <div key={n} className="glass rounded-lg p-2 text-[11px] font-bold tabular-nums">{n}</div>
          ))}
        </div>
      </Section>

      <Section icon={ArrowLeftRight} title={t("withdrawTitle")}>
        <ol className="text-xs space-y-2 list-decimal list-inside">
          <li className="break-keep">{t("w1")}</li>
          <li className="break-keep">{t("w2")}</li>
          <li className="break-keep">{t("w3")}</li>
          <li className="break-keep">{t("w4")}</li>
          <li className="break-keep">{t("w5")}</li>
        </ol>
      </Section>

      <Section icon={ShieldCheck} title={t("limitTitle")}>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                <th className="text-left py-2 px-2">{t("colTier")}</th><th className="text-left">{t("colLimit")}</th><th className="text-left">{t("colFee")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["FREE","500K","35%"],
                ["STARTER","3M","20%"],
                ["PRO","10M","12%"],
                ["VIP","30M","5%"],
                ["GOD","100M","3%"],
                ["EMPIRE","∞","0%"],
              ].map((r, i) => (
                <tr key={i} className={`border-b border-border/20 ${r[0] === "EMPIRE" ? "text-gold font-bold" : ""}`}>
                  <td className="py-2 px-2 tabular-nums">{r[0]}</td><td className="tabular-nums">{r[1]}</td><td className="tabular-nums">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={Lock} title={t("authTitle")}>
        <ul className="text-xs space-y-1.5">
          <li className="break-keep">• {t("a1")}</li>
          <li className="break-keep">• {t("a2")}</li>
          <li className="break-keep">• {t("a3")}</li>
          <li className="break-keep">• {t("a4")}</li>
        </ul>
      </Section>
    </div>
  );
}
