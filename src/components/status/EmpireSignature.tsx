import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { useDB } from "@/lib/store";

/**
 * EMPIRE 진입 시그니처 — 첫 진입 시 풀스크린 파티클 + 사운드.
 * 1회만 노출 (localStorage).
 */
const KEY = "phonara_empire_sig_v1";

export default function EmpireSignature() {
  const [db] = useDB();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!db.user) return;
    if (db.user.tier !== "EMPIRE") return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    setShow(true);
    localStorage.setItem(KEY, String(Date.now()));
    try { navigator.vibrate?.([30, 50, 80]); } catch { /* noop */ }
    const t = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(t);
  }, [db.user]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center bg-background/70 backdrop-blur-md animate-fade-up">
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="absolute text-3xl text-gold animate-crown"
            style={{
              left: `${5 + (i * 4) % 90}%`,
              top: `${10 + (i * 7) % 80}%`,
              animationDelay: `${i * 80}ms`,
            }}
          >
            👑
          </span>
        ))}
      </div>
      <div className="relative text-center">
        <Crown className="w-20 h-20 text-gold mx-auto animate-pulse" />
        <div className="font-imperial text-4xl md:text-6xl text-gradient-gold mt-4 tracking-[0.2em]">
          EMPIRE
        </div>
        <div className="text-xs text-muted-foreground tracking-widest mt-2">
          WELCOME, EMPEROR
        </div>
      </div>
    </div>
  );
}
