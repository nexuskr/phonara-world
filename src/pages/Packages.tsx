import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { track } from "@/lib/analytics";

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
      <HubTabs hub="empire" />
      <div className="container pt-6 pb-10 animate-liquid-in">
        <div className="mb-6">
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" /> <span className="text-gradient-gold">🔥 첫 3일 보너스 구간</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">지금 시작 시 첫 3일간 보너스 구간 진입 · 사전 공지 확정 적립 스케줄</p>
          <div className="mt-2"><ActiveBoostCounter /></div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[...PACKAGES].sort((a, b) => (a.tier === "FREE" ? 1 : b.tier === "FREE" ? -1 : 0)).map(p => {
            const t = tierStyles[p.tier];
            const isEmpire = p.tier === "EMPIRE" || p.tier === "PHANTOM";
            return (
              <div key={p.id} className="relative lift group">
                <div className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-br ${t.ring} opacity-60 blur-md group-hover:opacity-100 transition duration-700`} />
                <div className="relative glass-strong rounded-3xl p-6 overflow-hidden sheen">
                  <div className={`absolute -top-20 -right-20 w-44 h-44 rounded-full bg-gradient-to-br ${t.bg} to-transparent blur-3xl opacity-70`} />
                  {isEmpire && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span key={i} className="absolute text-gold animate-crown text-sm"
                          style={{ left: `${10 + i * 15}%`, top: `${15 + (i % 3) * 22}%`, animationDelay: `${i * 0.3}s` }}>✦</span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] tracking-widest font-display font-black px-2 py-1 rounded-full glass">
                        {p.badge ?? t.label}
                      </span>
                      {p.tier === "PHANTOM" && <span className="text-xs font-bold text-gold animate-pulse">초대 전용</span>}
                    </div>
                    <h3 className="font-display font-black text-2xl mt-3">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{p.tagline}</p>

                    {p.fomo && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gold">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" /> {p.fomo}
                      </div>
                    )}

                    {p.tier === "FREE" ? (
                      <>
                        <ul className="mt-5 space-y-1.5">
                          {p.perks.map(perk => (
                            <li key={perk} className="flex items-center gap-2 text-xs">
                              <Check className="w-3.5 h-3.5 text-secondary shrink-0" /> {perk}
                            </li>
                          ))}
                        </ul>
                        <button onClick={() => nav("/missions")}
                          className="mt-5 w-full py-3 rounded-xl glass border border-border font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2">
                          무료로 미션 시작하기
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="mt-5 grid grid-cols-3 gap-2">
                          <Stat label="충전금" value={formatKRW(p.price)} />
                          <Stat label="매일 수확" value={formatKRW(p.dailyReturn)} highlight />
                          <Stat label="기간" value={`${p.duration}일`} />
                        </div>

                        <div className="mt-3 glass rounded-xl p-3 flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">30일 총 예상 (정상 구간)</span>
                          <span className="font-display font-black text-lg text-gradient-gold">{formatKRW(p.totalReturn)}</span>
                        </div>

                        {/* 🔥 Day 1~3 부스트 미리보기 (메인 훅) */}
                        <PackageBoostPreview
                          dailyReturn={p.dailyReturn}
                          multiplier={p.boostMultiplier ?? 1.0}
                          isEmpire={p.tier === "EMPIRE"}
                        />

                        {/* Empire 전용: Founding 좌석 + Empire Day */}
                        {p.tier === "EMPIRE" && (
                          <div className="mt-3 space-y-2">
                            <EmpireFoundingCounter />
                            <EmpireDayCountdown />
                          </div>
                        )}

                        <ul className="mt-4 space-y-1.5">
                          {p.perks.map(perk => (
                            <li key={perk} className="flex items-center gap-2 text-xs">
                              <Check className="w-3.5 h-3.5 text-secondary shrink-0" /> {perk}
                            </li>
                          ))}
                        </ul>

                        {p.seatsLeft !== undefined && p.tier !== "EMPIRE" && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>잔여 좌석</span><span className="text-gold font-bold">{p.seatsLeft}석</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-gold" style={{ width: `${Math.min(100, (p.seatsLeft / 100) * 100)}%` }} />
                            </div>
                          </div>
                        )}

                        <button onClick={() => handleCTA(p)}
                          className="press sheen mt-5 w-full py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm glow-primary flex items-center justify-center gap-2">
                          <Sparkles className="w-4 h-4" /> 가입하기
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        {/* v5.1 법적 푸터 — 사전 공지 확정 스케줄 */}
        <div className="mt-8 glass rounded-2xl p-4 text-[10px] leading-relaxed text-muted-foreground">
          <p className="font-bold text-foreground mb-1">📋 사전 공지 확정 적립 스케줄</p>
          <p>
            모든 패키지는 30일 한정·사전 공지된 확정 적립률로 운영됩니다. 첫 3일 보너스 구간(Easy +30% / Easy 150 +20% / Empire +50%)은 결제 승인 시점부터 자동 적용되며, Empire Day(매월 1·15일) +50%는 Empire 보유자 중 Day 4 이후 머신에 한해 자동 적용됩니다. 청약철회는 전자상거래법에 따라 결제일로부터 7일 이내 가능하며 일일 정산을 1회라도 진행한 경우 제한됩니다. 자세한 내용은 고객센터 FAQ를 참조하세요.
          </p>
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
    </Layout>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass rounded-xl p-2.5 text-center">
      <div className="text-[9px] text-muted-foreground tracking-wide">{label}</div>
      <div className={`font-display font-bold text-xs mt-0.5 ${highlight ? "text-gradient-primary" : ""}`}>{value}</div>
    </div>
  );
}

function PurchaseModal({ pkg, onClose }: { pkg: Pkg; onClose: () => void }) {
  const user = useRequireAuth();
  const [, setDb] = useDB();
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
      toast({ title: "🎉 신청 완료!", description: "관리자 승인 후 일일 정산이 시작됩니다." });
    } catch (e: any) {
      toast({ title: "신청 실패", description: e.message ?? "잠시 후 다시 시도해주세요.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 neon-border relative overflow-hidden animate-fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center"><X className="w-4 h-4" /></button>
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-primary blur-3xl opacity-50" />
        <div className="relative">
          <h2 className="font-display font-black text-xl">{pkg.name}</h2>
          <p className="text-xs text-muted-foreground">{pkg.tagline}</p>

          <div className="mt-5 glass rounded-2xl p-4 space-y-2">
            <Row label="결제 금액" value={formatKRW(pkg.price)} />
            <Row label="일일 정산" value={formatKRW(pkg.dailyReturn)} />
            <Row label="입금 은행" value="KB국민 123-456-78901234" />
            <Row label="예금주" value="(주)Phonara" />
            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
              ※ 입금 후 입금 확인 화면을 캡처하여 업로드해주세요. 관리자 검증 후 정산이 시작됩니다.
            </p>
          </div>

          <label className="mt-4 block">
            <div className="glass rounded-2xl p-4 border-2 border-dashed border-border hover:border-primary transition cursor-pointer text-center">
              {screenshot ? (
                <img src={screenshot} alt="screenshot" className="max-h-32 mx-auto rounded-lg" />
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                  <div className="text-xs mt-2 font-bold">입금 확인 스크린샷 업로드</div>
                  <div className="text-[10px] text-muted-foreground">PNG, JPG 가능</div>
                </>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              setFile(f);
              const r = new FileReader(); r.onload = () => setScreenshot(r.result as string); r.readAsDataURL(f);
            }} />
          </label>

          <button onClick={submit} disabled={busy}
            className="mt-5 w-full py-4 rounded-xl bg-gradient-primary text-primary-foreground font-display font-bold glow-primary hover:scale-[1.02] transition disabled:opacity-50">
            {busy ? "신청 중..." : "결제 신청 제출"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
