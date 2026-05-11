import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/lib/i18n";
import { useDB, formatKRW } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { useDailyCap, type DailyCap } from "@/hooks/use-daily-cap";
import DailyCapMeter from "@/components/wallet/DailyCapMeter";
import ClaimResultModal from "@/components/ai/ClaimResultModal";
import { useClaimFlow } from "@/hooks/use-claim-flow";
import type { Database } from "@/integrations/supabase/types";
import {
  Bot, Sparkles, TrendingUp, ImageIcon, Loader2, Check, Lock,
  Crown, Zap, RefreshCw, Wallet, Clock, Flame,
} from "lucide-react";

type DbTier = Database["public"]["Enums"]["user_tier"];

type Kind = "content" | "trading" | "image";
type Status = "running" | "ready" | "claimed" | "failed";
type Run = {
  id: string;
  user_id: string;
  kind: Kind;
  status: Status;
  prompt: string | null;
  output_text: string | null;
  output_path: string | null;
  reward: number;
  trading_pnl_pct: number | null;
  started_at: string;
  expires_at: string | null;
  ready_at: string | null;
  claimed_at: string | null;
  error: string | null;
};

const TIER_LIMITS: Record<string, Record<Kind, number>> = {
  NORMAL: { content: 1, trading: 1, image: 1 },
  VIP:    { content: 3, trading: 2, image: 2 },
  GOD:    { content: 10, trading: 5, image: 5 },
  EMPIRE: { content: 30, trading: 10, image: 10 },
};
const TIER_BOOST: Record<string, number> = { NORMAL: 1, VIP: 1.35, GOD: 1.8, EMPIRE: 2.5 };
const BASE_REWARD: Record<Kind, number> = { content: 3000, trading: 8000, image: 5000 };

/* ============================================================
   MAIN EXPORT — bundle of 3 bot cards
   ============================================================ */
export default function AIBotCards() {
  const { t } = useTranslation("aibot");
  const [db] = useDB();
  const user = db.user;
  const tier = (user?.tier ?? "NORMAL").toUpperCase();
  const isEmpire = tier === "EMPIRE";
  const dbTier = (user?.tier ?? "normal").toLowerCase() as DbTier;
  const dailyCap = useDailyCap(user?.id, dbTier);

  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("ai_bot_runs")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(40);
      if (alive) { setRuns((data as Run[]) ?? []); setLoading(false); }
    };
    load();
    const ch = supabase
      .channel(`ai_bots:${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "ai_bot_runs", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);
  const usedToday = (kind: Kind) =>
    runs.filter(r => r.kind === kind && r.started_at.slice(0, 10) === today && r.status !== "failed").length;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center glow-primary">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg leading-tight flex items-center gap-2">
              {t("headerTitle")}
              {isEmpire && <Crown className="w-4 h-4 text-gold animate-pulse" />}
            </h2>
            <p className="text-[10px] text-muted-foreground break-keep">{t("headerSub")}</p>
          </div>
        </div>
        <span className="text-[10px] glass px-2 py-1 rounded-full font-bold text-gold tabular-nums">
          {t("tierLine", { tier, boost: (TIER_BOOST[tier] ?? 1).toFixed(2) })}
        </span>
      </div>

      {/* Daily cap meter */}
      <DailyCapMeter
        cap={dailyCap.cap}
        used={dailyCap.used}
        remaining={dailyCap.remaining}
        pct={dailyCap.pct}
        loading={dailyCap.loading}
      />

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ContentFarmerCard tier={tier} runs={runs} used={usedToday("content")} loading={loading} dailyCap={dailyCap} />
        <TradingBotCard    tier={tier} runs={runs} used={usedToday("trading")} loading={loading} dailyCap={dailyCap} />
        <ImageMakerCard    tier={tier} runs={runs} used={usedToday("image")} loading={loading} dailyCap={dailyCap} />
      </div>
    </section>
  );
}

/* ============================================================
   shared — RPC + edge call + signed URL
   ============================================================ */
function botT(key: string, opts?: any): string {
  // Helper for use outside React (errors thrown from async fns).
  return (i18n.getFixedT(null, "aibot") as any)(key, opts);
}

async function startRun(kind: Kind, prompt: string) {
  const { data: started, error: e1 } = await supabase.rpc("start_ai_bot_run", { _kind: kind, _prompt: prompt });
  if (e1) {
    const m = e1.message || "";
    if (m.includes("daily_limit")) throw new Error(botT("err.dailyLimit"));
    if (m.includes("prompt_too_long")) throw new Error(botT("err.promptLong"));
    throw new Error(m);
  }
  const runId = (started as any)?.id;
  if (!runId) throw new Error(botT("err.runIdMissing"));

  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-bot-run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ run_id: runId, kind, prompt }),
  });
  if (r.status === 429) throw new Error(botT("err.rate429"));
  if (r.status === 402) throw new Error(botT("err.rate402"));
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(botT("err.callFail", { msg: txt.slice(0, 80) }));
  }
  return runId as string;
}

async function claimRun(runId: string) {
  const { data, error } = await supabase.rpc("claim_ai_bot_run", { _run_id: runId });
  if (error) {
    const m = error.message || "";
    if (m.includes("not_ready")) throw new Error(botT("err.notReady"));
    if (m.includes("already_claimed")) throw new Error(botT("err.already"));
    throw new Error(m);
  }
  const { refreshWallet } = await import("@/lib/walletRefresh");
  refreshWallet();
  return data as { ok: boolean; reward: number; pnl_pct: number | null };
}

async function shareToLounge(opts: {
  user_id: string; nickname: string | null; tier: string;
  kind: Kind; reward: number; pnl_pct: number | null;
  output_text: string | null; output_path: string | null;
}) {
  const titleKey = opts.kind === "content" ? "content.shareTitle"
    : opts.kind === "trading" ? "trading.shareTitle"
    : "image.shareTitle";
  const title = botT(titleKey);
  const pnlSuffix = opts.pnl_pct != null
    ? ` (${opts.pnl_pct >= 0 ? "+" : ""}${opts.pnl_pct.toFixed(2)}%)`
    : "";
  const msg = botT("shareMsg", {
    title,
    amt: opts.reward.toLocaleString(),
    pnl: pnlSuffix,
  });
  await supabase.from("chat_messages").insert({
    user_id: opts.user_id,
    nickname: opts.nickname,
    message: msg,
    kind: "ai_bot_share",
    metadata: {
      bot_kind: opts.kind,
      tier: opts.tier,
      reward: opts.reward,
      pnl_pct: opts.pnl_pct,
      output_text: (opts.output_text ?? "").slice(0, 240),
      output_path: opts.output_path,
    },
  } as any);
}

async function getSignedUrl(path: string) {
  const { data } = await supabase.storage.from("ai-outputs").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/* ============================================================
   1) Daily AI Content Farmer
   ============================================================ */
function ContentFarmerCard({ tier, runs, used, loading, dailyCap }: { tier: string; runs: Run[]; used: number; loading: boolean; dailyCap: DailyCap & { reload: () => Promise<void> } }) {
  const { t } = useTranslation("aibot");
  const limit = TIER_LIMITS[tier]?.content ?? 1;
  const reward = Math.floor(BASE_REWARD.content * (TIER_BOOST[tier] ?? 1));
  const latest = useMemo(() => runs.find(r => r.kind === "content" && r.status !== "failed"), [runs]);
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const claimFlow = useClaimFlow({
    reloadCap: dailyCap.reload,
    capRemainingAfter: () => dailyCap.remaining,
    errorTitle: t("err.err"),
  });

  useEffect(() => {
    if (latest?.output_path) getSignedUrl(latest.output_path).then(setImgUrl);
  }, [latest?.output_path]);

  const run = async () => {
    setBusy(true);
    try {
      await startRun("content", topic.trim().slice(0, 200));
      toast({ title: t("content.toastStart") });
      setTopic("");
    } catch (e: any) { toast({ title: t("err.runFail"), description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const claim = async () => {
    if (!latest) return;
    const r = await claimFlow.runClaim(latest.id, {
      kind: "content",
      expected: reward,
      capLeftBefore: dailyCap.remaining,
    });
    if (!r || r.reward <= 0) return;
  };

  const doShare = async () => {
    if (!latest) return;
    const u = (await supabase.auth.getUser()).data.user;
    if (!u) return;
    await shareToLounge({
      user_id: u.id, nickname: u.user_metadata?.nickname ?? null, tier,
      kind: "content", reward: claimFlow.modal.actual, pnl_pct: claimFlow.modal.pnl_pct,
      output_text: latest.output_text, output_path: latest.output_path,
    });
    claimFlow.markShared();
  };

  const isReady = latest?.status === "ready";
  const isRunning = latest?.status === "running";
  const isClaimed = latest?.status === "claimed";

  return (
    <>
    <BotCard
      icon={<Sparkles className="w-4 h-4" />}
      title={t("content.title")}
      subtitle={t("content.subtitle")}
      accent="primary"
      reward={reward}
      used={used}
      limit={limit}
    >
      {!loading && (isReady || isClaimed) && latest && (
        <div className="space-y-2 animate-fade-in">
          {imgUrl && (
            <div className="relative rounded-xl overflow-hidden aspect-video bg-muted">
              <img src={imgUrl} alt={t("content.imgAlt")} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              {isClaimed && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-secondary/90 text-[9px] font-black text-secondary-foreground flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t("content.claimedBadge")}
                </div>
              )}
            </div>
          )}
          <p className="text-[11px] text-foreground/90 leading-relaxed line-clamp-4 whitespace-pre-line">
            {latest.output_text}
          </p>
        </div>
      )}

      {isRunning && <RunningPulse label={t("content.running")} />}

      <div className="space-y-2 pt-2">
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder={t("content.topicPh")}
          maxLength={200}
          disabled={busy || isRunning}
          className="w-full px-3 py-2 text-xs rounded-lg bg-input/60 border border-border focus:border-primary outline-none"
        />
        <div className="flex gap-2">
          <ActionButton
            variant="primary"
            disabled={busy || isRunning || used >= limit}
            onClick={run}
            icon={busy || isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            label={used >= limit ? t("limitOver") : isRunning ? t("generating") : t("runBot")}
          />
          {isReady && (
            <ActionButton variant="gold" onClick={claim} icon={<Wallet className="w-3.5 h-3.5" />} label={`+${formatKRW(reward)}`} />
          )}
        </div>
      </div>
    </BotCard>
    <ClaimResultModal
      open={claimFlow.modal.open}
      onClose={claimFlow.closeModal}
      outcome={claimFlow.modal.outcome}
      expected={claimFlow.modal.expected}
      actual={claimFlow.modal.actual}
      pnlPct={claimFlow.modal.pnl_pct}
      capRemaining={claimFlow.modal.capRemaining}
      onShare={doShare}
      shared={claimFlow.modal.shared}
      botKindLabel={t("content.title")}
    />
    </>
  );
}

/* ============================================================
   2) AI Trading Simulator Bot (8h)
   ============================================================ */
function TradingBotCard({ tier, runs, used, loading, dailyCap }: { tier: string; runs: Run[]; used: number; loading: boolean; dailyCap: DailyCap & { reload: () => Promise<void> } }) {
  const { t } = useTranslation("aibot");
  const limit = TIER_LIMITS[tier]?.trading ?? 1;
  const baseReward = Math.floor(BASE_REWARD.trading * (TIER_BOOST[tier] ?? 1));
  const latest = useMemo(() => runs.find(r => r.kind === "trading" && r.status !== "failed" && r.status !== "claimed"), [runs]);
  const lastClaimed = useMemo(() => runs.find(r => r.kind === "trading" && r.status === "claimed"), [runs]);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [, force] = useState(0);
  const claimFlow = useClaimFlow({
    reloadCap: dailyCap.reload,
    capRemainingAfter: () => dailyCap.remaining,
    errorTitle: t("err.err"),
  });

  // Realtime progress tick
  useEffect(() => {
    if (!latest?.expires_at) return;
    const i = setInterval(() => force(x => x + 1), 1000);
    return () => clearInterval(i);
  }, [latest?.expires_at]);

  const progress = useMemo(() => {
    if (!latest?.expires_at) return 0;
    const total = 8 * 60 * 60 * 1000;
    const left = new Date(latest.expires_at).getTime() - Date.now();
    return Math.max(0, Math.min(100, ((total - left) / total) * 100));
  }, [latest?.expires_at, runs]);

  const remaining = useMemo(() => {
    if (!latest?.expires_at) return "";
    const ms = Math.max(0, new Date(latest.expires_at).getTime() - Date.now());
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [latest?.expires_at, runs, progress]);

  const run = async () => {
    setBusy(true);
    try {
      await startRun("trading", hint.trim().slice(0, 200));
      toast({ title: t("trading.toastStart") });
      setHint("");
    } catch (e: any) { toast({ title: t("err.runFail"), description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const claim = async () => {
    if (!latest) return;
    await claimFlow.runClaim(latest.id, {
      kind: "trading",
      expected: baseReward,
      capLeftBefore: dailyCap.remaining,
    });
  };

  const doShare = async () => {
    if (!latest) return;
    const u = (await supabase.auth.getUser()).data.user;
    if (!u) return;
    await shareToLounge({
      user_id: u.id, nickname: u.user_metadata?.nickname ?? null, tier,
      kind: "trading", reward: claimFlow.modal.actual, pnl_pct: claimFlow.modal.pnl_pct,
      output_text: latest.output_text, output_path: latest.output_path,
    });
    claimFlow.markShared();
  };

  const isReady = !!latest && progress >= 100;
  const isRunning = !!latest && progress < 100;

  return (
    <>
    <BotCard
      icon={<TrendingUp className="w-4 h-4" />}
      title={t("trading.title")}
      subtitle={t("trading.subtitle")}
      accent="secondary"
      reward={baseReward}
      used={used}
      limit={limit}
    >
      {isRunning && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-secondary font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 animate-pulse" /> {t("trading.running")}
            </span>
            <span className="font-mono font-black text-foreground tabular-nums">{remaining}</span>
          </div>
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-secondary via-primary to-accent transition-all duration-1000 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground line-clamp-2 whitespace-pre-line">
            {latest?.output_text || t("trading.positionAnalyzing")}
          </p>
        </div>
      )}

      {isReady && latest && (
        <div className="space-y-2 animate-scale-in">
          <div className="rounded-xl glass-strong p-3 border border-secondary/40">
            <div className="text-[9px] text-muted-foreground">{t("trading.ready")}</div>
            <p className="text-[11px] mt-1 line-clamp-3 whitespace-pre-line">{latest.output_text}</p>
          </div>
        </div>
      )}

      {!latest && lastClaimed && (
        <div className="text-[10px] text-muted-foreground glass rounded-lg p-2 tabular-nums">
          {t("trading.last")}: {(lastClaimed.trading_pnl_pct ?? 0).toFixed(2)}% · +{formatKRW(lastClaimed.reward)}
        </div>
      )}

      <div className="space-y-2 pt-2">
        {!isRunning && !isReady && (
          <input
            value={hint}
            onChange={e => setHint(e.target.value)}
            placeholder={t("trading.hintPh")}
            maxLength={200}
            disabled={busy}
            className="w-full px-3 py-2 text-xs rounded-lg bg-input/60 border border-border focus:border-secondary outline-none"
          />
        )}
        <div className="flex gap-2">
          {!isReady && (
            <ActionButton
              variant="secondary"
              disabled={busy || isRunning || used >= limit}
              onClick={run}
              icon={busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isRunning ? <Clock className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              label={used >= limit ? t("limitOver") : isRunning ? t("trading.runningLabel") : t("trading.runLabel")}
            />
          )}
          {isReady && (
            <ActionButton variant="gold" onClick={claim} icon={<Wallet className="w-3.5 h-3.5" />} label={t("trading.claimLabel")} />
          )}
        </div>
      </div>
    </BotCard>
    <ClaimResultModal
      open={claimFlow.modal.open}
      onClose={claimFlow.closeModal}
      outcome={claimFlow.modal.outcome}
      expected={claimFlow.modal.expected}
      actual={claimFlow.modal.actual}
      pnlPct={claimFlow.modal.pnl_pct}
      capRemaining={claimFlow.modal.capRemaining}
      onShare={doShare}
      shared={claimFlow.modal.shared}
      botKindLabel={t("trading.title")}
    />
    </>
  );
}

/* ============================================================
   3) AI Image Empire Maker
   ============================================================ */
function ImageMakerCard({ tier, runs, used, loading, dailyCap }: { tier: string; runs: Run[]; used: number; loading: boolean; dailyCap: DailyCap & { reload: () => Promise<void> } }) {
  const { t } = useTranslation("aibot");
  const limit = TIER_LIMITS[tier]?.image ?? 1;
  const reward = Math.floor(BASE_REWARD.image * (TIER_BOOST[tier] ?? 1));
  const latest = useMemo(() => runs.find(r => r.kind === "image" && r.status !== "failed"), [runs]);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const claimFlow = useClaimFlow({
    reloadCap: dailyCap.reload,
    capRemainingAfter: () => dailyCap.remaining,
    errorTitle: t("err.err"),
  });

  const presets = [
    t("image.preset1"),
    t("image.preset2"),
    t("image.preset3"),
    t("image.preset4"),
  ];

  useEffect(() => {
    if (latest?.output_path) getSignedUrl(latest.output_path).then(setImgUrl);
  }, [latest?.output_path]);

  const run = async () => {
    if (!prompt.trim()) { toast({ title: t("image.promptReq"), variant: "destructive" }); return; }
    setBusy(true);
    try {
      await startRun("image", prompt.trim().slice(0, 500));
      toast({ title: t("image.toastStart") });
      setPrompt("");
    } catch (e: any) { toast({ title: t("err.runFail"), description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const claim = async () => {
    if (!latest) return;
    await claimFlow.runClaim(latest.id, {
      kind: "image",
      expected: reward,
      capLeftBefore: dailyCap.remaining,
    });
  };

  const doShare = async () => {
    if (!latest) return;
    const u = (await supabase.auth.getUser()).data.user;
    if (!u) return;
    await shareToLounge({
      user_id: u.id, nickname: u.user_metadata?.nickname ?? null, tier,
      kind: "image", reward: claimFlow.modal.actual, pnl_pct: claimFlow.modal.pnl_pct,
      output_text: latest.output_text, output_path: latest.output_path,
    });
    claimFlow.markShared();
  };

  const isReady = latest?.status === "ready";
  const isRunning = latest?.status === "running";
  const isClaimed = latest?.status === "claimed";

  return (
    <>
    <BotCard
      icon={<ImageIcon className="w-4 h-4" />}
      title={t("image.title")}
      subtitle={t("image.subtitle")}
      accent="accent"
      reward={reward}
      used={used}
      limit={limit}
    >
      {(isReady || isClaimed) && imgUrl && (
        <div className="relative rounded-xl overflow-hidden aspect-square bg-muted animate-scale-in">
          <img src={imgUrl} alt={t("image.imgAlt")} className="w-full h-full object-cover" loading="lazy" />
          {isClaimed && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-secondary/90 text-[9px] font-black flex items-center gap-1">
              <Check className="w-3 h-3" /> {t("image.doneBadge")}
            </div>
          )}
        </div>
      )}

      {isRunning && <RunningPulse label={t("image.running")} />}

      <div className="space-y-2 pt-2">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={t("image.promptPh")}
          rows={2}
          maxLength={500}
          disabled={busy || isRunning}
          className="w-full px-3 py-2 text-xs rounded-lg bg-input/60 border border-border focus:border-accent outline-none resize-none"
        />
        <div className="flex flex-wrap gap-1">
          {presets.map(p => (
            <button key={p} onClick={() => setPrompt(p)}
              className="text-[9px] px-2 py-1 rounded-full glass hover:bg-accent/20 transition">
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <ActionButton
            variant="accent"
            disabled={busy || isRunning || used >= limit}
            onClick={run}
            icon={busy || isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            label={used >= limit ? t("limitOver") : isRunning ? t("generating") : t("image.runLabel")}
          />
          {isReady && (
            <ActionButton variant="gold" onClick={claim} icon={<Wallet className="w-3.5 h-3.5" />} label={`+${formatKRW(reward)}`} />
          )}
        </div>
      </div>
    </BotCard>
    <ClaimResultModal
      open={claimFlow.modal.open}
      onClose={claimFlow.closeModal}
      outcome={claimFlow.modal.outcome}
      expected={claimFlow.modal.expected}
      actual={claimFlow.modal.actual}
      pnlPct={claimFlow.modal.pnl_pct}
      capRemaining={claimFlow.modal.capRemaining}
      onShare={doShare}
      shared={claimFlow.modal.shared}
      botKindLabel={t("image.title")}
    />
    </>
  );
}

/* ============================================================
   shared UI primitives
   ============================================================ */
function BotCard({ icon, title, subtitle, accent, reward, used, limit, children }: {
  icon: React.ReactNode; title: string; subtitle: string;
  accent: "primary" | "secondary" | "accent"; reward: number; used: number; limit: number;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("aibot");
  const accentRing = {
    primary: "hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)] from-primary/20",
    secondary: "hover:shadow-[0_0_30px_-5px_hsl(var(--secondary)/0.5)] from-secondary/20",
    accent: "hover:shadow-[0_0_30px_-5px_hsl(var(--accent)/0.5)] from-accent/20",
  }[accent];
  const accentText = {
    primary: "text-primary", secondary: "text-secondary", accent: "text-accent",
  }[accent];

  const exhausted = used >= limit;

  return (
    <div className={`relative glass-strong rounded-2xl p-4 neon-border overflow-hidden transition-all duration-500 hover:-translate-y-0.5 ${accentRing}`}>
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br blur-3xl opacity-30 ${accentRing.split(" ")[1]}`} />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl glass flex items-center justify-center ${accentText}`}>
              {icon}
            </div>
            <div>
              <h3 className="font-display font-black text-sm leading-tight break-keep">{title}</h3>
              <p className="text-[10px] text-muted-foreground break-keep">{subtitle}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-muted-foreground">{t("baseReward")}</div>
            <div className="font-display font-black text-xs text-gold tabular-nums">+{formatKRW(reward)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">{t("todayUsed")}</span>
          <span className={`font-bold tabular-nums ${exhausted ? "text-destructive" : "text-foreground"}`}>{used}/{limit}</span>
        </div>
        <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
          <div className={`h-full transition-all ${exhausted ? "bg-destructive" : "bg-gradient-to-r from-primary via-accent to-secondary"}`}
            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
        </div>

        {children}
      </div>
    </div>
  );
}

function ActionButton({ variant, disabled, onClick, icon, label }: {
  variant: "primary" | "secondary" | "accent" | "gold";
  disabled?: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  const cls = {
    primary:   "bg-gradient-primary text-primary-foreground glow-primary",
    secondary: "bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground",
    accent:    "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground",
    gold:      "bg-gradient-gold text-gold-foreground glow-gold",
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex-1 min-h-[44px] py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 break-keep ${cls}`}>
      {icon}{label}
    </button>
  );
}

function RunningPulse({ label }: { label: string }) {
  return (
    <div className="rounded-xl glass p-3 flex items-center gap-3 animate-pulse">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-[11px] text-muted-foreground break-keep">{label}</span>
    </div>
  );
}

/* ============================================================
   compact dashboard summary
   ============================================================ */
export function ActiveBotsMini() {
  const { t } = useTranslation("aibot");
  const [db] = useDB();
  const [count, setCount] = useState({ running: 0, ready: 0 });

  useEffect(() => {
    if (!db.user?.id) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("ai_bot_runs")
        .select("status").eq("user_id", db.user!.id)
        .in("status", ["running", "ready"]);
      if (!alive) return;
      const rows = (data ?? []) as { status: Status }[];
      setCount({
        running: rows.filter(r => r.status === "running").length,
        ready:   rows.filter(r => r.status === "ready").length,
      });
    };
    load();
    const ch = supabase.channel(`ai_mini:${db.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_bot_runs", filter: `user_id=eq.${db.user.id}` }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [db.user?.id]);

  if (!db.user) return null;
  const total = count.running + count.ready;
  if (total === 0) return null;

  return (
    <Link to="/missions" className="block glass-strong rounded-2xl p-3 neon-border hover:scale-[1.01] transition">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-muted-foreground">{t("mini.active")}</div>
          <div className="text-sm font-display font-black tabular-nums">
            {t("mini.running", { n: count.running })} · <span className="text-secondary">{t("mini.ready", { n: count.ready })}</span>
          </div>
        </div>
        <RefreshCw className="w-4 h-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
