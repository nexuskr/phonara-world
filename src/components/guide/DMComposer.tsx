import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Sparkles, Wand2, AlertTriangle, Loader2, Save } from "lucide-react";
import DMVariantCard from "@/components/guide/DMVariantCard";
import { summaryRisk, auditDM, PLATFORMS, type Channel } from "@/lib/dmAudit";

type Tone = "friendly" | "formal" | "playful" | "hype";

const CHANNELS: Channel[] = ["tiktok", "instagram", "threads", "naver", "youtube", "kakao"];
const TONES: Tone[] = ["friendly", "formal", "playful", "hype"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const todayKey = () => `dm_sent_${todayISO()}`;

export default function DMComposer({ referralLink }: { referralLink?: string }) {
  const { t } = useTranslation("dmComposer");
  const [channel, setChannel] = useState<Channel>("instagram");
  const [keywords, setKeywords] = useState("부업, AI, 재테크");
  const [persona, setPersona] = useState("20~30대 직장인 부업 관심층");
  const [tone, setTone] = useState<Tone>("friendly");
  const [count, setCount] = useState(5);
  const [dailySafeLine, setDailySafeLine] = useState(60);
  const [variants, setVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sentToday, setSentToday] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Load user + prefs
  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: prefs } = await supabase
        .from("dm_composer_prefs")
        .select("channel,keywords,persona,tone,count,daily_safe_line")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prefs) {
        if (CHANNELS.includes(prefs.channel as Channel)) setChannel(prefs.channel as Channel);
        if (prefs.keywords) setKeywords(prefs.keywords);
        if (prefs.persona) setPersona(prefs.persona);
        if (TONES.includes(prefs.tone as Tone)) setTone(prefs.tone as Tone);
        if (prefs.count) setCount(prefs.count);
        if (prefs.daily_safe_line) setDailySafeLine(prefs.daily_safe_line);
      }
    })();
    const v = Number(localStorage.getItem(todayKey()) || "0");
    setSentToday(Number.isFinite(v) ? v : 0);
  }, []);

  const dangerLevel = useMemo<"safe" | "warn" | "danger">(() => {
    const warn = dailySafeLine;
    const hard = Math.max(warn * 1.5, warn + 40);
    if (sentToday >= hard) return "danger";
    if (sentToday >= warn) return "warn";
    return "safe";
  }, [sentToday, dailySafeLine]);

  const auditSummary = useMemo(() => {
    if (!variants.length) return null;
    return summaryRisk(variants.map(v => auditDM(v, channel)));
  }, [variants, channel]);

  const savePrefs = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("dm_composer_prefs")
      .upsert({
        user_id: userId, channel, keywords, persona, tone, count,
        daily_safe_line: dailySafeLine, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "설정 저장 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ 설정 저장됨", description: "다음 접속 시 자동 적용" });
    }
  };

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dm-composer", {
        body: { channel, keywords, persona, tone, count, referralLink },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list = Array.isArray(data?.variants) ? data.variants : [];
      setVariants(list);
      // auto-save prefs on first successful generate
      if (userId) void savePrefs();
      toast({ title: t("toast.generatedTitle"), description: t("toast.generatedDesc", { n: list.length }) });
    } catch (e: any) {
      const msg = e?.message ?? "error";
      const desc =
        msg === "rate_limited" ? t("toast.rateLimit")
        : msg === "payment_required" ? t("toast.paymentRequired")
        : t("toast.genericError");
      toast({ title: t("toast.errorTitle"), description: desc, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVariantCopied = async () => {
    const next = sentToday + 1;
    setSentToday(next);
    localStorage.setItem(todayKey(), String(next));
    // Auto-log to ugc_traffic_events (dm_sent +1)
    if (userId) {
      void supabase.from("ugc_traffic_events").insert({
        user_id: userId,
        channel,
        clicks: 0, signups: 0, conversions: 0,
        dm_sent: 1, dm_responded: 0,
        event_date: todayISO(),
        note: `auto: dm-composer copy (${persona})`,
      } as any);
    }
  };

  const resetCounter = () => {
    setSentToday(0);
    localStorage.setItem(todayKey(), "0");
  };

  return (
    <section>
      <h2 className="font-display font-black text-lg mb-1 flex items-center gap-2">
        <Wand2 className="w-5 h-5 text-primary" /> {t("title")}
      </h2>
      <p className="text-xs text-muted-foreground mb-3 break-keep">{t("subtitle")}</p>

      <div className="glass rounded-2xl p-4 border border-border space-y-3">
        {/* Channel picker */}
        <div>
          <div className="text-[11px] font-bold text-muted-foreground mb-1.5">{t("fields.channel")}</div>
          <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map((c) => {
              const spec = PLATFORMS[c];
              return (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`min-h-[40px] rounded-lg text-xs font-bold border transition-colors ${
                    channel === c ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card border-border text-foreground/80"
                  }`}
                >
                  <span className="mr-1">{spec.emoji}</span>{spec.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            ⓘ {PLATFORMS[channel].hint} · 권장 {PLATFORMS[channel].ideal[0]}~{PLATFORMS[channel].ideal[1]}자
          </p>
        </div>

        {/* Keywords */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground">{t("fields.keywords")}</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm"
          />
        </div>

        {/* Persona */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground">{t("fields.persona")}</label>
          <input
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm"
          />
        </div>

        {/* Tone & count & daily safe-line */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground">{t("fields.tone")}</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="w-full mt-1 rounded-lg bg-background border border-border px-2 py-2 text-sm"
            >
              {TONES.map((tn) => <option key={tn} value={tn}>{t(`tones.${tn}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground">{t("fields.count")}</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full mt-1 rounded-lg bg-background border border-border px-2 py-2 text-sm"
            >
              {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground">일일 안전선</label>
            <select
              value={dailySafeLine}
              onChange={(e) => setDailySafeLine(Number(e.target.value))}
              className="w-full mt-1 rounded-lg bg-background border border-border px-2 py-2 text-sm tabular-nums"
            >
              {[30, 60, 90, 120, 150].map((n) => <option key={n} value={n}>{n}/일</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={generate}
            disabled={loading}
            className="min-h-[44px] rounded-xl bg-gradient-primary text-primary-foreground font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t("generating") : t("generate")}
          </button>
          <button
            onClick={savePrefs}
            disabled={saving || !userId}
            className="min-h-[44px] rounded-xl border border-primary/40 text-primary text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/10 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            설정 저장
          </button>
        </div>
      </div>

      {/* Daily safe-line counter */}
      <div className={`mt-3 rounded-xl p-3 border text-xs flex items-start gap-2 ${
        dangerLevel === "safe" ? "bg-card border-border text-muted-foreground"
        : dangerLevel === "warn" ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-200"
        : "bg-destructive/10 border-destructive/40 text-destructive"
      }`}>
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1 break-keep">
          <div className="font-bold">오늘 발송: {sentToday} / 안전선 {dailySafeLine}</div>
          <div className="opacity-80 mt-0.5">
            {dangerLevel === "danger" ? "⚠ 안전선을 크게 초과 — 차단/신고 위험" :
             dangerLevel === "warn" ? "⚠ 안전선 도달 — 잠시 멈추세요" :
             `✓ 안전 — 일일 안전선 ${dailySafeLine}개 권장`}
          </div>
        </div>
        <button onClick={resetCounter} className="text-[10px] underline opacity-70 hover:opacity-100">초기화</button>
      </div>

      {/* Variants with audit */}
      {variants.length > 0 && (
        <div className="mt-4 space-y-2">
          {auditSummary && (
            <div className="rounded-xl p-3 border border-border bg-card flex items-center justify-between text-xs">
              <span className="font-bold">검수 요약</span>
              <span className="tabular-nums">
                <span className="text-emerald-500">안전 {auditSummary.total - auditSummary.warn - auditSummary.danger}</span>
                {" · "}
                <span className="text-yellow-500">주의 {auditSummary.warn}</span>
                {" · "}
                <span className="text-destructive">위험 {auditSummary.danger}</span>
                {" · 최대 위험도 "}
                <span className="font-black">{auditSummary.max}</span>
              </span>
            </div>
          )}
          {variants.map((v, i) => (
            <DMVariantCard key={i} text={v} channel={channel} index={i} onCopy={handleVariantCopied} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-3 break-keep">{t("compliance")}</p>
    </section>
  );
}
