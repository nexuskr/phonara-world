import { useEffect, useState } from "react";
import crownPhone from "@/assets/login-crown-phone.png";

const KEY = "phonara_cinema_played_v1";

/**
 * Phonara Login Cinematic — 0.6s opening sequence
 * Plays once per browser session. Reduced-motion friendly.
 */
export default function CinematicIntro() {
  const [played, setPlayed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPlayed(true);
      return;
    }
    if (sessionStorage.getItem(KEY)) {
      setPlayed(true);
      return;
    }
    setPlayed(false);
    sessionStorage.setItem(KEY, "1");
  }, []);

  const wordmark = "PHONARA".split("");

  return (
    <div className="flex flex-col items-center mb-5 select-none">
      <div className="relative w-32 h-32 md:w-36 md:h-36">
        <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full -z-10 animate-ring-pulse" />
        <img
          src={crownPhone}
          alt="Phonara — Imperial Crown"
          width={1024}
          height={1024}
          loading="eager"
          decoding="async"
          className={`w-full h-full object-contain drop-shadow-[0_8px_24px_rgba(232,185,35,0.4)] ${
            played ? "animate-crown-float" : "animate-cinema-crown animate-crown-float"
          }`}
          style={played ? undefined : { animationDelay: "0.05s, 0.6s" }}
        />
      </div>

      <div className="mt-3 flex items-center gap-[0.06em]">
        {wordmark.map((c, i) => (
          <span
            key={i}
            className={`font-imperial text-3xl md:text-4xl text-gradient-imperial ${
              played ? "" : "animate-cinema-word"
            }`}
            style={played ? undefined : { animationDelay: `${0.18 + i * 0.04}s` }}
          >
            {c}
          </span>
        ))}
      </div>

      <div
        className={`mt-2 h-[2px] w-24 bg-gradient-imperial rounded-full ${
          played ? "" : "animate-cinema-line"
        }`}
        style={played ? undefined : { animationDelay: "0.5s" }}
      />
    </div>
  );
}
