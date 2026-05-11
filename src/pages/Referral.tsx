import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Crown, Copy, Share2, Rocket, Users, Sparkles, TrendingUp,
  Trophy, ChevronDown, MessageCircle, Instagram, Music2, Youtube, Globe, Send,
} from "lucide-react";
import DMComposer from "@/components/guide/DMComposer";
import EmpireTreePreview from "@/components/referral/EmpireTreePreview";

type Stats = {
  code: string | null;
  invited: number;
  active_7d: number;
  total_commission: number;
  today_commission: number;
};

type Invitee = {
  invitee_id: string;
  created_at: string;
  signup_bonus_paid: boolean;
  first_deposit_bonus_paid: boolean;
  total_commission: number;
  nickname?: string | null;
};

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

const SHARE_TEMPLATES = [
  { id: "tiktok", icon: Music2, key: "tiktok" },
  { id: "instagram", icon: Instagram, key: "instagram" },
  { id: "threads", icon: Sparkles, key: "threads" },
  { id: "kakao", icon: MessageCircle, key: "kakao" },
  { id: "naver", icon: Globe, key: "naver" },
  { id: "youtube", icon: Youtube, key: "youtube" },
] as const;

export default function Referral() {
  const { t } = useTranslation("referralPage");
  const { t: tr } = useTranslation("referral");
  const [stats, setStats] = useState<Stats | null>(null);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFAQ, setOpenFAQ] = useState<string | null>("q1");

  const load = async () => {
    setLoading(true);
    try {
      const { data: s } = await supabase.rpc("get_referral_stats");
      if (s) setStats(s as any);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: rows } = await supabase
          .from("referrals")
          .select("invitee_id, created_at, signup_bonus_paid, first_deposit_bonus_paid, total_commission")
          .eq("inviter_id", u.user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (rows && rows.length) {
          const ids = rows.map(r => r.invitee_id);
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, nickname")
            .in("id", ids);
          const nickMap = new Map((profs ?? []).map((p: any) => [p.id, p.nickname]));
          setInvitees(rows.map((r: any) => ({ ...r, nickname: nickMap.get(r.invitee_id) ?? null })));
        }
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const link = stats?.code ? `${window.location.origin}/?ref=${stats.code}` : "";

  const copy = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: tr("copied", { label: label ?? tr("labelLink") }) });
    } catch { toast({ title: tr("copyFail"), variant: "destructive" }); }
  };

  const share = async () => {
    if (!link) return;
    const text = tr("shareText", { code: stats?.code });
    if (navigator.share) {
      try { await navigator.share({ title: tr("shareTitle"), text, url: link }); return; } catch {}
    }
    await copy(`${text}\n${link}`, tr("labelMsg"));
  };

  const buildTemplate = (tplKey: string) => {
    if (!stats?.code) return "";
    return t(`templates.${tplKey}`, { code: stats.code, link }) + "\n\n[광고] 수신거부: 차단/신고";
  };

  const stages = useMemo(() => ([
    { key: "stage1", amount: 5_000, color: "from-primary/30 via-primary/15 to-transparent", border: "border-primary/40", text: "text-primary" },
    { key: "stage2", amount: 25_000, color: "from-accent/30 via-accent/15 to-transparent", border: "border-accent/40", text: "text-accent" },
    { key: "stage3", amount: 2_000, color: "from-gold/30 via-gold/15 to-transparent", border: "border-gold/40", text: "text-gold" },
  ] as const), []);

  return (
    <Layout>
      <HubTabs hub="legacy" />
      <div className="container pt-4 pb-12 animate-liquid-in space-y-6">

        {/* HERO */}
        <section className="relative glass-strong rounded-3xl p-6 md:p-8 neon-border overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-gold blur-3xl opacity-25" />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-gradient-primary blur-3xl opacity-30" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Rocket className="w-5 h-5 text-gold" />
              <span className="text-xs font-bold tracking-widest text-gold/90">{t("hero.badge")}</span>
            </div>
            <h1 className="font-imperial text-2xl md:text-4xl text-gradient-imperial tracking-[0.12em] break-keep mb-2">
              {t("hero.title")}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground break-keep mb-5">
              {t("hero.subtitle")}
            </p>

            <div className="rounded-2xl bg-gradient-to-br from-gold/15 via-primary/10 to-accent/10 border border-gold/30 p-5 mb-4">
              <div className="text-[11px] text-muted-foreground mb-1">{tr("myCode")}</div>
              <div className="flex items-center gap-3">
                <div className="font-display font-black text-3xl md:text-4xl tracking-widest text-gradient-gold flex-1 tabular-nums">
                  {loading ? "—" : (stats?.code ?? "—")}
                </div>
                <button
                  onClick={() => copy(stats?.code ?? "", tr("labelCode"))}
                  className="w-12 h-12 rounded-xl glass hover:scale-105 transition flex items-center justify-center"
                  aria-label={tr("labelCode")}
                >
                  <Copy className="w-5 h-5 text-gold" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => copy(link, tr("labelLink"))}
                  className="min-h-[48px] py-3 rounded-xl glass text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/10 transition"
                >
                  <Copy className="w-4 h-4" /> {tr("copyLink")}
                </button>
                <button
                  onClick={share}
                  className="min-h-[48px] py-3 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-black flex items-center justify-center gap-2 glow-primary hover:scale-[1.02] transition"
                >
                  <Share2 className="w-4 h-4" /> {tr("shareFriend")}
                </button>
              </div>
            </div>

            <div className="text-center text-xs md:text-sm text-muted-foreground break-keep">
              {t("hero.summary", {
                count: stats?.invited ?? 0,
                total: (stats?.total_commission ?? 0).toLocaleString(),
              })}
            </div>
          </div>
        </section>

        {/* 3-STEP ROCKET */}
        <section>
          <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-gold" /> {t("rocket.title")}
          </h2>
          <div className="space-y-2.5">
            {stages.map((s, i) => (
              <div
                key={s.key}
                className={`relative rounded-2xl p-4 border ${s.border} bg-gradient-to-r ${s.color} glass`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl glass-strong flex items-center justify-center font-black ${s.text} tabular-nums`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-muted-foreground">{t(`rocket.${s.key}.label`)}</div>
                    <div className="font-bold text-sm break-keep">{t(`rocket.${s.key}.desc`)}</div>
                  </div>
                  <div className={`font-display font-black text-lg ${s.text} tabular-nums`}>
                    ₩{s.amount.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 break-keep">{t("rocket.disclaimer")}</p>
        </section>

        {/* STATS DASHBOARD */}
        <section>
          <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> {t("dashboard.title")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <StatBox label={t("dashboard.today")} value={`₩${(stats?.today_commission ?? 0).toLocaleString()}`} accent="text-gold" />
            <StatBox label={t("dashboard.total")} value={`₩${(stats?.total_commission ?? 0).toLocaleString()}`} accent="text-primary" />
            <StatBox label={tr("invited")} value={tr("countUnit", { n: stats?.invited ?? 0 })} accent="text-secondary" />
            <StatBox label={tr("active7")} value={tr("countUnit", { n: stats?.active_7d ?? 0 })} accent="text-accent" />
          </div>

          <div className="glass rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">{t("dashboard.myInvitees")}</h3>
            </div>
            {invitees.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 break-keep">
                {t("dashboard.empty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {invitees.map((inv) => {
                  const stage = inv.first_deposit_bonus_paid
                    ? { label: t("dashboard.stagePurchase"), color: "text-gold" }
                    : inv.signup_bonus_paid
                      ? { label: t("dashboard.stageSignup"), color: "text-primary" }
                      : { label: t("dashboard.stageJoined"), color: "text-muted-foreground" };
                  return (
                    <li key={inv.invitee_id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {(inv.nickname?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{inv.nickname ?? t("dashboard.anonymous")}</div>
                        <div className={`text-[10px] ${stage.color}`}>{stage.label}</div>
                      </div>
                      <div className="text-xs font-display font-black text-money tabular-nums">
                        ₩{(inv.total_commission ?? 0).toLocaleString()}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* SHARE KIT */}
        <section>
          <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2">
            <Send className="w-5 h-5 text-accent" /> {t("shareKit.title")}
          </h2>
          <p className="text-xs text-muted-foreground mb-3 break-keep">{t("shareKit.subtitle")}</p>
          <div className="grid gap-2">
            {SHARE_TEMPLATES.map(({ id, icon: Icon, key }) => (
              <div key={id} className="glass rounded-2xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">{t(`shareKit.${key}.label`)}</span>
                </div>
                <p className="text-xs text-foreground/85 whitespace-pre-line break-keep mb-2">
                  {buildTemplate(key)}
                </p>
                <button
                  onClick={() => copy(buildTemplate(key), t(`shareKit.${key}.label`))}
                  disabled={!stats?.code}
                  className="min-h-[40px] w-full py-2 rounded-lg bg-gradient-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Copy className="w-3.5 h-3.5" /> {t("shareKit.copyBtn")}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 break-keep">{t("shareKit.compliance")}</p>
        </section>

        {/* AI DM COMPOSER */}
        <DMComposer referralLink={link || undefined} />

        {/* FAQ */}
        <section>
          <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" /> {t("faq.title")}
          </h2>
          <div className="space-y-2">
            {FAQ_KEYS.map((q) => {
              const open = openFAQ === q;
              return (
                <button
                  key={q}
                  onClick={() => setOpenFAQ(open ? null : q)}
                  className="w-full text-left glass rounded-2xl p-4 border border-border"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold break-keep">{t(`faq.${q}.q`)}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </div>
                  {open && (
                    <p className="text-xs text-muted-foreground mt-2 break-keep">{t(`faq.${q}.a`)}</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <p className="text-[10px] text-muted-foreground text-center break-keep pt-4">
          {t("footer.disclaimer")}
        </p>
      </div>
    </Layout>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className={`text-[10px] ${accent} break-keep`}>{label}</div>
      <div className="font-display font-black text-base mt-1 text-money-strong tabular-nums">{value}</div>
    </div>
  );
}
