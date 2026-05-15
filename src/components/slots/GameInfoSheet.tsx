import { useState } from "react";
import { X, Info } from "lucide-react";
import { SYMBOL_IMAGES, SYMBOL_NAMES } from "./symbolMap";

const PAYOUT_TABLE: Array<{ idx: number; m3: number; m4: number; m5: number }> = [
  { idx: 0, m3: 0.2, m4: 0.5, m5: 1.5 },
  { idx: 1, m3: 0.2, m4: 0.5, m5: 1.5 },
  { idx: 2, m3: 0.3, m4: 0.8, m5: 2.0 },
  { idx: 3, m3: 0.4, m4: 1.0, m5: 2.5 },
  { idx: 4, m3: 0.5, m4: 1.5, m5: 4.0 },
  { idx: 5, m3: 1.0, m4: 3.0, m5: 8.0 },
  { idx: 6, m3: 1.5, m4: 5.0, m5: 12.0 },
  { idx: 7, m3: 2.5, m4: 8.0, m5: 25.0 },
  { idx: 8, m3: 5.0, m4: 20.0, m5: 60.0 },
];

const BONUS_SEGMENTS: Array<{ m: number; chance: string }> = [
  { m: 2, chance: "30.0%" },
  { m: 3, chance: "25.0%" },
  { m: 5, chance: "18.0%" },
  { m: 10, chance: "13.0%" },
  { m: 20, chance: "8.0%" },
  { m: 50, chance: "4.0%" },
  { m: 100, chance: "1.8%" },
  { m: 1000, chance: "0.2%" },
];

export default function GameInfoSheet() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"rules" | "paytable" | "bonus">("rules");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="게임 정보"
        className="inline-flex items-center justify-center w-9 h-9 rounded-full glass border border-border/40 text-muted-foreground hover:text-foreground"
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-background border border-border/60 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <div>
                <div className="font-imperial text-lg text-gradient-imperial tracking-[0.2em]">
                  GAME INFO
                </div>
                <div className="text-[10px] text-muted-foreground tracking-wider mt-0.5">
                  Olympus 1000 by Phonara
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full glass border border-border/40 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b border-border/40">
              {([
                ["rules", "규칙"],
                ["paytable", "배당표"],
                ["bonus", "보너스"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`flex-1 py-2.5 text-xs font-bold tracking-wider ${
                    tab === k
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-4 text-sm space-y-3">
              {tab === "rules" && (
                <div className="space-y-3 text-muted-foreground">
                  <Row k="릴 / 라인" v="5릴 × 3행 / 20 페이라인" />
                  <Row k="RTP" v="96.0% (NFT 부스트 시 +최대 0.5%)" />
                  <Row k="최대 당첨" v="베팅의 1000×" />
                  <Row k="베팅 범위 (REAL)" v="1 ~ 100 PHON" />
                  <Row k="WILD" v="스캐터 외 모든 심볼 대체" />
                  <Row k="SCATTER" v="3개 이상 등장 시 보너스 휠 발동" />
                  <Row k="Buy Bonus" v="베팅의 100× 지불 → 즉시 보너스 휠" />
                  <Row k="Practice / Real" v="DEMO는 무료 칩, REAL은 PHON 토큰" />
                  <div className="text-[10px] pt-2 border-t border-border/30">
                    Provably Fair · 모든 스핀의 server_seed_hash가 결과에 동봉되어 검증 가능합니다.
                  </div>
                </div>
              )}

              {tab === "paytable" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[40px_1fr_60px_60px_60px] gap-2 text-[10px] text-muted-foreground tracking-wider font-bold pb-1 border-b border-border/30">
                    <div></div>
                    <div>심볼</div>
                    <div className="text-right">3매치</div>
                    <div className="text-right">4매치</div>
                    <div className="text-right">5매치</div>
                  </div>
                  {PAYOUT_TABLE.slice().reverse().map((row) => (
                    <div
                      key={row.idx}
                      className="grid grid-cols-[40px_1fr_60px_60px_60px] gap-2 items-center py-1"
                    >
                      <img src={SYMBOL_IMAGES[row.idx]} alt="" className="w-8 h-8 object-contain" />
                      <div className="text-xs">{SYMBOL_NAMES[row.idx]}</div>
                      <div className="text-right text-xs font-mono text-amber-300">
                        {row.m3}×
                      </div>
                      <div className="text-right text-xs font-mono text-amber-300">
                        {row.m4}×
                      </div>
                      <div className="text-right text-xs font-mono text-amber-300">
                        {row.m5}×
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-[40px_1fr_60px_60px_60px] gap-2 items-center py-1 border-t border-border/30 mt-2 pt-2">
                    <img src={SYMBOL_IMAGES[9]} alt="" className="w-8 h-8 object-contain" />
                    <div className="text-xs">WILD — 모든 심볼 대체 (스캐터 제외)</div>
                  </div>
                  <div className="grid grid-cols-[40px_1fr_60px_60px_60px] gap-2 items-center py-1">
                    <img src={SYMBOL_IMAGES[10]} alt="" className="w-8 h-8 object-contain" />
                    <div className="text-xs">SCATTER — 3+ 시 보너스 휠</div>
                  </div>
                </div>
              )}

              {tab === "bonus" && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground mb-2">
                    스캐터 3+ 또는 Buy Bonus(100×) 시 8세그먼트 휠이 등장합니다.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {BONUS_SEGMENTS.map((s) => (
                      <div
                        key={s.m}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                          s.m === 1000
                            ? "border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-orange-500/20"
                            : "border-border/40 bg-muted/30"
                        }`}
                      >
                        <span className={`font-mono text-sm font-black ${s.m === 1000 ? "text-amber-300" : ""}`}>
                          {s.m}×
                        </span>
                        <span className="text-[10px] text-muted-foreground">{s.chance}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-border/20">
      <span className="text-foreground/80 font-medium text-xs">{k}</span>
      <span className="text-right text-xs text-muted-foreground">{v}</span>
    </div>
  );
}
