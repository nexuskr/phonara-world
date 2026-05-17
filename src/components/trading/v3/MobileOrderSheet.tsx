import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";

interface Props {
  children: ReactNode;
}

/**
 * MobileOrderSheet — md 미만에서만 활성. MegaOrderPanel을 감싸는 풀-시트.
 * children 내부는 변경하지 않음 (FREEZE preservation).
 */
export default function MobileOrderSheet({ children }: Props) {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      {/* 데스크톱에서는 자기 자신을 렌더하지 않음 (lg+에서는 사이드 컬럼이 그대로) */}
      <div className="lg:hidden">
        {/* 하단 고정 핸들 바 */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 text-white py-3 px-4 flex items-center justify-center gap-2 font-black tracking-wide text-sm shadow-2xl shadow-pink-500/30 min-h-14"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
          aria-expanded={open}
        >
          <ChevronUp className="w-4 h-4 animate-bounce" />
          주문 패널 열기 · 롱 / 숏 진입
        </button>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-x border-border/60 bg-background shadow-2xl"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
                role="dialog"
                aria-label="주문 패널"
              >
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" aria-hidden />
                    <span className="text-sm font-black tracking-wide ml-2">주문 패널</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="min-h-12 px-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"
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
    </>
  );
}
