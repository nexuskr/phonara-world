// CosmicPaytableSheet — Cosmic 보라/시안/골드 톤 (BasePaytableSheet 사용).
import { Sparkles } from "lucide-react";
import BasePaytableSheet, {
  type PaytableSection,
  type SymRow,
} from "@/components/slots/BasePaytableSheet";

const HIGH: SymRow[] = [
  { emoji: "👑", name: "Cosmic Emperor", pay: "5x: ×500 · 4x: ×150 · 3x: ×40" },
  { emoji: "🌌", name: "Galaxy Goddess", pay: "5x: ×200 · 4x: ×80 · 3x: ×20" },
  { emoji: "🪐", name: "Forge Planet",   pay: "5x: ×120 · 4x: ×40 · 3x: ×12" },
  { emoji: "⚡", name: "Plasma Core",    pay: "5x: ×80 · 4x: ×25 · 3x: ×8" },
];
const LOW: SymRow[] = [
  { emoji: "A", name: "A", pay: "5x: ×30 · 4x: ×10 · 3x: ×4" },
  { emoji: "K", name: "K", pay: "5x: ×25 · 4x: ×8 · 3x: ×3" },
  { emoji: "Q", name: "Q", pay: "5x: ×20 · 4x: ×6 · 3x: ×2" },
  { emoji: "J", name: "J", pay: "5x: ×15 · 4x: ×5 · 3x: ×2" },
];

const SECTIONS: PaytableSection[] = [
  { title: "고배당 심볼", toneClass: "from-amber-400/30 to-transparent border-amber-400/40", rows: HIGH },
  { title: "저배당 심볼", toneClass: "from-cyan-400/25 to-transparent border-cyan-400/40", rows: LOW },
  {
    title: "특수 심볼",
    toneClass: "from-violet-400/30 to-transparent border-violet-400/50",
    rows: [
      { emoji: "✨", name: "WILD (Cosmic)", pay: "모든 일반 심볼 대체. 보너스 트리거 외 모두 적용." },
      { emoji: "💫", name: "SCATTER", pay: "3개 이상 등장 시 Cosmic Forge 보너스 발동." },
    ],
  },
  {
    title: "보너스 & 잭팟",
    toneClass: "from-fuchsia-400/30 to-transparent border-fuchsia-400/50",
    extra: (
      <>
        <p className="text-sm text-violet-200/90 leading-relaxed">
          <b className="text-yellow-300">MAX WIN ×5,000</b> — 단일 스핀 최대 배율 도달 시{" "}
          <b className="text-cyan-300">Galaxy Explosion</b> + <b>Emperor 칭호</b> 시네마틱 발동.
        </p>
        <p className="text-xs text-violet-300/80 mt-2">
          RTP 96.0% (Real) · Demo 모드는 학습용으로 RTP가 다를 수 있습니다.
        </p>
      </>
    ),
  },
];

export default function CosmicPaytableSheet() {
  return (
    <BasePaytableSheet
      title="Cosmic Forge 5000 — 배당표"
      TitleIcon={Sparkles}
      titleIconClassName="text-cyan-300"
      titleClassName="text-violet-100"
      triggerClassName="border-violet-400/60 bg-indigo-950/40 text-violet-100 hover:bg-violet-900/50 hover:text-violet-50 backdrop-blur-sm"
      contentClassName="bg-gradient-to-b from-indigo-950 via-violet-950 to-slate-950 border-l border-violet-400/40 text-violet-50"
      rowBgClass="bg-indigo-950/40"
      rowIconBgClass="bg-violet-900/50"
      rowIconTextClass="text-violet-50"
      rowNameClass="text-violet-50"
      rowPayClass="text-violet-200/80"
      sectionTitleClass="text-violet-50"
      sections={SECTIONS}
      footer={
        <p className="text-[11px] text-violet-300/60 text-center">
          결과는 RNG로 결정되며, 실시간 통계는 서버 RPC가 권한합니다.
        </p>
      }
    />
  );
}
