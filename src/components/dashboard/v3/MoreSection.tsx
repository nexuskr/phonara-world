/**
 * MoreSection — <details> 기반 접힘 영역.
 * - 외부에서 imperative open() 호출 가능 (phonara:focus-trade 용)
 */
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type MoreSectionHandle = { open: () => void; close: () => void };

const MoreSection = forwardRef<MoreSectionHandle, { children: React.ReactNode; defaultOpen?: boolean }>(
  ({ children, defaultOpen = false }, ref) => {
    const [open, setOpen] = useState(defaultOpen);
    const detailsRef = useRef<HTMLDetailsElement>(null);

    useImperativeHandle(ref, () => ({
      open: () => {
        setOpen(true);
        if (detailsRef.current) detailsRef.current.open = true;
        setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      },
      close: () => {
        setOpen(false);
        if (detailsRef.current) detailsRef.current.open = false;
      },
    }));

    return (
      <details
        ref={detailsRef}
        open={open}
        onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
        className="group rounded-3xl border border-gold/25 bg-card/40 backdrop-blur"
      >
        <summary
          className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 select-none"
        >
          <span className="font-imperial font-black text-base md:text-lg tracking-wide">
            ⌄ 더 보기 — 베팅 패널 · 미션 · 랭킹
          </span>
          <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </summary>
        <div className="px-5 pb-6 pt-2 space-y-4">{children}</div>
      </details>
    );
  },
);
MoreSection.displayName = "MoreSection";
export default MoreSection;
