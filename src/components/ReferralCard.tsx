import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, Copy, Share2, Crown, TrendingUp, Sparkles } from "lucide-react";
import LineShareButton from "@/components/share/LineShareButton";

type Stats = {
  code: string | null;
  invited: number;
  active_7d: number;
  total_commission: number;
  today_commission: number;
};

export default function ReferralCard() {
  const { t } = useTranslation("referral");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [hasInviter, setHasInviter] = useState<boolean>(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const load = async () => {
    const { data, error } = await supabase.rpc("get_referral_stats");
    if (!error && data) setStats(data as any);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: p } = await supabase.from("profiles").select("referred_by").eq("id", u.user.id).maybeSingle();
      setHasInviter(!!(p as any)?.referred_by);
      const created = u.user.created_at ? new Date(u.user.created_at).getTime() : null;
      if (created) {
        const expires = created + 90 * 24 * 60 * 60 * 1000;
        const diff = Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000));
        setDaysLeft(Math.max(0, diff));
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const link = stats?.code ? `${window.location.origin}/?ref=${stats.code}` : "";

  const copy = async (txt: string, label: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast({ title: t("copied", { label }) });
    } catch {
      toast({ title: t("copyFail"), variant: "destructive" });
    }
  };

  const share = async () => {
    if (!link) return;
    const text = t("shareText", { code: stats?.code });
    if (navigator.share) {
      try { await navigator.share({ title: t("shareTitle"), text, url: link }); return; } catch {}
    }
    await copy(`${text}\n${link}`, t("labelMsg"));
  };

  const apply = async () => {
    if (applyCode.length !== 8) {
      toast({ title: t("codeLen"), variant: "destructive" });
      return;
    }
    setApplying(true);
    try {
      const { error } = await supabase.rpc("apply_referral_code", { _code: applyCode.toUpperCase() });
      if (error) {
        const m = error.message || "";
        const desc = m.includes("already_applied") ? t("alreadyApplied")
          : m.includes("self_referral") ? t("selfRefer")
          : m.includes("code_not_found") ? t("notFound")
          : m;
        toast({ title: t("registerFail"), description: desc, variant: "destructive" });
        return;
      }
      toast({ title: t("registerDone") });
      setApplyCode("");
      load();
    } finally { setApplying(false); }
  };

  if (loading) {
    return <div className="glass-strong rounded-2xl p-5 h-32 animate-pulse" />;
  }

  return (
    <div className="relative glass-strong rounded-3xl p-5 neon-border overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-gold blur-3xl opacity-20" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-gradient-primary blur-3xl opacity-30" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center glow-gold">
            <Crown className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="font-display font-black text-base flex items-center gap-1.5 break-keep">
              {t("headerTitle")}
              <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
            </h3>
          <p className="text-[10px] text-muted-foreground break-keep">{t("headerSub1")}<span className="text-gold font-bold">{t("headerSubBold")}</span></p>
          {daysLeft !== null && (
            <p className="text-[10px] mt-0.5 break-keep">
              <span className={daysLeft > 0 ? "text-gold font-bold" : "text-muted-foreground"}>
                {daysLeft > 0 ? t("windowDays", { days: daysLeft }) : t("windowExpired")}
              </span>
            </p>
          )}
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-gold/15 via-primary/10 to-accent/10 border border-gold/30 p-4 mb-3">
          <div className="text-[10px] text-muted-foreground mb-1">{t("myCode")}</div>
          <div className="flex items-center gap-2">
            <div className="font-display font-black text-2xl tracking-widest text-gradient-gold flex-1 tabular-nums">
              {stats?.code ?? "—"}
            </div>
            <button onClick={() => copy(stats?.code ?? "", t("labelCode"))}
              className="w-11 h-11 rounded-lg glass hover:scale-105 transition flex items-center justify-center">
              <Copy className="w-4 h-4 text-gold" />
            </button>
          </div>
          <div className="mt-3">
            <ShareBar url={link} text={t("shareText", { code: stats?.code })} title={t("shareTitle")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <Stat label={t("invited")} value={t("countUnit", { n: stats?.invited ?? 0 })} icon={<Users className="w-3.5 h-3.5" />} accent="text-secondary" />
          <Stat label={t("active7")} value={t("countUnit", { n: stats?.active_7d ?? 0 })} icon={<TrendingUp className="w-3.5 h-3.5" />} accent="text-primary" />
          <Stat label={t("todayCom")} value={`₩${(stats?.today_commission ?? 0).toLocaleString()}`} icon={<Sparkles className="w-3.5 h-3.5" />} accent="text-gold" />
          <Stat label={t("totalCom")} value={`₩${(stats?.total_commission ?? 0).toLocaleString()}`} icon={<Crown className="w-3.5 h-3.5" />} accent="text-gold" />
        </div>

        {!hasInviter && (
          <div className="rounded-2xl glass p-3 border border-border">
            <div className="text-[10px] text-muted-foreground mb-1.5 break-keep">{t("applyTitle")}</div>
            <div className="flex gap-2">
              <input
                value={applyCode}
                onChange={e => setApplyCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="ABCD1234"
                disabled={daysLeft === 0}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-input/60 border border-border text-sm font-mono tracking-wider tabular-nums focus:border-gold outline-none disabled:opacity-40"
                maxLength={8}
              />
              <button onClick={apply} disabled={applying || applyCode.length !== 8 || daysLeft === 0}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-gradient-gold text-black text-xs font-black disabled:opacity-40">
                {t("applyBtn")}
              </button>
            </div>
            {daysLeft === 0 && (
              <p className="text-[10px] text-muted-foreground mt-2 break-keep">{t("windowExpired")}</p>
            )}
          </div>
        )}

        <ul className="mt-3 space-y-1 text-[10px] text-muted-foreground break-keep">
          <li>{t("rule1")}</li>
          <li>{t("rule2")}</li>
          <li>{t("rule3")}</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="glass rounded-xl p-2.5">
      <div className={`flex items-center gap-1 text-[10px] ${accent} break-keep`}>{icon}<span>{label}</span></div>
      <div className="font-display font-black text-sm mt-0.5 text-money-strong tabular-nums">{value}</div>
    </div>
  );
}
