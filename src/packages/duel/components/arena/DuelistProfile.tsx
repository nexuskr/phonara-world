import type { Duelist } from "@pkg/duel";

export function DuelistProfile({ d, side, glow }: { d: Duelist; side: "left" | "right"; glow?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center ${side === "right" ? "md:items-end md:text-right" : "md:items-start md:text-left"}`}>
      <div
        className="w-20 h-20 md:w-24 md:h-24 rounded-2xl grid place-items-center text-4xl"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${d.color}, #0A0503)`,
          boxShadow: glow
            ? `0 0 32px ${d.color}aa, 0 0 60px ${d.color}66, inset 0 0 14px ${d.color}55`
            : `0 0 18px ${d.color}77, inset 0 0 10px ${d.color}33`,
          willChange: "transform",
        }}
      >
        {d.emoji}
      </div>
      <div className="mt-2 font-imperial text-base md:text-lg text-amber-100" style={{ textShadow: "0 0 10px hsl(38 92% 60% / 0.45)" }}>
        {d.nickname}
      </div>
      <div className="text-[10px] tracking-[0.24em] font-black uppercase text-amber-300/80">
        Tier {d.tier} · 승률 {Math.round(d.winRate * 100)}%
      </div>
      <div className="text-[10px] text-pink-300/80 mt-0.5">
        {d.streak >= 0 ? `${d.streak}연승의 영광` : `${Math.abs(d.streak)}연패의 설욕`}
      </div>
    </div>
  );
}

export default DuelistProfile;
