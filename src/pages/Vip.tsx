/**
 * /vip — VIP Empire Pass landing & subscribe page.
 * Shows perks, current status, and 30,000 PHON / 30d subscribe CTA.
 */
import { useState } from "react";
import { Sparkles, Crown, Zap, Shield, Eye, MessageCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useVipPass } from "@/hooks/use-vip-pass";
import { useMyPower } from "@/hooks/use-my-power";
import { notify } from "@/lib/notify";
import SEOHead from "@/components/seo/SEOHead";
import { LoadingCard } from "@/components/ui/loading-state";

const COST_PHON = 30000;

const PERKS = [
  { icon: Crown, title: "골드 닉네임 + Crown Aura 진화", desc: "전 화면에서 즉시 식별되는 황금빛 명패" },
  { icon: Zap, title: "Crown 폭발 ×3 보너스", desc: "당첨 시 RPE 보상 3배 가산" },
  { icon: Eye, title: "Whale 시그널 30초 선공개", desc: "대형 입금/출금 이벤트를 일반 유저보다 먼저" },
  { icon: MessageCircle, title: "VIP 전용 채팅방 + AI Coach 무제한", desc: "토큰 카운터 없이 Emperor Coach 사용" },
  { icon: Shield, title: "출금 우선순위 표식", desc: "운영자 큐에서 VIP 마크로 분리 처리" },
];

export default function Vip() {
  const vip = useVipPass();
  const power = useMyPower();
  const [submitting, setSubmitting] = useState(false);

  async function subscribe() {
    if (submitting) return;
    if (power.phon < COST_PHON) {
      notify.error(`PHON 잔액이 부족합니다. (필요: ${COST_PHON.toLocaleString()})`);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("subscribe_vip_pass_phon");
      if (error) throw error;
      const expires = (data as any)?.expires_at;
      notify.success(
        `VIP Empire Pass 활성화됨${expires ? ` · 만료 ${new Date(expires).toLocaleDateString()}` : ""}`,
      );
      await vip.refresh();
    } catch (e: any) {
      const msg = e?.message?.includes("insufficient_phon")
        ? "PHON 잔액 부족"
        : e?.message?.includes("auth_required")
          ? "로그인이 필요합니다"
          : "구독에 실패했습니다";
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        path="/vip"
        title="VIP Empire Pass · Phonara"
        description="골드 닉네임, Crown 폭발 ×3, Whale 시그널 선공개, AI Coach 무제한 — 30,000 PHON / 30일."
      />

      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-background to-background" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center gap-4"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-[11px] font-imperial tracking-[0.2em] text-amber-200">
              <Sparkles className="w-3.5 h-3.5" /> EMPIRE PASS
            </div>
            <h1 className="text-4xl md:text-6xl font-imperial tracking-tight">
              <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                황제의 자격
              </span>
            </h1>
            <p className="max-w-xl text-sm md:text-base text-muted-foreground">
              가장 시끄럽게, 가장 빠르게, 가장 우선으로. 30일 동안 제국의 모든 우선권을 가져갑니다.
            </p>

            {vip.loading ? (
              <LoadingState variant="inline" />
            ) : vip.active ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-500/15 px-4 py-2 text-sm text-amber-100">
                <CheckCircle2 className="w-4 h-4" />
                현재 활성 · D-{Math.max(0, vip.days_remaining)} (만료{" "}
                {vip.expires_at ? new Date(vip.expires_at).toLocaleDateString() : "-"})
              </div>
            ) : (
              <div className="mt-4 text-xs text-muted-foreground">
                보유 PHON {power.phon.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            )}

            <Button
              size="lg"
              onClick={subscribe}
              disabled={submitting}
              className="mt-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 font-imperial tracking-widest"
            >
              {submitting ? "처리 중..." : vip.active ? "30일 더 연장" : `30,000 PHON으로 구독`}
            </Button>
            <div className="text-[11px] text-muted-foreground">
              30일 단위 · 자동결제 없음 · 언제든 만료 후 종료 · 결제는 PHON 차감
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-xl font-imperial tracking-widest text-center mb-6 text-amber-200/90">
          PASS 혜택
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PERKS.map((p) => (
            <Card
              key={p.title}
              className="p-4 border-amber-500/20 bg-gradient-to-br from-card to-card/60 hover:border-amber-400/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 bg-amber-500/15 text-amber-300">
                  <p.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
