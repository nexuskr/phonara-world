// NeonPaytableSheet — Cyberpunk magenta/cyan/lime (BasePaytableSheet 사용).
import { Zap } from "lucide-react";
import BasePaytableSheet, {
  type PaytableSection,
  type SymRow,
} from "@/components/slots/BasePaytableSheet";

const HIGH: SymRow[] = [
  { emoji: "🥷", name: "Neon Shogun",     pay: "5x: ×888 · 4x: ×222 · 3x: ×60" },
  { emoji: "🌸", name: "Cyber Geisha",    pay: "5x: ×400 · 4x: ×120 · 3x: ×30" },
  { emoji: "⛩️", name: "Hologram Torii", pay: "5x: ×200 · 4x: ×60 · 3x: ×16" },
  { emoji: "🍱", name: "Bento Box",       pay: "5x: ×120 · 4x: ×40 · 3x: ×10" },
];
const LOW: SymRow[] = [
  { emoji: "A", name: "A", pay: "5x: ×40 · 4x: ×12 · 3x: ×4" },
  { emoji: "K", name: "K", pay: "5x: ×30 · 4x: ×10 · 3x: ×3" },
  { emoji: "Q", name: "Q", pay: "5x: ×24 · 4x: ×8 · 3x: ×2" },
  { emoji: "J", name: "J", pay: "5x: ×18 · 4x: ×6 · 3x: ×2" },
];

const SECTIONS: PaytableSection[] = [
  { title: "고배당 심볼", toneClass: "from-fuchsia-400/30 to-transparent border-fuchsia-400/50", rows: HIGH },
  { title: "저배당 심볼", toneClass: "from-cyan-400/25 to-transparent border-cyan-400/40", rows: LOW },
  {
    title: "특수 심볼",
    toneClass: "from-lime-400/25 to-transparent border-lime-400/45",
    rows: [
      { emoji: "✨", name: "WILD (Hologram)", pay: "모든 일반 심볼 대체. 보너스 트리거 외 모두 적용." },
      { emoji: "💠", name: "SCATTER", pay: "3개 이상 등장 시 Hold88 보너스 발동." },
    ],
  },
  {
    title: "잭팟",
    toneClass: "from-fuchsia-400/30 to-transparent border-fuchsia-400/50",
    extra: (
      <>
        <p className="text-sm text-pink-100/90 leading-relaxed">
          <b className="text-lime-300">MAX WIN ×8,888</b> — 단일 스핀 최대 배율 도달 시{" "}
          <b className="text-cyan-300">Matrix Rain</b> + <b>Hacker</b> cinematic 발동.
        </p>
        <p className="text-xs text-pink-200/70 mt-2">
          RTP 96.0% (Real) · Demo 모드는 학습용으로 RTP가 다를 수 있습니다.
        </p>
      </>
    ),
  },
];

export default function NeonPaytableSheet() {
  return (
    <BasePaytableSheet
      title="Neon Tokyo 88 — 배당표"
      TitleIcon={Zap}
      titleIconClassName="text-cyan-300"
      titleIconStyle={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.9))" }}
      titleClassName="text-pink-100"
      triggerClassName="border-pink-400/70 bg-fuchsia-950/40 text-pink-100 hover:bg-pink-900/50 hover:text-pink-50 backdrop-blur-sm"
      triggerStyle={{ boxShadow: "0 0 12px rgba(244,114,182,0.35)" }}
      contentClassName="bg-gradient-to-b from-fuchsia-950 via-slate-950 to-cyan-950 border-l border-pink-400/40 text-pink-50"
      rowBgClass="bg-slate-950/50"
      rowIconBgClass="bg-fuchsia-900/50"
      rowIconTextClass="text-pink-50"
      rowNameClass="text-pink-50"
      rowPayClass="text-pink-100/80"
      sectionTitleClass="text-pink-50"
      sections={SECTIONS}
      footer={
        <p className="text-[11px] text-pink-200/60 text-center">
          결과는 RNG로 결정되며, 실시간 통계는 서버 RPC가 권한합니다.
        </p>
      }
    />
  );
}
