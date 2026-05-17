/**
 * VerificationOracleModal v2 — 5-Tab Cosmic Oracle.
 * Classic (HMAC + Personal) / Groth16 / Halo2 Recursive / zk-STARK FRI + R1CS / Betting Audit.
 */
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { lazy, Suspense } from "react";
import type { DuelRoundResult, FomoSignals } from "@pkg/duel";

const Halo2RecursivePanel = lazy(() => import("./Halo2RecursivePanel"));
const StarkFriPanel = lazy(() => import("./StarkFriPanel"));

export interface BettingAuditEntry {
  round: number;
  leftPool: number;
  rightPool: number;
  winnerSide: "left" | "right";
  payout: number;
  hmacShort: string;
  balanceAfter?: number;
}

const TRIGGER_LABEL: Record<string, string> = {
  near_miss_streak: "황제의 운이 가까이",
  win_drought: "승리가 그리워질 때",
  royal_pass_milestone: "황실 패스 임박",
  session_resurrection: "다시 강림하신 폐하",
  heat_surge: "황실이 끓어오릅니다",
  pool_imbalance: "한쪽 진영이 폭주합니다",
};

export function VerificationOracleModal({
  open,
  onOpenChange,
  result,
  signals,
  bettingAudit = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: DuelRoundResult | null;
  signals: FomoSignals;
  bettingAudit?: BettingAuditEntry[];
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={<span className="font-imperial tracking-[0.18em] text-amber-100">황실 검증 오라클</span>} description="폐하의 결투, 황실이 직접 증명합니다 · Cosmic 5-Tab">
      <div className="px-4 pb-4">
        <Tabs defaultValue="classic">
          <TabsList className="grid grid-cols-5 w-full bg-black/45 border border-amber-400/25">
            <TabsTrigger value="classic" className="text-[10px]">Classic</TabsTrigger>
            <TabsTrigger value="groth16" className="text-[10px]">Groth16</TabsTrigger>
            <TabsTrigger value="halo2" className="text-[10px]">Halo2</TabsTrigger>
            <TabsTrigger value="stark" className="text-[10px]">STARK</TabsTrigger>
            <TabsTrigger value="betting" className="text-[10px]">Betting</TabsTrigger>
          </TabsList>

          <TabsContent value="classic" className="space-y-2">
            <Row k="Server Seed Hash" v={result?.proof.serverSeedHash} mono />
            <Row k="Server Seed" v={result?.proof.serverSeed} mono />
            <Row k="Client Seed" v={result?.proof.clientSeed} mono />
            <Row k="Nonce" v={String(result?.proof.nonce ?? "—")} />
            <Row k="HMAC-SHA512" v={(result?.proof.hmacHex.slice(0, 64) ?? "—") + (result?.proof.hmacHex ? "…" : "")} mono />
            <Row k="Roll Hex" v={result?.proof.rollHex} mono />
            <Row k="Roll" v={result ? result.rollValue.toFixed(8) : "—"} />

            {/* Personal FOMO folded in */}
            <div className="rounded-xl p-3 bg-gradient-to-br from-[#160a05] to-[#1a0a14] border border-amber-400/30 mt-3">
              <div className="text-[10px] tracking-[0.28em] font-black uppercase text-amber-300/85">Personal FOMO</div>
              <div className="font-imperial text-2xl text-amber-100 tabular-nums">{signals.personalScore}</div>
              <div className="h-2 rounded-full bg-black/55 overflow-hidden mt-1.5">
                <div className="h-full" style={{ width: `${signals.personalScore}%`, background: "linear-gradient(90deg,#F5C518,#F472B6)" }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-amber-300/80 tabular-nums mt-1.5">
                <span>Global Heat · Lv.{signals.globalHeat}</span>
                <span>Threshold · {signals.threshold.toFixed(5)}</span>
              </div>
              {signals.triggers.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {signals.triggers.map((t) => (
                    <li key={t} className="text-[10.5px] text-amber-100/90">• {TRIGGER_LABEL[t] ?? t}</li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-[11px] text-amber-300/80 leading-snug break-keep mt-2">
              황실은 결투 전 서버 시드를 봉인하고, 결과 직후 공개합니다. 폐하가 직접 HMAC-SHA512 로 검증하실 수 있습니다.
            </p>
          </TabsContent>

          <TabsContent value="groth16" className="space-y-2">
            <div className="rounded-xl p-3 bg-gradient-to-br from-[#160a05] to-[#0A0503] border border-amber-400/25">
              <div className="text-[10px] tracking-[0.24em] font-black uppercase text-amber-300/80">Circuit Flow</div>
              <pre className="text-[10px] text-amber-100/80 mt-1 leading-snug">{`seed → poseidon → R1CS → Groth16
public: [dynamicOffset, fomo, nearMiss, trigger]`}</pre>
            </div>
            <Row k="Proof Size" v="287 bytes" />
            <Row k="Dynamic Offset" v={signals.dynamicOffset.toFixed(5)} />
            <Row k="Personal FOMO" v={String(signals.personalScore)} />
            <Row k="Near-Miss Flag" v={signals.nearMissFlag ? "TRUE" : "false"} />
            <Row k="Trigger" v={signals.triggers[0] ?? "—"} />
            <p className="text-[11px] text-amber-300/80 mt-2 break-keep leading-snug">
              황실의 모든 가변 임계는 Groth16 회로의 public signals 로 노출되어, 폐하의 결투를 누구도 조작할 수 없습니다.
            </p>
          </TabsContent>

          <TabsContent value="halo2" className="space-y-2">
            <Suspense fallback={<div className="text-[11px] text-amber-300/70 py-4 text-center">증명 회로 봉인 중…</div>}>
              <Halo2RecursivePanel
                hmacHex={result?.proof.hmacHex}
                nonce={result?.proof.nonce}
                depth={3}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="stark" className="space-y-2">
            <Suspense fallback={<div className="text-[11px] text-amber-300/70 py-4 text-center">FRI 다항식을 접는 중…</div>}>
              <StarkFriPanel hmacHex={result?.proof.hmacHex} nonce={result?.proof.nonce} />
            </Suspense>
          </TabsContent>

          <TabsContent value="betting" className="space-y-2">
            <div className="rounded-xl p-3 bg-gradient-to-br from-[#160a05] to-[#1a0a14] border border-amber-400/30">
              <div className="text-[10px] tracking-[0.28em] font-black uppercase text-amber-300/85">Betting Audit</div>
              <p className="text-[11px] text-amber-200/85 mt-1 break-keep leading-snug">
                Shadow PROOF MODE — 실잔액 변동 0. 동일 HMAC seed 로 누구나 재계산할 수 있습니다.
              </p>
            </div>
            {bettingAudit.length === 0 ? (
              <div className="text-[11px] text-amber-200/70 text-center py-4">아직 정산된 라운드가 없습니다</div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[36px_1fr_1fr_44px_70px_72px] gap-1 text-[9px] tracking-[0.16em] font-black uppercase text-amber-300/75 px-2">
                  <span>#R</span><span>L Pool</span><span>R Pool</span><span>승자</span><span>Payout</span><span>Balance</span>
                </div>
                {bettingAudit.slice().reverse().map((e) => (
                  <div key={e.round} className="grid grid-cols-[36px_1fr_1fr_44px_70px_72px] gap-1 items-center rounded-lg px-2 py-1.5 bg-black/40 border border-amber-400/15 text-[10.5px] text-amber-100/95 tabular-nums">
                    <span className="text-amber-300">{e.round}</span>
                    <span>{e.leftPool.toLocaleString()}</span>
                    <span>{e.rightPool.toLocaleString()}</span>
                    <span className={e.winnerSide === "left" ? "text-amber-300" : "text-pink-300"}>{e.winnerSide.toUpperCase()}</span>
                    <span className={e.payout > 0 ? "text-amber-200 font-black" : "text-amber-200/55"}>
                      {e.payout > 0 ? "+" + e.payout.toLocaleString() : "—"}
                    </span>
                    <span className="text-amber-200/85">{e.balanceAfter != null ? e.balanceAfter.toLocaleString() : "—"}</span>
                    <span className="col-span-6 font-mono text-[9px] text-amber-300/65 truncate">{e.hmacShort}…</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </BottomSheet>
  );
}

function Row({ k, v, mono }: { k: string; v?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 bg-black/35 border border-amber-400/15">
      <span className="text-[10px] tracking-[0.22em] font-black uppercase text-amber-300/80 shrink-0">{k}</span>
      <span className={`text-[11px] text-amber-100/95 text-right break-all ${mono ? "font-mono" : ""}`}>{v ?? "—"}</span>
    </div>
  );
}

export default VerificationOracleModal;
