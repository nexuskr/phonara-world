import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB, PACKAGES, formatKRW, uid, type Pkg } from "@/lib/store";
import { Crown, Check, Upload, Sparkles, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const tierStyles: Record<Pkg["tier"], { ring: string; bg: string; label: string }> = {
  STARTER:  { ring: "from-secondary to-primary",  bg: "from-secondary/20",  label: "ENTRY" },
  FOUNDER:  { ring: "from-primary to-accent",     bg: "from-primary/20",    label: "FOUNDER" },
  GOD:      { ring: "from-accent to-primary",     bg: "from-accent/20",     label: "GOD MODE" },
  AI:       { ring: "from-secondary to-accent",   bg: "from-secondary/20",  label: "AI KINGDOM" },
  EMPIRE:   { ring: "from-gold to-primary",       bg: "from-gold/20",       label: "FACELESS" },
  PHANTOM:  { ring: "from-accent via-gold to-primary", bg: "from-gold/30",  label: "PHANTOM" },
};

export default function Packages() {
  const [db] = useDB();
  const nav = useNavigate();
  const [selected, setSelected] = useState<Pkg | null>(null);
  if (!db.user) { nav("/auth"); return null; }

  return (
    <Layout>
      <div className="container pt-6 pb-10">
        <div className="mb-6">
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" /> <span className="text-gradient-gold">VIP 사이버 패키지</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">매일 자동 정산되는 프리미엄 사이버 자산 시스템</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {PACKAGES.map(p => {
            const t = tierStyles[p.tier];
            return (
              <div key={p.id} className="relative tilt-card group">
                <div className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-br ${t.ring} opacity-60 blur-md group-hover:opacity-90 transition`} />
                <div className="relative glass-strong rounded-3xl p-6 overflow-hidden">
                  <div className={`absolute -top-20 -right-20 w-44 h-44 rounded-full bg-gradient-to-br ${t.bg} to-transparent blur-3xl opacity-70`} />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] tracking-widest font-display font-black px-2 py-1 rounded-full glass">
                        {t.label}
                      </span>
                      {p.tier === "PHANTOM" && <span className="text-xs font-bold text-gold animate-pulse">초대 전용</span>}
                    </div>
                    <h3 className="font-display font-black text-2xl mt-3">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{p.tagline}</p>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <Stat label="투자금" value={formatKRW(p.price)} />
                      <Stat label="일일 정산" value={formatKRW(p.dailyReturn)} highlight />
                      <Stat label="기간" value={`${p.duration}일`} />
                    </div>

                    <div className="mt-3 glass rounded-xl p-3 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">총 예상 수익</span>
                      <span className="font-display font-black text-lg text-gradient-gold">{formatKRW(p.totalReturn)}</span>
                    </div>

                    <ul className="mt-4 space-y-1.5">
                      {p.perks.map(perk => (
                        <li key={perk} className="flex items-center gap-2 text-xs">
                          <Check className="w-3.5 h-3.5 text-secondary shrink-0" /> {perk}
                        </li>
                      ))}
                    </ul>

                    <button onClick={() => setSelected(p)}
                      className="mt-5 w-full py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm glow-primary hover:scale-[1.02] transition flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" /> 가입하기
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && <PurchaseModal pkg={selected} onClose={() => setSelected(null)} />}
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
  const [, setDb] = useDB();
  const [db] = useDB();
  const [screenshot, setScreenshot] = useState<string>();

  function submit() {
    if (!db.user) return;
    setDb(d => ({
      ...d,
      deposits: [{
        id: uid(), userId: d.user!.id, nickname: d.user!.nickname,
        packageId: pkg.id, packageName: pkg.name, amount: pkg.price,
        method: "bank", screenshot, status: "pending", createdAt: Date.now(),
      }, ...d.deposits],
    }));
    onClose();
    toast({ title: "🎉 신청 완료!", description: "관리자 승인 후 즉시 적립이 시작됩니다." });
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
            <Row label="입금 은행" value="KB국민 123-456-78901234" />
            <Row label="예금주" value="(주)폰미션" />
            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
              ※ 입금 후 입금 확인 화면을 캡처하여 업로드해주세요. 실시간 관리자 검증 후 즉시 정산이 시작됩니다.
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
              const r = new FileReader(); r.onload = () => setScreenshot(r.result as string); r.readAsDataURL(f);
            }} />
          </label>

          <button onClick={submit}
            className="mt-5 w-full py-4 rounded-xl bg-gradient-primary text-primary-foreground font-display font-bold glow-primary hover:scale-[1.02] transition">
            결제 신청 제출
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
