import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Vault as VaultIcon, Flame, Sparkles } from "lucide-react";

const CoachV2Panel = lazy(() => import("@/packages/apex/coach/CoachV2Panel").then(m => ({ default: m.CoachV2Panel })));

type State = {
  streak: number;
  pity_counter: number;
  last_claim_date: string | null;
};

const RARITY_COLOR: Record<string, string> = {
  common:    "from-zinc-400 to-zinc-200",
  rare:      "from-cyan-400 to-blue-500",
  epic:      "from-fuchsia-500 to-purple-600",
  legendary: "from-amber-400 to-orange-500",
  mythic:    "from-pink-500 via-fuchsia-400 to-cyan-400",
};

export default function ApexVault() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [reveal, setReveal] = useState<{ rarity: string; reward: number } | null>(null);

  async function load() {
    const { data } = await supabase
      .from("daily_vault_state" as any)
      .select("streak, pity_counter, last_claim_date")
      .maybeSingle();
    setState((data as any) ?? { streak: 0, pity_counter: 0, last_claim_date: null });
  }

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = state?.last_claim_date === today;

  async function open() {
    setBusy(true);
    setOpening(true);
    setReveal(null);
    const { data, error } = await supabase.rpc("claim_daily_vault" as any);
    setBusy(false);
    if (error) {
      setOpening(false);
      notify.error(error.message ?? "오늘은 이미 열었습니다");
      return;
    }
    const result = data as any;
    setTimeout(() => {
      setReveal({ rarity: result.rarity, reward: result.reward_phon });
      setOpening(false);
      notify.success(`${String(result.rarity).toUpperCase()} · +${result.reward_phon} PHON`);
      load();
    }, 1600);
  }

  const rarityClass = reveal ? RARITY_COLOR[reveal.rarity] ?? RARITY_COLOR.common : "";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl md:text-4xl font-black apex-gradient-text">
          Daily Vault
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          KST 자정마다 리셋. 7일 연속이면 Epic+ 확정 (Pity 시스템).
        </p>
      </header>

      <div className="relative apex-glass-magenta rounded-3xl p-8 md:p-10 text-center overflow-hidden apex-glow-magenta">
        <div className="absolute inset-0 apex-shimmer pointer-events-none opacity-50" />

        <div className="relative">
          <div
            className={`mx-auto w-44 h-44 md:w-52 md:h-52 rounded-3xl flex items-center justify-center transition-all duration-500 ${
              opening
                ? "apex-gradient animate-spin scale-110"
                : reveal
                  ? `bg-gradient-to-br ${rarityClass} apex-glow-neon`
                  : "apex-gradient apex-pulse"
            }`}
          >
            {opening ? (
              <Sparkles className="w-24 h-24 text-background" />
            ) : (
              <VaultIcon className="w-24 h-24 text-background" />
            )}
          </div>

          {reveal && (
            <div className="mt-6 animate-fade-in">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                {reveal.rarity}
              </p>
              <p className="mt-1 text-5xl font-black apex-text-neon tabular-nums">
                +{reveal.reward.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PHON 적립 완료</p>
            </div>
          )}

          <button
            disabled={busy || claimedToday}
            onClick={open}
            className={`mt-7 px-9 py-3.5 rounded-xl font-black transition ${
              claimedToday
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "apex-gradient text-background apex-pulse"
            }`}
          >
            {claimedToday ? "내일 다시" : busy ? "여는 중…" : "오늘의 Vault 열기"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Flame}   label="연속" value={`${state?.streak ?? 0}일`} highlight={(state?.streak ?? 0) >= 3} />
        <Stat icon={Sparkles} label="Pity" value={`${state?.pity_counter ?? 0}/7`} highlight={(state?.pity_counter ?? 0) >= 5} />
        <Stat icon={VaultIcon} label="다음" value="00:00" />
      </div>

      {/* Rarity table */}
      <section className="apex-glass rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          희귀도 보상 테이블
        </p>
        <ul className="space-y-2 text-sm">
          {[
            ["common",    "60%", "100 PHON"],
            ["rare",      "25%", "500 PHON"],
            ["epic",      "10%", "2,500 PHON"],
            ["legendary", "4%",  "15,000 PHON"],
            ["mythic",    "1%",  "100,000 PHON"],
          ].map(([k, p, v]) => (
            <li key={k} className="flex items-center justify-between">
              <span className={`bg-gradient-to-r ${RARITY_COLOR[k]} bg-clip-text text-transparent font-bold uppercase text-xs tracking-wider`}>
                {k}
              </span>
              <span className="text-muted-foreground tabular-nums text-xs">{p}</span>
              <span className="font-bold tabular-nums">{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <Suspense fallback={<div className="h-24 rounded-xl border border-border bg-card/40 animate-pulse" />}>
        <CoachV2Panel />
      </Suspense>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, highlight,
}: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`apex-glass rounded-xl p-3 text-center ${highlight ? "apex-glow-neon" : ""}`}>
      <Icon className="w-4 h-4 mx-auto text-primary" />
      <p className="text-[10px] uppercase text-muted-foreground mt-1">{label}</p>
      <p className="mt-0.5 font-black apex-text-neon tabular-nums">{value}</p>
    </div>
  );
}
