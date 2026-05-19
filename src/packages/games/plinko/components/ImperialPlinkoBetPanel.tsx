/** ImperialPlinkoBetPanel — risk + rows + bet + drop CTA. */
import { memo } from "react";
import { Sparkles } from "lucide-react";
import { ImperialChipRow, ImperialPrimaryCta } from "@pkg/games/core/imperial";
import type { PlinkoRisk, PlinkoRow } from "../types";

interface Props {
  bet: number; setBet: (n: number) => void;
  risk: PlinkoRisk; setRisk: (r: PlinkoRisk) => void;
  rows: PlinkoRow; setRows: (r: PlinkoRow) => void;
  balance: number;
  dropping: boolean;
  onDrop: () => void;
  demoMode?: boolean;
}

const RISKS: { id: PlinkoRisk; label: string }[] = [
  { id: "low", label: "안전" },
  { id: "medium", label: "균형" },
  { id: "high", label: "공격" },
];
const ROWS_OPTS: PlinkoRow[] = [8, 12, 16];
const QUICK = [1000, 10000, 50000, 100000];

function ImperialPlinkoBetPanelImpl({
  bet, setBet, risk, setRisk, rows, setRows, balance, dropping, onDrop, demoMode,
}: Props) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--gold))]/30 bg-gradient-to-br from-card to-card/60 p-4 space-y-4 shadow-[0_0_30px_hsla(45,80%,40%,0.08)]">
      <div className="grid grid-cols-3 gap-2">
        {RISKS.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={dropping}
            onClick={() => setRisk(r.id)}
            className={`h-11 rounded-xl font-bold text-sm border transition active:scale-95 disabled:opacity-50 ${
              risk === r.id
                ? "bg-gradient-to-br from-[hsl(var(--gold))]/30 to-[hsl(var(--pink))]/20 border-[hsl(var(--gold))]/60 text-[hsl(var(--gold))]"
                : "bg-background/40 border-border/40 text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ROWS_OPTS.map((r) => (
          <button
            key={r}
            type="button"
            disabled={dropping}
            onClick={() => setRows(r)}
            className={`h-11 rounded-xl font-bold text-sm border transition active:scale-95 disabled:opacity-50 ${
              rows === r
                ? "bg-gradient-to-br from-[hsl(var(--gold))]/30 to-[hsl(var(--pink))]/20 border-[hsl(var(--gold))]/60 text-[hsl(var(--gold))]"
                : "bg-background/40 border-border/40 text-foreground"
            }`}
          >
            {r} 줄
          </button>
        ))}
      </div>

      <ImperialChipRow values={QUICK} active={bet} onChange={setBet} disabled={dropping} />

      <label className="block space-y-1">
        <span className="text-[11px] text-muted-foreground flex items-center justify-between">
          <span>베팅 (PHON)</span>
          <span>잔액 <span className="text-[hsl(var(--gold))] font-bold tabular-nums">{balance.toLocaleString()}</span></span>
        </span>
        <input
          type="number"
          inputMode="numeric"
          value={bet}
          disabled={dropping}
          onChange={(e) => setBet(Math.max(100, Number(e.target.value || 0)))}
          className="w-full h-12 rounded-xl border border-border/50 bg-background/60 px-3 text-base font-bold text-foreground tabular-nums disabled:opacity-60"
        />
      </label>

      <ImperialPrimaryCta
        onClick={onDrop}
        disabled={dropping || bet > balance}
        loading={dropping}
        loadingLabel="낙하 중…"
        variant="duo"
        pulse={!dropping}
      >
        <Sparkles className="w-5 h-5" />
        {demoMode ? "데모 드롭" : "드롭"} · {bet.toLocaleString()} PHON
      </ImperialPrimaryCta>

      {demoMode && (
        <p className="text-[10px] text-center text-muted-foreground">
          데모 모드 · 실제 PHON 차감되지 않음 (실머니 베팅 곧 출시)
        </p>
      )}
    </div>
  );
}

export const ImperialPlinkoBetPanel = memo(ImperialPlinkoBetPanelImpl);
export default ImperialPlinkoBetPanel;
