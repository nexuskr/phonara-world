import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronUp, ChevronDown, Crown } from "lucide-react";
import ImperialLogo from "@/components/brand/ImperialLogo";

interface Props {
  children: ReactNode;
}

/**
 * MobileOrderSheet — md 미만에서만 활성. MegaOrderPanel(FREEZE)을 감싸는 풀-시트.
 * - Imperial 트리거: Subtle Breathing Glow (idle), Multi-layer gold/pink halo (tap)
 * - drag="y" Swipe down to close (Reanimated 3 동급 GPU 제스처)
 * - children 내부는 변경하지 않음 (FREEZE preservation)
 * - transform/opacity only · Reduced Motion 가드
 */
export default function MobileOrderSheet({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [pressed, setPressed] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open]);

  // listen for app-wide focus-bet to auto-open
  useEffect(() => {
    const onFocus = () => setOpen(true);
    window.addEventListener("phonara:focus-bet", onFocus as EventListener);
    return () => window.removeEventListener("phonara:focus-bet", onFocus as EventListener);
  }, []);

  return (
    <div className="lg:hidden">
      {/* 하단 고정 Imperial 트리거 — Idle Breathing Glow */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        animate={
          reduce
            ? { scale: 1, boxShadow: "0 0 24px hsl(var(--gold)/0.35)" }
            : pressed
            ? {
                scale: 1.04,
                boxShadow:
                  "0 0 0 6px hsl(var(--gold)/0.25), 0 0 40px hsl(330 90% 60% / 0.65), 0 0 70px hsl(var(--gold)/0.55)",
              }
            : {
                scale: [1, 1.012, 1],
                boxShadow: [
                  "0 10px 30px -8px hsl(330 90% 60% / 0.45), 0 0 24px hsl(var(--gold)/0.35)",
                  "0 14px 38px -8px hsl(330 90% 60% / 0.65), 0 0 36px hsl(var(--gold)/0.55)",
                  "0 10px 30px -8px hsl(330 90% 60% / 0.45), 0 0 24px hsl(var(--gold)/0.35)",
                ],
              }
        }
        transition={
          reduce
            ? { duration: 0 }
            : pressed
            ? { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
            : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
        }
        className="fixed bottom-0 inset-x-0 z-30
                   bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500
                   text-black py-3 px-4 flex items-center justify-center gap-2
                   font-black tracking-wide text-sm min-h-14 will-change-transform"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
        aria-expanded={open}
        aria-label="주문 패널 열기"
      >
        <Crown className="w-4 h-4" strokeWidth={2.5} />
        <span>황제의 주문 패널 · 롱 / 숏 진입</span>
        <ChevronUp className="w-4 h-4" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto
                         rounded-t-3xl border-t border-x border-amber-400/30
                         bg-background shadow-[0_-30px_80px_-20px_hsl(var(--gold)/0.35)]
                         will-change-transform"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", damping: 32, stiffness: 320 }
              }
              drag={reduce ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 500) setOpen(false);
              }}
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
              role="dialog"
              aria-label="주문 패널"
            >
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-amber-400/20 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-1.5 rounded-full bg-gradient-to-r from-amber-300 to-rose-400" aria-hidden />
                  <span className="text-sm font-black tracking-[0.12em] ml-2 font-imperial bg-gradient-to-r from-amber-200 to-rose-300 bg-clip-text text-transparent">
                    황제의 주문 패널
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-12 px-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition"
                >
                  닫기 <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
