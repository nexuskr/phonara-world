// DragonPaytableSheet — Crimson + Gold + Ember tone (BasePaytableSheet 사용).
import { Flame } from "lucide-react";
import BasePaytableSheet, {
  type PaytableSection,
  type SymRow,
} from "@/components/slots/BasePaytableSheet";

const HIGH: SymRow[] = [
  { emoji: "🐲", name: "Crimson Dragon", pay: "5x: ×500 · 4x: ×120 · 3x: ×30" },
  { emoji: "🥚", name: "Dragon Egg",     pay: "5x: ×220 · 4x: ×70 · 3x: ×18" },
  { emoji: "🗡️", name: "Blazing Sword", pay: "5x: ×140 · 4x: ×42 · 3x: ×12" },
  { emoji: "🛡️", name: "Scale Shield",  pay: "5x: ×90 · 4x: ×28 · 3x: ×8" },
];
const LOW: SymRow[] = [
  { emoji: "A", name: "A", pay: "5x: ×30 · 4x: ×10 · 3x: ×4" },
  { emoji: "K", name: "K", pay: "5x: ×24 · 4x: ×8 · 3x: ×3" },
  { emoji: "Q", name: "Q", pay: "5x: ×20 · 4x: ×6 · 3x: ×2" },
  { emoji: "J", name: "J", pay: "5x: ×16 · 4x: ×5 · 3x: ×2" },
];

const SECTIONS: PaytableSection[] = [
  { title: "고배당 심볼", toneClass: "from-amber-400/30 to-transparent border-amber-400/45", rows: HIGH },
  { title: "저배당 심볼", toneClass: "from-red-400/25 to-transparent border-red-400/40", rows: LOW },
  {
    title: "특수 심볼",
    toneClass: "from-orange-400/25 to-transparent border-orange-400/45",
    rows: [
      { emoji: "🔥", name: "WILD (Ember)", pay: "모든 일반 심볼 대체. 보너스 트리거 외 모두 적용." },
      { emoji: "💎", name: "SCATTER", pay: "3개 이상 등장 시 Dragon Hoard 보너스 발동." },
    ],
  },
  {
    title: "잭팟",
    toneClass: "from-amber-400/30 to-transparent border-amber-400/45",
    extra: (
      <>
        <p className="text-sm text-amber-50/90 leading-relaxed">
          <b className="text-amber-200">MAX WIN ×500</b> 도달 시{" "}
          <b className="text-red-200">Dragon Roar</b> +{" "}
          <b className="text-orange-200">Lava Eruption</b> cinematic 발동.
        </p>
        <p className="text-xs text-amber-200/70 mt-2">
          RTP 96.0% (Real) · Demo 모드는 학습용으로 RTP가 다를 수 있습니다.
        </p>
      </>
    ),
  },
];

export default function DragonPaytableSheet() {
  return (
    <BasePaytableSheet
      title="Dragon Empire — 배당표"
      TitleIcon={Flame}
      titleIconClassName="text-orange-300"
      titleIconStyle={{ filter: "drop-shadow(0 0 6px rgba(249,115,22,0.9))" }}
      titleClassName="text-amber-100"
      triggerClassName="border-amber-400/70 bg-red-950/45 text-amber-100 hover:bg-red-900/55 hover:text-amber-50 backdrop-blur-sm"
      triggerStyle={{ boxShadow: "0 0 12px rgba(249,115,22,0.35)" }}
      contentClassName="bg-gradient-to-b from-red-950 via-stone-950 to-amber-950 border-l border-amber-400/40 text-amber-50"
      rowBgClass="bg-stone-950/55"
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
