// SakuraPaytableSheet — Soft Pink + Warm Gold + Light Mint (BasePaytableSheet 사용).
// 한국 50-70대 친화적 톤. Low volatility 안내 강조.
import { Flower2 } from "lucide-react";
import BasePaytableSheet, {
  type PaytableSection,
  type SymRow,
} from "@/components/slots/BasePaytableSheet";

const HIGH: SymRow[] = [
  { emoji: "🌸", name: "Sakura Crown", pay: "5x: ×100 · 4x: ×40 · 3x: ×12" },
  { emoji: "🏯", name: "Pagoda", pay: "5x: ×60 · 4x: ×24 · 3x: ×8" },
  { emoji: "🍶", name: "Sake", pay: "5x: ×40 · 4x: ×16 · 3x: ×6" },
  { emoji: "🎴", name: "Hanafuda", pay: "5x: ×25 · 4x: ×10 · 3x: ×4" },
];
const LOW: SymRow[] = [
  { emoji: "A", name: "A", pay: "5x: ×15 · 4x: ×6 · 3x: ×2" },
  { emoji: "K", name: "K", pay: "5x: ×12 · 4x: ×5 · 3x: ×2" },
  { emoji: "Q", name: "Q", pay: "5x: ×10 · 4x: ×4 · 3x: ×2" },
  { emoji: "J", name: "J", pay: "5x: ×8 · 4x: ×3 · 3x: ×1" },
];

const SECTIONS: PaytableSection[] = [
  { title: "고배당 심볼", toneClass: "from-rose-200/30 to-transparent border-rose-200/45", rows: HIGH },
  { title: "저배당 심볼", toneClass: "from-amber-200/25 to-transparent border-amber-200/40", rows: LOW },
  {
    title: "특수 심볼",
    toneClass: "from-emerald-200/25 to-transparent border-emerald-200/45",
    rows: [
      { emoji: "🌸", name: "WILD (Golden Sakura)", pay: "모든 일반 심볼 대체. SCATTER 제외." },
      { emoji: "🏮", name: "SCATTER (Lantern)", pay: "3개 이상 등장시 Cherry Bloom 보너스 발동." },
    ],
  },
  {
    title: "잭팟",
    toneClass: "from-rose-200/30 to-transparent border-rose-200/50",
    extra: (
      <>
        <p className="text-sm text-rose-50/95 leading-relaxed">
          <b className="text-rose-200">MAX WIN ×500</b> 도달 시{" "}
          <b className="text-amber-200">벚꽃의 축복</b> cinematic 발동.
        </p>
        <p className="text-xs text-rose-100/75 mt-2">
          Low volatility · 안정적 · RTP 96.5% — 천천히 즐기세요.
        </p>
      </>
    ),
  },
];

export default function SakuraPaytableSheet() {
  return (
    <BasePaytableSheet
      title="Cherry Sakura — 배당표"
      TitleIcon={Flower2}
      titleIconClassName="text-rose-200"
      titleIconStyle={{ filter: "drop-shadow(0 0 6px rgba(251, 207, 232, 0.85))" }}
      titleClassName="text-rose-50"
      triggerClassName="border-rose-300/60 bg-rose-950/35 text-rose-50 hover:bg-rose-900/45 hover:text-white backdrop-blur-sm"
      triggerStyle={{ boxShadow: "0 0 12px rgba(251, 207, 232, 0.30)" }}
      contentClassName="bg-gradient-to-b from-rose-950 via-rose-900 to-emerald-950 border-l border-rose-300/35 text-rose-50"
      rowBgClass="bg-rose-950/55"
      rowIconBgClass="bg-rose-900/55"
      rowIconTextClass="text-rose-50"
      rowNameClass="text-rose-50"
      rowPayClass="text-rose-100/85"
      sectionTitleClass="text-rose-50"
      sections={SECTIONS}
      footer={
        <p className="text-[11px] text-rose-200/65 text-center">
          결과는 RNG로 결정되며, 실시간 통계는 서버 RPC가 권한합니다.
        </p>
      }
    />
  );
}
