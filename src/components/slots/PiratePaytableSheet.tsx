// PiratePaytableSheet — Crimson + Gold + Wood + Bone tone (BasePaytableSheet 사용).
import { Skull } from "lucide-react";
import BasePaytableSheet, {
  type PaytableSection,
  type SymRow,
} from "@/components/slots/BasePaytableSheet";

const HIGH: SymRow[] = [
  { emoji: "🏴‍☠️", name: "Jolly Roger", pay: "5x: ×400 · 4x: ×100 · 3x: ×25" },
  { emoji: "💎", name: "Cursed Ruby", pay: "5x: ×200 · 4x: ×60 · 3x: ×16" },
  { emoji: "⚔️", name: "Cutlass", pay: "5x: ×120 · 4x: ×38 · 3x: ×10" },
  { emoji: "🦜", name: "Captain's Parrot", pay: "5x: ×80 · 4x: ×26 · 3x: ×7" },
];
const LOW: SymRow[] = [
  { emoji: "A", name: "A", pay: "5x: ×26 · 4x: ×9 · 3x: ×3" },
  { emoji: "K", name: "K", pay: "5x: ×22 · 4x: ×7 · 3x: ×3" },
  { emoji: "Q", name: "Q", pay: "5x: ×18 · 4x: ×6 · 3x: ×2" },
  { emoji: "J", name: "J", pay: "5x: ×14 · 4x: ×5 · 3x: ×2" },
];

const SECTIONS: PaytableSection[] = [
  { title: "고배당 심볼", toneClass: "from-amber-400/30 to-transparent border-amber-400/45", rows: HIGH },
  { title: "저배당 심볼", toneClass: "from-red-500/25 to-transparent border-red-500/40", rows: LOW },
  {
    title: "특수 심볼",
    toneClass: "from-amber-500/25 to-transparent border-amber-500/45",
    rows: [
      { emoji: "💀", name: "WILD (Skull)", pay: "모든 일반 심볼 대체. SCATTER 제외." },
      { emoji: "🪙", name: "SCATTER (Doubloon)", pay: "3개 이상 등장 시 Cannon Crash 보너스 발동." },
    ],
  },
  {
    title: "잭팟",
    toneClass: "from-amber-400/30 to-transparent border-amber-400/45",
    extra: (
      <>
        <p className="text-sm text-amber-50/90 leading-relaxed">
          <b className="text-amber-200">MAX WIN ×1500</b> 도달 시{" "}
          <b className="text-red-300">Pirate's Curse</b> +{" "}
          <b className="text-amber-200">Treasure Eruption</b> cinematic 발동.
        </p>
        <p className="text-xs text-amber-200/70 mt-2">
          Mid volatility · RTP 96.0% (Real). Demo 모드는 학습용으로 RTP가 다를 수 있습니다.
        </p>
      </>
    ),
  },
];

export default function PiratePaytableSheet() {
  return (
    <BasePaytableSheet
      title="Pirate's Curse — 배당표"
      TitleIcon={Skull}
      titleIconClassName="text-amber-300"
      titleIconStyle={{ filter: "drop-shadow(0 0 6px rgba(234,179,8,0.9))" }}
      titleClassName="text-amber-100"
      triggerClassName="border-amber-400/70 bg-red-950/45 text-amber-100 hover:bg-red-900/55 hover:text-amber-50 backdrop-blur-sm"
      triggerStyle={{ boxShadow: "0 0 12px rgba(234,179,8,0.30)" }}
      contentClassName="bg-gradient-to-b from-stone-950 via-red-950 to-amber-950 border-l border-amber-400/40 text-amber-50"
      rowBgClass="bg-stone-950/60"
      rowIconBgClass="bg-red-900/55"
      rowIconTextClass="text-amber-100"
      rowNameClass="text-amber-50"
      rowPayClass="text-amber-100/80"
      sectionTitleClass="text-amber-50"
      sections={SECTIONS}
      footer={
        <p className="text-[11px] text-amber-200/60 text-center">
          결과는 RNG로 결정되며, 실시간 통계는 서버 RPC가 권한합니다.
        </p>
      }
    />
  );
}
