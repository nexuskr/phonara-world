// WizardPaytableSheet — Mystic Purple + Gold (BasePaytableSheet 사용).
import { Sparkles } from "lucide-react";
import BasePaytableSheet, {
  type PaytableSection,
  type SymRow,
} from "@/components/slots/BasePaytableSheet";

const HIGH: SymRow[] = [
  { emoji: "🧙", name: "Arch Wizard",      pay: "5x: ×500 · 4x: ×140 · 3x: ×40" },
  { emoji: "🐉", name: "Familiar Dragon",  pay: "5x: ×260 · 4x: ×80 · 3x: ×22" },
  { emoji: "🔮", name: "Crystal Orb",      pay: "5x: ×160 · 4x: ×52 · 3x: ×14" },
  { emoji: "📜", name: "Ancient Scroll",   pay: "5x: ×100 · 4x: ×34 · 3x: ×8" },
];
const LOW: SymRow[] = [
  { emoji: "A", name: "A", pay: "5x: ×40 · 4x: ×12 · 3x: ×4" },
  { emoji: "K", name: "K", pay: "5x: ×30 · 4x: ×10 · 3x: ×3" },
  { emoji: "Q", name: "Q", pay: "5x: ×24 · 4x: ×8 · 3x: ×2" },
  { emoji: "J", name: "J", pay: "5x: ×18 · 4x: ×6 · 3x: ×2" },
];

const TOP_CARD = (
  <div className="rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-300/10 via-violet-400/10 to-cyan-300/10 p-3">
    <div className="text-xs uppercase tracking-wider text-amber-200/90">Volatility</div>
    <div className="mt-0.5 flex items-baseline gap-2">
      <span className="text-base font-semibold text-amber-100">HIGH</span>
      <span className="text-xs text-violet-100/80">— 길게 비어 있다 강하게 터집니다.</span>
    </div>
    <div className="mt-2 text-xs uppercase tracking-wider text-cyan-200/90">Max Win</div>
    <div className="mt-0.5 text-2xl font-black bg-gradient-to-r from-amber-200 via-violet-200 to-cyan-200 bg-clip-text text-transparent">
      ×2,000
    </div>
  </div>
);

const SECTIONS: PaytableSection[] = [
  { title: "고배당 심볼", toneClass: "from-amber-300/25 to-transparent border-amber-300/50", rows: HIGH },
  { title: "저배당 심볼", toneClass: "from-violet-400/25 to-transparent border-violet-400/45", rows: LOW },
  {
    title: "특수 심볼",
    toneClass: "from-cyan-300/25 to-transparent border-cyan-300/45",
    rows: [
      { emoji: "✨", name: "WILD (Rune)", pay: "모든 일반 심볼 대체. 보너스 트리거 외 모두 적용." },
      { emoji: "💠", name: "SCATTER", pay: "3개 이상 등장 시 Mystic Free Spin 발동." },
    ],
  },
  {
    title: "잭팟",
    toneClass: "from-amber-300/25 to-transparent border-amber-300/50",
    extra: (
      <>
        <p className="text-sm text-violet-50/90 leading-relaxed">
          <b className="text-amber-200">MAX WIN ×2,000</b> 도달 시{" "}
          <b className="text-violet-200">Pentagram Sweep</b> +{" "}
          <b className="text-cyan-200">Magic Rune Storm</b> cinematic 발동.
        </p>
        <p className="text-xs text-violet-200/70 mt-2">
          RTP 96.0% (Real) · Demo 모드는 학습용으로 RTP가 다를 수 있습니다.
        </p>
      </>
    ),
  },
];

export default function WizardPaytableSheet() {
  return (
    <BasePaytableSheet
      title="Wizard 2000 · Mystic Paytable"
      TitleIcon={Sparkles}
      titleIconClassName="text-amber-300"
      titleIconStyle={{ filter: "drop-shadow(0 0 6px rgba(251,191,36,0.9))" }}
      titleClassName="text-amber-100"
      triggerClassName="border-amber-300/70 bg-violet-950/45 text-amber-100 hover:bg-violet-900/55 hover:text-amber-50 backdrop-blur-sm"
      triggerStyle={{ boxShadow: "0 0 12px rgba(251,191,36,0.30)" }}
      contentClassName="bg-gradient-to-b from-violet-950 via-indigo-950 to-slate-950 border-l border-amber-300/40 text-violet-50"
      rowBgClass="bg-slate-950/50"
      rowIconBgClass="bg-violet-900/55"
      rowIconTextClass="text-amber-100"
      rowNameClass="text-violet-50"
      rowPayClass="text-violet-100/80"
      sectionTitleClass="text-violet-50"
      topCard={TOP_CARD}
      sections={SECTIONS}
      footer={
        <p className="text-[11px] text-violet-200/60 text-center">
          결과는 RNG로 결정되며, 실시간 통계는 서버 RPC가 권한합니다.
        </p>
      }
    />
  );
}
