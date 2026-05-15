// PharaohPaytableSheet — Gold + Indigo + Emerald tone (BasePaytableSheet 사용).
import { Pyramid } from "lucide-react";
import BasePaytableSheet, {
  type PaytableSection,
  type SymRow,
} from "@/components/slots/BasePaytableSheet";

const HIGH: SymRow[] = [
  { emoji: "𓂀", name: "Ankh of Ra", pay: "5x: ×500 · 4x: ×120 · 3x: ×30" },
  { emoji: "𓃭", name: "Sacred Scarab", pay: "5x: ×250 · 4x: ×75 · 3x: ×20" },
  { emoji: "𓊝", name: "Eye of Horus", pay: "5x: ×150 · 4x: ×45 · 3x: ×12" },
  { emoji: "𓋹", name: "Pharaoh Mask", pay: "5x: ×100 · 4x: ×30 · 3x: ×8" },
];
const LOW: SymRow[] = [
  { emoji: "A", name: "A", pay: "5x: ×28 · 4x: ×10 · 3x: ×3" },
  { emoji: "K", name: "K", pay: "5x: ×24 · 4x: ×8 · 3x: ×3" },
  { emoji: "Q", name: "Q", pay: "5x: ×20 · 4x: ×7 · 3x: ×2" },
  { emoji: "J", name: "J", pay: "5x: ×16 · 4x: ×6 · 3x: ×2" },
];

const SECTIONS: PaytableSection[] = [
  { title: "고배당 심볼", toneClass: "from-amber-400/30 to-transparent border-amber-400/45", rows: HIGH },
  { title: "저배당 심볼", toneClass: "from-indigo-500/25 to-transparent border-indigo-500/40", rows: LOW },
  {
    title: "특수 심볼",
    toneClass: "from-emerald-500/25 to-transparent border-emerald-500/45",
    rows: [
      { emoji: "𓆣", name: "WILD (Scarab)", pay: "모든 일반 심볼 대체. SCATTER 제외." },
      { emoji: "𓉐", name: "SCATTER (Pyramid)", pay: "3개 이상 등장시 Vault Reveal 보너스 발동." },
    ],
  },
  {
    title: "잭팟",
    toneClass: "from-amber-400/30 to-transparent border-amber-400/45",
    extra: (
      <>
        <p className="text-sm text-amber-50/90 leading-relaxed">
          <b className="text-amber-200">MAX WIN ×2500</b> 도달 시{" "}
          <b className="text-emerald-300">Pharaoh's Vault</b> +{" "}
          <b className="text-amber-200">Golden Sarcophagus</b> cinematic 발동.
        </p>
        <p className="text-xs text-amber-200/70 mt-2">
          Mid-High volatility · RTP 96.0% (Real). Demo 모드는 학습용으로 RTP가 다를 수 있습니다.
        </p>
      </>
    ),
  },
];

export default function PharaohPaytableSheet() {
  return (
    <BasePaytableSheet
      title="Pharaoh's Vault — 배당표"
      TitleIcon={Pyramid}
      titleIconClassName="text-amber-300"
      titleIconStyle={{ filter: "drop-shadow(0 0 6px rgba(234,179,8,0.9))" }}
      titleClassName="text-amber-100"
      triggerClassName="border-amber-400/70 bg-indigo-950/45 text-amber-100 hover:bg-indigo-900/55 hover:text-amber-50 backdrop-blur-sm"
      triggerStyle={{ boxShadow: "0 0 12px rgba(234,179,8,0.30)" }}
      contentClassName="bg-gradient-to-b from-indigo-950 via-amber-950 to-emerald-950 border-l border-amber-400/40 text-amber-50"
      rowBgClass="bg-indigo-950/60"
      rowIconBgClass="bg-amber-900/55"
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
