/**
 * /vip — 4-tier comparison + current status + upgrade CTA.
 * Tiers: silver / gold / platinum / diamond.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Check, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import VipTierBadge, { type VipTier } from "@/components/vip/VipTierBadge";
import { useMyPower } from "@/hooks/use-my-power";
import { useVipPass } from "@/hooks/use-vip-pass";
import { notify } from "@/lib/notify";
import SEOHead from "@/components/seo/SEOHead";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type TierRow = {
  tier: VipTier;
  rank: number;
  min_phon: number;
  crown_mult: number;
  fee_waiver_pct: number;
  free_spins: number;
  whale_lead_seconds: number;
  lounge: boolean;
  concierge: boolean;
  withdraw_priority: number;
  event_lead_hours: number;
  skin_pack: string;
};

const TIER_ORDER: VipTier[] = ["silver", "gold", "platinum", "diamond"];

function tierIndex(t: string | null | undefined) {
  if (!t) return -1;
  return TIER_ORDER.indexOf(t.toLowerCase() as VipTier);
}

function fmt(n: number) {
  return Number(n || 0).toLocaleString();
}

export default function Vip() {
  const vip = useVipPass();
  const power = useMyPower();
  const qc = useQueryClient();
  const [pendingTier, setPendingTier] = useState<VipTier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tiersQ = useQuery({
    queryKey: ["vip", "tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vip_tier_config")
        .select("*")
        .order("rank", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TierRow[];
    },
    staleTime: 5 * 60_000,
  });

  const myTierQ = useQuery({
    queryKey: ["vip", "tier"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_vip_tier");
      if (error) throw error;
      return data as { tier?: string | null; active?: boolean } | null;
    },
    staleTime: 30_000,
  });

  const currentTier = (myTierQ.data?.tier ?? null) as string | null;
  const currentIdx = tierIndex(currentTier);

  const tiers = useMemo(() => tiersQ.data ?? [], [tiersQ.data]);

  async function confirmSubscribe() {
    if (!pendingTier || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("subscribe_vip_pass_phon", {
        _tier: pendingTier,
      } as any);
      if (error) throw error;
      const expires = (data as any)?.expires_at;
      notify.success(
        `👑VIP ${pendingTier.toUpperCase()} 활성화${expires ? ` · 만료 ${new Date(expires).toLocaleDateString()}` : ""}`,
      );
      await vip.refresh();
      qc.invalidateQueries({ queryKey: ["vip"] });
    } catch (e: any) {
      const msg = e?.message?.includes("insufficient_phon")
        ? "PHON 잔액이 부족합니다"
        : e?.message?.includes("auth_required")
          ? "로그인이 필요합니다"
          : e?.message ?? "구독에 실패했습니다";
      notify.error(msg);
    } finally {
      setSubmitting(false);
      setPendingTier(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        path="/vip"
        title="VIP Empire Pass · Phonara"
        description="Silver / Gold / Platinum / Diamond — 4단계 황제 등급으로 우선권을 차지하세요."
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-background to-background" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center text-center gap-3"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-[11px] font-imperial tracking-[0.2em] text-amber-200">
              <Sparkles className="w-3.5 h-3.5" /> EMPIRE PASS
            </div>
            <h1 className="text-3xl md:text-5xl font-imperial tracking-tight">
              <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                황제의 4등급
              </span>
            </h1>
            <p className="max-w-xl text-sm md:text-base text-muted-foreground">
              Silver · Gold · Platinum · Diamond — 등급마다 더 큰 Crown 폭발, 더 빠른 Whale 시그널.
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <span className="text-[11px] text-muted-foreground">현재 등급</span>
              <VipTierBadge tier={(currentTier as VipTier | null) ?? null} size="md" />
              {vip.active && vip.expires_at && (
                <span className="text-[11px] text-amber-100/80">
                  · D-{Math.max(0, vip.days_remaining)} (만료 {new Date(vip.expires_at).toLocaleDateString()})
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              보유 PHON {fmt(Math.floor(power.phon))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4-TIER GRID */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-base md:text-lg font-imperial tracking-widest text-center mb-5 text-amber-200/90">
          4 단계 비교
        </h2>

        {tiersQ.isLoading ? (
          <LoadingList rows={2} />
        ) : tiers.length === 0 ? (
          <EmptyState title="등급 정보를 불러오지 못했습니다" />
        ) : (
          <div className="-mx-4 px-4 overflow-x-auto md:overflow-visible">
            <div className="grid grid-flow-col auto-cols-[78%] sm:auto-cols-[48%] md:grid-flow-row md:auto-cols-auto md:grid-cols-4 gap-3 min-w-min">
              {tiers.map((t) => {
                const isCurrent = currentIdx === tierIndex(t.tier);
                const isLower = currentIdx >= tierIndex(t.tier) && currentIdx !== -1;
                return (
                  <motion.div
                    key={t.tier}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      "rounded-2xl border bg-card flex flex-col overflow-hidden",
                      isCurrent ? "border-amber-400/70 shadow-[0_0_28px_-6px_hsl(45_100%_55%/0.55)]" : "border-border/60",
                    )}
                  >
                    {/* gradient header */}
                    <div className="p-4 text-center bg-gradient-to-br from-card via-card/80 to-background">
                      <VipTierBadge tier={t.tier} size="md" className="mx-auto" />
                      <div className="mt-3 text-3xl font-black tabular-nums text-foreground">
                        {fmt(t.min_phon)}
                      </div>
                      <div className="text-[10px] text-muted-foreground tracking-widest mt-0.5">
                        PHON / 30일
                      </div>
                    </div>

                    {/* benefits */}
                    <ul className="px-4 pb-4 space-y-2 text-xs flex-1">
                      <Benefit label="Crown 폭발 배수" value={`×${t.crown_mult}`} />
                      <Benefit label="수수료 면제" value={t.fee_waiver_pct > 0 ? `-${t.fee_waiver_pct}%` : "—"} />
                      <Benefit label="무료 스핀" value={t.free_spins > 0 ? `${t.free_spins}회/일` : "—"} />
                      <Benefit
                        label="Whale 선공개"
                        value={t.whale_lead_seconds > 0 ? `${t.whale_lead_seconds}초` : "—"}
                      />
                      <Benefit label="라운지" value={t.lounge ? "입장" : "—"} />
                      <Benefit label="컨시어지" value={t.concierge ? "전담" : "—"} />
                      <Benefit
                        label="출금 우선순위"
                        value={t.withdraw_priority > 0 ? `Lv ${t.withdraw_priority}` : "—"}
                      />
                      <Benefit
                        label="이벤트 선공개"
                        value={t.event_lead_hours > 0 ? `${t.event_lead_hours}h` : "—"}
                      />
                    </ul>

                    {/* CTA */}
                    <div className="px-4 pb-4">
                      <Button
                        onClick={() => setPendingTier(t.tier)}
                        disabled={isCurrent || isLower || power.phon < t.min_phon}
                        className={cn(
                          "w-full h-11 font-imperial tracking-widest",
                          isCurrent
                            ? "bg-muted text-muted-foreground"
                            : "bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400",
                        )}
                      >
                        {isCurrent ? (
                          <><Check className="w-4 h-4 mr-1" /> 현재 등급</>
                        ) : isLower ? (
                          "이미 보유"
                        ) : power.phon < t.min_phon ? (
                          <><Lock className="w-4 h-4 mr-1" /> PHON 부족</>
                        ) : (
                          "업그레이드"
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          30일 단위 · 자동결제 없음 · 결제는 PHON 차감
        </p>
      </section>

      <AlertDialog open={!!pendingTier} onOpenChange={(o) => !o && setPendingTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              VIP {pendingTier?.toUpperCase()} 30일 구독
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTier && (
                <>
                  {fmt(tiers.find((x) => x.tier === pendingTier)?.min_phon ?? 0)} PHON이 즉시 차감됩니다.
                  계속하시겠어요?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSubscribe}
              disabled={submitting}
              className="h-11 bg-gradient-to-r from-amber-500 to-yellow-500 text-black"
            >
              {submitting ? "처리 중..." : "구독하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Benefit({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2 border-b border-border/30 pb-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground tabular-nums">{value}</span>
    </li>
  );
}
