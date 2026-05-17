/**
 * BankSearchSelect — 한국 20개 은행에서 검색·선택할 수 있는 드롭다운.
 * 외부 라이브러리 없이 가벼운 커스텀 위젯으로 구현해 번들 영향 0에 가깝다.
 *
 * Props:
 *  - value: 현재 선택된 은행 display 이름
 *  - onChange: 선택 시 호출 (display 이름 전달)
 *
 * UI 원칙: Warm Gold 톤, 최소 터치 영역 44px, 키보드(↑/↓/Enter/Esc) 지원.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { koreanBanks } from "@/lib/koreanBanks";

interface Props {
  value: string;
  onChange: (display: string) => void;
  placeholder?: string;
}

export default function BankSearchSelect({ value, onChange, placeholder = "은행을 검색해 주세요" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return koreanBanks;
    return koreanBanks.filter(b => b.display.includes(q) || b.name.includes(q));
  }, [query]);

  // 외부 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);

  // 열리면 검색 입력에 포커스
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  function pick(display: string) {
    onChange(display);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIdx];
      if (item) pick(item.display);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="mt-1.5 w-full min-h-[52px] rounded-xl bg-input border border-border px-4 text-base flex items-center justify-between focus:outline-none focus:border-amber-400 transition"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="font-bold">{value || placeholder}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 left-0 right-0 rounded-xl border border-amber-400/40 bg-popover shadow-[0_18px_40px_-12px_hsl(45_100%_55%/0.35)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
              onKeyDown={onKey}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-sm py-1"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted-foreground text-center">
                일치하는 은행이 없어요
              </li>
            ) : filtered.map((b, idx) => {
              const selected = b.display === value;
              const active = idx === activeIdx;
              return (
                <li
                  key={b.code}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => pick(b.display)}
                  className={`flex items-center justify-between px-3 min-h-[44px] cursor-pointer text-sm transition
                    ${active ? "bg-amber-400/15 text-amber-100" : "text-foreground"}
                    ${selected ? "font-black" : "font-medium"}`}
                >
                  <span>{b.display}</span>
                  {selected && <Check className="w-4 h-4 text-amber-300" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
