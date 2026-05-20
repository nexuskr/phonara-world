import { lazy, Suspense, useEffect, useState } from "react";
import { Heart, Share2, ChevronUp, Flame } from "lucide-react";

const EmperorVoicePlayer = lazy(() =>
  import("@/packages/apex/voice/EmperorVoicePlayer").then(m => ({ default: m.EmperorVoicePlayer }))
);
const BIGWIN_EVENT = "phonara:bigwin";
const BIGWIN_THRESHOLD_PHON = 1_000_000;

type Reel = {
  user: string;
  game: string;
  amount: number;
  mult: number;
  color: string;
};

const REELS: Reel[] = [
  { user: "이*환",  game: "Olympus 1000",   amount: 1280400,  mult: 320,    color: "from-primary via-secondary to-accent" },
  { user: "박*수",  game: "Crash Imperial",  amount: 720000,   mult: 180,    color: "from-accent via-primary to-secondary" },
  { user: "김*영",  game: "Dragon Empire",   amount: 5128000,  mult: 1280,   color: "from-secondary via-accent to-primary" },
  { user: "최*민",  game: "Cosmic Forge",    amount: 240000,   mult: 60,     color: "from-primary via-accent to-secondary" },
  { user: "정*아",  game: "Viking Thunder",  amount: 880000,   mult: 220,    color: "from-accent via-secondary to-primary" },
  { user: "강*호",  game: "Sugar Fever",     amount: 12400000, mult: 3100,   color: "from-pink-500 via-fuchsia-400 to-cyan-400" },
];

export default function ApexWinReels() {
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState(false);
  const reel = REELS[idx % REELS.length];

  // Phase 6: dispatch a bigwin event whenever the visible reel crosses the threshold,
  // so EmperorVoicePlayer auto-trigger fires (8s cooldown + mute respected internally).
  useEffect(() => {
    if (reel.amount >= BIGWIN_THRESHOLD_PHON) {
      window.dispatchEvent(new CustomEvent(BIGWIN_EVENT, { detail: { payout: reel.amount } }));
    }
  }, [idx, reel.amount]);

  function next() {
    setIdx((i) => i + 1);
    setLiked(false);
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black apex-gradient-text">Win Reels</h1>
          <p className="text-[11px] text-muted-foreground">TikTok 보다 중독적인 빅윈 피드</p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {(idx % REELS.length) + 1} / {REELS.length}
        </span>
      </header>

      <div
        onClick={next}
        className="relative h-[68vh] md:h-[72vh] rounded-3xl overflow-hidden apex-glass cursor-pointer select-none"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${reel.color} opacity-25`} />
        <div className="absolute inset-0 apex-particle-burst" />
        <div className="absolute inset-0 apex-grid-bg opacity-50" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6 animate-fade-in" key={idx}>
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-foreground/70 border border-foreground/20 rounded-full px-3 py-1">
            <Flame className="w-3 h-3 text-accent" /> {reel.game}
          </div>
          <p className="mt-4 text-6xl md:text-9xl font-black apex-text-neon tabular-nums leading-none">
            +{reel.amount.toLocaleString()}
          </p>
          <p className="mt-3 text-xl md:text-2xl apex-text-magenta font-black">
            {reel.mult.toLocaleString()}x WIN
          </p>
          <p className="mt-6 text-sm text-foreground/80">@{reel.user}</p>
        </div>

        {/* Side actions */}
        <div className="absolute right-3 bottom-28 flex flex-col gap-3 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); setLiked((v) => !v); }}
            className="apex-glass w-12 h-12 rounded-full flex flex-col items-center justify-center"
          >
            <Heart className={`w-5 h-5 transition ${liked ? "fill-accent text-accent" : "text-foreground"}`} />
            <span className="text-[8px] mt-0.5 text-muted-foreground">{liked ? "1.2k" : "1.2k"}</span>
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="apex-glass w-12 h-12 rounded-full flex flex-col items-center justify-center"
          >
            <Share2 className="w-5 h-5 text-primary" />
            <span className="text-[8px] mt-0.5 text-muted-foreground">공유</span>
          </button>
        </div>

        {/* Hint */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex flex-col items-center text-foreground/50 text-xs z-20">
          <ChevronUp className="w-5 h-5 animate-bounce" />
          탭해서 다음
        </div>
      </div>
    </div>
  );
}
