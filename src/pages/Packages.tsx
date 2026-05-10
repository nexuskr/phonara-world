import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { useDB, PACKAGES, formatKRW, type Pkg } from "@/lib/store";
import { Crown, Check, Upload, Sparkles, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRequireAuth } from "@/hooks/use-require-auth";
import PackageBoostPreview from "@/components/PackageBoostPreview";
import ActiveBoostCounter from "@/components/ActiveBoostCounter";
import EmpireFoundingCounter from "@/components/EmpireFoundingCounter";
import EmpireDayCountdown from "@/components/EmpireDayCountdown";
import PaywallStarter from "@/components/conversion/PaywallStarter";
import { isFlagOn } from "@/lib/conversion-flags";
import Disclaimer from "@/components/Disclaimer";
import { track } from "@/lib/analytics";
import { LuxButton } from "@/components/ui/lux";
import { AdultOnlyBanner } from "@/components/AdultOnlyBanner";

const tierStyles: Record<Pkg["tier"], { ring: string; bg: string; label: string }> = {
  FREE:    { ring: "from-muted to-muted",                bg: "from-muted/30",      label: "FREE" },
  STARTER: { ring: "from-secondary to-primary",          bg: "from-secondary/20",  label: "STARTER" },
  PRO:     { ring: "from-primary to-secondary",          bg: "from-primary/20",    label: "PRO" },
  VIP:     { ring: "from-primary to-accent",             bg: "from-primary/25",    label: "VIP" },
  GOD:     { ring: "from-accent to-primary",             bg: "from-accent/25",     label: "GOD MODE" },
  EMPIRE:  { ring: "from-gold to-primary",               bg: "from-gold/25",       label: "EMPIRE" },
  PHANTOM: { ring: "from-accent via-gold to-primary",    bg: "from-gold/30",       label: "PHANTOM" },
};

export default function Packages() {
  const { t } = useTranslation("packages");
  const [db] = useDB();
  const nav = useNavigate();
  const user = useRequireAuth() ?? db.user;
  const [selected, setSelected] = useState<Pkg | null>(null);
  const [paywall, setPaywall] = useState<Pkg | null>(null);

  function handleCTA(p: Pkg) {
    if (isFlagOn("frictionZeroPay") && (p.tier === "STARTER" || p.tier === "VIP" || p.tier === "GOD")) {
      track("funnel_paywall_shown", { package_id: p.id, tier: p.tier });
      setPaywall(p);
      return;
    }
    setSelected(p);
  }
  if (!user) return null;

  return (
    <Layout>
      <AdultOnlyBanner />
      <HubTabs hub="empire" />
      <div className="container pt-6 pb-10 animate-liquid-in">
        <div className="mb-6">
          <h1 className="font-imperial font-black text-2xl sm:text-3xl flex items-center gap-2 tracking-[0.04em] break-keep">
            <Crown className="w-5 h-5 text-gold shrink-0" /> <span className="text-gradient-gold">{t("headline")}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 break-keep">{t("sub")}</p>
          <div className="mt-2"><ActiveBoostCounter /></div>
          <div className="mt-3 flex items-center gap-2 text-[11px] glass rounded-2xl px-3 py-2.5 border border-destructive/30 min-h-[44px] flex-wrap">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            <span className="font-bold text-destructive">{t("liveTag")}</span>
            <span className="text-muted-foreground break-keep">
              <Trans
                i18nKey="packages:liveText"
                values={{ n: "1,284" }}
                components={{ 1: <span className="font-black text-money-strong tabular-nums" /> }}
              />
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[...PACKAGES].sort((a, b) => (a.tier === "FREE" ? 1 : b.tier === "FREE" ? -1 : 0)).map(p => {
            const ts = tierStyles[p.tier];
            const isEmpire = p.tier === "EMPIRE" || p.tier === "PHANTOM";
            return (
              <div key={p.id} className="relative lift group">
                <div className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-br ${ts.ring} opacity-60 blur-md group-hover:opacity-100 transition duration-700`} />
                <div className="relative glass-strong rounded-3xl p-5 sm:p-6 overflow-hidden sheen">
                  <div className={`absolute -top-20 -right-20 w-44 h-44 rounded-full bg-gradient-to-br ${ts.bg} to-transparent blur-3xl opacity-70`} />
                  {isEmpire && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span key={i} className="absolute text-gold animate-crown text-sm"
                          style={{ left: `${10 + i * 15}%`, top: `${15 + (i % 3) * 22}%`, animationDelay: `${i * 0.3}s` }}>✦</span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] tracking-widest font-imperial font-black px-2 py-1 rounded-full glass">
                        {p.badge ?? ts.label}
                      </span>
                      {p.tier === "PHANTOM" && <span className="text-xs font-bold text-gold animate-pulse">{t("inviteOnly")}</span>}
                    </div>
                    <h3 className="font-imperial font-black text-2xl sm:text-3xl mt-3 tracking-[0.02em]">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 break-keep">{p.tagline}</p>

                    {p.fomo && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gold break-keep">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse shrink-0" /> {p.fomo}
                      </div>
                    )}

                    {p.tier === "FREE" ? (
                      <>
                        <ul className="mt-5 space-y-1.5">
                          {p.perks.map(perk => (
                            <li key={perk} className="flex items-center gap-2 text-xs break-keep">
                              <Check className="w-3.5 h-3.5 text-secondary shrink-0" /> {perk}
                            </li>
                          ))}
                        </ul>
                        <LuxButton onClick={() => nav("/missions")} variant="ghost" block size="lg" className="mt-5">
                          {t("freeCta")}
                        </LuxButton>
                      </>
                    ) : (
                      <>
                        {/* Phase 6 — 출금 수수료 0% 영구 보장 배지 */}
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-gold/20 to-primary/15 border border-gold/40 text-[10px] font-bold text-gold">
                          <Check className="w-3 h-3" />
                          <span>출금 수수료 0% 영구 보장</span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <Stat label={t("statCharge")} value={formatKRW(p.price)} />
                          <Stat label={t("statDaily")} value={formatKRW(p.dailyReturn)} highlight />
                          <Stat label={t("statDuration")} value={t("durationDays", { n: p.duration })} />
                        </div>

                        <div className="mt-3 glass rounded-2xl p-3 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] text-muted-foreground break-keep">{t("total30d")}</span>
                          <span className="font-imperial font-black text-lg text-money-strong tabular-nums">{formatKRW(p.totalReturn)}*</span>
                        </div>
                        <p className="mt-1.5 text-[9px] text-muted-foreground leading-tight break-keep">{t("disclaimer")}</p>

                        <PackageBoostPreview
                          dailyReturn={p.dailyReturn}
                          multiplier={p.boostMultiplier ?? 1.0}
                          isEmpire={p.tier === "EMPIRE"}
                        />

                        {p.tier === "EMPIRE" && (
                          <div className="mt-3 space-y-2">
                            <EmpireFoundingCounter />
                            <EmpireDayCountdown />
                          </div>
                        )}

                        <ul className="mt-4 space-y-1.5">
                          {p.perks.map(perk => (
                            <li key={perk} className="flex items-center gap-2 text-xs break-keep">
                              <Check className="w-3.5 h-3.5 text-secondary shrink-0" /> {perk}
                            </li>
                          ))}
                        </ul>

                        {p.seatsLeft !== undefined && p.tier !== "EMPIRE" && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>{t("seatsLeft")}</span><span className="text-gold font-bold tabular-nums">{t("seatsUnit", { n: p.seatsLeft })}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-gold" style={{ width: `${Math.min(100, (p.seatsLeft / 100) * 100)}%` }} />
                            </div>
                          </div>
                        )}

                        <LuxButton onClick={() => handleCTA(p)} block size="lg" className="mt-5 sheen">
                          <Sparkles className="w-4 h-4" /> {t("cta")}
                        </LuxButton>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 glass rounded-2xl p-4 text-[10px] leading-relaxed text-muted-foreground break-keep">
          <p className="font-bold text-foreground mb-1">{t("footerTitle")}</p>
          <p>{t("footerBody")}</p>
        </div>
      </div>

      {selected && <PurchaseModal pkg={selected} onClose={() => setSelected(null)} />}
      {paywall && (
        <PaywallStarter
          pkg={paywall}
          onClose={() => setPaywall(null)}
          onSubmit={async () => {
            const p = paywall;
            setPaywall(null);
            setSelected(p);
          }}
        />
      )}
      <Disclaimer />
    </Layout>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass rounded-xl p-2.5 text-center">
      <div className="text-[9px] text-muted-foreground tracking-wide break-keep">{label}</div>
      <div className={`font-imperial font-bold text-xs mt-0.5 tabular-nums ${highlight ? "text-money-strong" : ""}`}>{value}</div>
    </div>
  );
}

function PurchaseModal({ pkg, onClose }: { pkg: Pkg; onClose: () => void }) {
  const { t } = useTranslation("packages");
  const user = useRequireAuth();
  const [, setDb] = useDB();
  void setDb;
  const [screenshot, setScreenshot] = useState<string>();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user || busy) return;
    setBusy(true);
    try {
      let receiptUrl: string | null = null;
      if (file) {
        const { uploadReceipt } = await import("@/lib/deposits-rpc");
        receiptUrl = await uploadReceipt(file);
      }
      const { submitPackagePurchase } = await import("@/lib/packages-rpc");
      await submitPackagePurchase({
        packageId: pkg.id,
        packageName: pkg.name,
        amount: pkg.price,
        dailyReturn: pkg.dailyReturn,
        durationDays: pkg.duration,
        totalReturn: pkg.totalReturn,
        receiptUrl,
      });
      onClose();
      toast({ title: t("doneTitle"), description: t("doneDesc") });
    } catch (e: any) {
      toast({ title: t("failTitle"), description: e.message ?? t("failDesc"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-5 sm:p-6 neon-border relative overflow-hidden animate-fade-up">
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center min-h-[40px] min-w-[40px]"><X className="w-4 h-4" /></button>
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-primary blur-3xl opacity-50" />
        <div className="relative">
          <h2 className="font-imperial font-black text-xl sm:text-2xl tracking-[0.02em]">{pkg.name}</h2>
          <p className="text-xs text-muted-foreground break-keep">{pkg.tagline}</p>

          <div className="mt-5 glass rounded-2xl p-4 space-y-2">
            <Row label={t("modalAmount")} value={formatKRW(pkg.price)} money />
            <Row label={t("modalDaily")} value={formatKRW(pkg.dailyReturn)} money />
            <Row label={t("modalBank")} value={t("modalBankValue")} />
            <Row label={t("modalOwner")} value={t("modalOwnerValue")} />
            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40 break-keep">
              {t("modalMemo")}
            </p>
          </div>

          <label className="mt-4 block">
            <div className="glass rounded-2xl p-4 border-2 border-dashed border-border hover:border-primary transition cursor-pointer text-center min-h-[120px] flex flex-col items-center justify-center">
              {screenshot ? (
                <img src={screenshot} alt="screenshot" className="max-h-32 mx-auto rounded-lg" />
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                  <div className="text-xs mt-2 font-bold break-keep">{t("uploadCta")}</div>
                  <div className="text-[10px] text-muted-foreground">{t("uploadHint")}</div>
                </>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              setFile(f);
              const r = new FileReader(); r.onload = () => setScreenshot(r.result as string); r.readAsDataURL(f);
            }} />
          </label>

          <LuxButton onClick={submit} disabled={busy} block size="lg" className="mt-5">
            {busy ? t("submitting") : t("submit")}
          </LuxButton>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs gap-2">
      <span className="text-muted-foreground break-keep">{label}</span>
      <span className={`font-bold ${money ? "text-money-strong tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}
