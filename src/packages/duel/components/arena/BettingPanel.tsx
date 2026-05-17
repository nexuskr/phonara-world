/**
 * BettingPanel — 시뮬레이션 PHON 베팅 (잔액 변동 0).
 * Left/Right 진영 카드 + 실시간 odds 펄스 + Near-Miss shake.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Swords } from "lucide-react";
import { notify } from "@/lib/notify";

interface Props {
  leftName: string;
  rightName: string;
  oddsLeft: number;
  oddsRight: number;
  disabled?: boolean;
  /** 직전 라운드 near-miss 정보 — 한 끗 차이로 졌던 측을 강조 */
  nearMissSide?: "left" | "right" | null;
  /** 직전 라운드 가상 payout — 토스트용 */
  lastPayout?: { won: boolean; amount: number; stake: number } | null;
  onPlace: (side: "left" | "right", amount: number) => void;
  myStake?: { side: "left" | "right"; amount: number } | null;
}

const PRESETS = [100, 500, 2_000, 10_000, 50_000];

export function BettingPanel({
  leftName, rightName, oddsLeft, oddsRight, disabled,
  nearMissSide, lastPayout, onPlace, myStake,
}: Props) {
  const [side, setSide] = useState<"left" | "right">("left");
  const [amount, setAmount] = useState(500);

  // 직전 라운드 결과 토스트
  const lastRef = useRef(lastPayout);
  useEffect(() => {
    if (lastPayout && lastPayout !== lastRef.current) {
      lastRef.current = lastPayout;
      if (lastPayout.won) {
        notify.success(
          `옥좌가 폐하의 손을 들었습니다 — +${lastPayout.amount.toLocaleString()} PHON (데모 베팅)`,
        );
      } else {
        notify.warning(
          `이번 결투는 빗나갔습니다 — ${lastPayout.stake.toLocaleString()} PHON 시뮬레이션 (잔액 변동 없음)`,
        );
      }
    }
  }, [lastPayout]);

  const handlePlace = () => {
    if (disabled) return;
    onPlace(side, amount);
    notify.imperial?.(`${side === "left" ? leftName : rightName} 진영에 ${amount.toLocaleString()} PHON 봉납 — 옥좌에 베팅을 올리소서`) ??
      notify.success(`${side === "left" ? leftName : rightName} 진영에 ${amount.toLocaleString()} PHON 봉납`);
  };

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#160a05] to-[#0A0503] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-amber-300" />
          <span className="font-imperial text-base text-amber-100">옥좌에 베팅을 올리소서</span>
        </div>
        <span className="text-[10px] tracking-[0.22em] font-black uppercase text-pink-300/85">DEMO</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SideCard
          name={leftName}
          odds={oddsLeft}
          selected={side === "left"}
          onSelect={() => setSide("left")}
          flavor="amber"
          nearMiss={nearMissSide === "left"}
          myBet={myStake?.side === "left" ? myStake.amount : 0}
        />
        <SideCard
          name={rightName}
          odds={oddsRight}
          selected={side === "right"}
          onSelect={() => setSide("right")}
          flavor="pink"
          nearMiss={nearMissSide === "right"}
          myBet={myStake?.side === "right" ? myStake.amount : 0}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-[0.22em] font-black uppercase text-amber-300/80">베팅액</span>
          <span className="font-imperial text-base text-amber-100 tabular-nums">{amount.toLocaleString()} PHON</span>
        </div>
        <input
          type="range"
          min={100}
          max={50_000}
          step={100}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-amber-400 h-14"
          style={{ minHeight: 56 }}
          disabled={disabled}
        />
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`px-2 py-1 rounded-md text-[10px] font-black tabular-nums border transition ${
                amount === p
                  ? "border-amber-400/80 bg-amber-400/15 text-amber-100"
                  : "border-amber-400/25 text-amber-300/75 hover:bg-black/40"
              }`}
            >
              {p >= 1000 ? `${p / 1000}K` : p}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handlePlace}
        disabled={disabled}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-4 font-imperial tracking-[0.22em] text-sm bg-gradient-to-r from-amber-400 via-amber-300 to-pink-500 text-[#1a0a05] font-black active:scale-[0.97] will-change-transform disabled:opacity-50"
        style={{ minHeight: 56, boxShadow: "0 0 18px hsl(38 92% 60% / 0.5)" }}
      >
        <Swords className="w-4 h-4" />
        {disabled ? "결투 진행 중…" : "베팅 봉납"}
      </button>

      <p className="text-[10px] text-amber-300/70 text-center break-keep leading-snug">
        시뮬레이션 PHON — 실제 잔액 변동 없음. 황실 검증 오라클에서 모든 라운드를 재계산할 수 있습니다.
      </p>
    </div>
  );
}

function SideCard({
  name, odds, selected, onSelect, flavor, nearMiss, myBet,
}: {
  name: string; odds: number; selected: boolean; onSelect: () => void;
  flavor: "amber" | "pink"; nearMiss?: boolean; myBet?: number;
}) {
  const [pulseKey, setPulseKey] = useState(0);
  const prev = useRef(odds);
  useEffect(() => {
    if (Math.abs(odds - prev.current) > 0.02) {
      prev.current = odds;
      setPulseKey((k) => k + 1);
    }
  }, [odds]);

  const baseBorder = flavor === "amber" ? "border-amber-400/40" : "border-pink-400/40";
  const selBorder = flavor === "amber" ? "border-amber-300" : "border-pink-300";
  const text = flavor === "amber" ? "text-amber-100" : "text-pink-100";

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      animate={nearMiss ? { x: [0, -3, 3, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative text-left rounded-xl border-2 ${selected ? selBorder : baseBorder} bg-black/45 p-2.5 active:scale-[0.98] will-change-transform`}
      style={{
        boxShadow: nearMiss
          ? "0 0 0 2px hsl(330 90% 65% / 0.85), 0 0 22px hsl(330 90% 65% / 0.55)"
          : selected
            ? `0 0 18px ${flavor === "amber" ? "hsl(38 92% 60% / 0.6)" : "hsl(330 90% 60% / 0.6)"}`
            : undefined,
      }}
    >
      <div className={`text-[10px] tracking-[0.22em] font-black uppercase ${flavor === "amber" ? "text-amber-300/85" : "text-pink-300/85"}`}>
        {name}
      </div>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={pulseKey}
          initial={{ scale: 1.04 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.22 }}
          className={`font-imperial text-2xl ${text} tabular-nums leading-tight`}
        >
          ×{odds.toFixed(2)}
        </motion.div>
      </AnimatePresence>
      {!!myBet && (
        <div className="text-[10px] text-amber-200/85 mt-0.5 tabular-nums">내 봉납 {myBet.toLocaleString()} PHON</div>
      )}
      {nearMiss && (
        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md bg-pink-500 text-[9px] font-black text-white tracking-[0.18em]">
          한 끗
        </div>
      )}
    </motion.button>
  );
}

export default BettingPanel;
