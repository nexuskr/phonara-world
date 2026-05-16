// SugarFeverPaytableSheet — warm pastel candy luxury paytable.
import { Candy } from "lucide-react";
import BasePaytableSheet, {
  type PaytableSection,
  type SymRow,
} from "@/components/slots/BasePaytableSheet";

const HIGH: SymRow[] = [
  { emoji: "🍓", name: "Strawberry",   pay: "5x: ×300 · 4x: ×100 · 3x: ×30" },
  { emoji: "🍫", name: "Chocolate Bar", pay: "5x: ×180 · 4x: ×60  · 3x: ×18" },
  { emoji: "🌈", name: "Rainbow Candy", pay: "5x: ×140 · 4x: ×45  · 3x: ×14" },
  { emoji: "🟢", name: "Mint Drop",     pay: "5x: ×90  · 4x: ×30  · 3x: ×9"  },
];

const LOW: SymRow[] = [
  { emoji: "A", name: "A", pay: "5x: ×30 · 4x: ×10 · 3x: ×4" },
  { emoji: "K", name: "K", pay: "5x: ×25 · 4x: ×8  · 3x: ×3" },
  { emoji: "Q", name: "Q", pay: "5x: ×20 · 4x: ×6  · 3x: ×2" },
  { emoji: "J", name: "J", pay: "5x: ×15 · 4x: ×5  · 3x: ×2" },
];

const SECTIONS: PaytableSection[] = [
  {
    title: "고배당 캔디 심볼",
    toneClass: "from-pink-400/30 to-transparent border-pink-300/50",
    rows: HIGH,
  },
  {
    title: "저배당 심볼",
    toneClass: "from-pink-200/20 to-transparent border-pink-200/40",
    rows: LOW,
  },
  {
    title: "특수 심볼",
    toneClass: "from-amber-300/30 to-transparent border-amber-300/50",
    rows: [
      { emoji: "🍭", name: "Golden Lollipop (Scatter)",
        pay: "3개 이상 등장 시 Free Spins 발동. 등장 수에 따라 시작 멀티 상승." },
      { emoji: "💣", name: "Multiplier Bomb",
        pay: "Tumble 중 무작위 등장. 화면 위 모든 멀티를 합산 — ×2 ~ ×100." },
    ],
  },
  {
    title: "Multiplier Bomb Ladder",
    toneClass: "from-pink-500/30 to-transparent border-pink-400/55",
    extra: (
      <div className="space-y-2 text-sm text-pink-50/95 leading-relaxed">
        <p>
          Cluster Tumble 연쇄가 진행될수록 화면에 떨어지는 Multiplier Bomb의
          단계가 점점 커지고, 마지막에 모두 합산되어 최종 배율로 폭발합니다.
        </p>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold">
          {[2, 5, 10, 20, 40, 80, 100].map((m, i) => (
            <div
              key={m}
              className="rounded-md py-1 border border-pink-300/45 bg-pink-950/40 text-pink-50"
              style={{ boxShadow: `0 0 ${6 + i * 2}px rgba(255,182,206,${0.18 + i * 0.06})` }}
            >
              ×{m}
            </div>
          ))}
        </div>
        <p className="text-xs text-pink-200/85">
          최종 합산 도달 시 단일 스핀 최대{" "}
          <b className="text-amber-200">×3,000</b> 배율까지 폭발합니다.
        </p>
      </div>
    ),
  },
  {
    title: "Free Spins — Sugar Rush",
    toneClass: "from-amber-300/30 to-transparent border-amber-300/50",
    extra: (
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2 text-center text-pink-50">
          {[
            { s: "🍭×3", n: 10, mul: "시작 ×2" },
            { s: "🍭×4", n: 15, mul: "시작 ×3" },
            { s: "🍭×5", n: 20, mul: "시작 ×5" },
            { s: "🍭×6", n: 25, mul: "시작 ×8" },
          ].map((t) => (
            <div
              key={t.n}
              className="rounded-lg py-2 border border-amber-300/50 bg-gradient-to-b from-pink-950/55 to-pink-950/25"
            >
              <div className="text-[11px] text-pink-200/85">{t.s}</div>
              <div className="font-bold text-lg text-amber-200">{t.n} FS</div>
              <div className="text-[10px] text-pink-100/80">{t.mul}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-pink-200/80">
          Free Spins 동안 Multiplier Bomb이 사라지지 않고{" "}
          <b className="text-amber-200">계속 누적</b>됩니다.
        </p>
      </div>
    ),
  },
  {
    title: "Cluster Tumble 규칙",
    toneClass: "from-pink-700/30 to-transparent border-pink-500/45",
    extra: (
      <ul className="text-sm text-pink-50/90 space-y-1.5 list-disc list-inside">
        <li>6×5 그리드에서 같은 캔디가 인접 5개 이상이면 클러스터 당첨.</li>
        <li>당첨 캔디가 녹아 사라지고 위에서 새 캔디가 떨어져 연쇄 발생 — Tumble.</li>
        <li>매 연쇄마다 Multiplier Bomb이 떨어질 확률이 점점 상승.</li>
        <li>화면에 남아있는 모든 Bomb은 스핀 종료 시 합산되어 최종 배율로 적용.</li>
      </ul>
    ),
  },
  {
    title: "MAX WIN ×3,000",
    toneClass: "from-amber-200/40 to-transparent border-amber-200/60",
    extra: (
      <>
        <p className="text-sm text-pink-50/95 leading-relaxed">
          단일 스핀 최대 배율 도달 시{" "}
          <b className="text-amber-200">Sugar Fever</b> 시네마틱과{" "}
          <b className="text-pink-200">Crown 자동 보상</b>이 발동됩니다.
        </p>
        <p className="text-xs text-pink-300/80 mt-2">
          RTP 96.0% (Real) · Demo 모드는 학습용으로 RTP가 다를 수 있습니다.
        </p>
      </>
    ),
  },
];

export default function SugarFeverPaytableSheet() {
  return (
    <BasePaytableSheet
      title="Sugar Fever 3000 — 배당표"
      TitleIcon={Candy}
      titleIconClassName="text-pink-200"
      titleClassName="text-pink-50"
      triggerClassName="border-pink-300/60 bg-pink-950/40 text-pink-50 hover:bg-pink-900/50 hover:text-pink-50 backdrop-blur-sm"
      contentClassName="bg-gradient-to-b from-[#1c0e18] via-[#2a1428] to-[#1c0e18] border-l border-pink-300/40 text-pink-50"
      rowBgClass="bg-pink-950/30"
      rowIconBgClass="bg-pink-900/40"
      rowIconTextClass="text-pink-50"
      rowNameClass="text-pink-50"
      rowPayClass="text-pink-200/85"
      sectionTitleClass="text-pink-50"
      sections={SECTIONS}
      footer={
        <p className="text-[11px] text-pink-300/75 text-center">
          결과는 RNG로 결정되며, 실시간 통계는 서버 RPC가 권한합니다.
        </p>
      }
    />
  );
}
