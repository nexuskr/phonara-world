/**
 * /duel/arena/:roomId — Imperial Duel Arena (Spectator + Live Betting + Cinematic v2).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  useDuelRoom, useDuelTick, useFomoOracle, useOddsEngine, useSpectatorSync,
  useShadowBetting,
  rollHmac, randomSeed, sha256Hex,
  computeThreshold, detectNearMiss, strongNearMissIntensity, rewardTierFromRoll, REWARD_LABEL,
  poolImbalance,
  type DuelRoundResult,
} from "@pkg/duel";
import { ThroneStage } from "@pkg/duel/components/arena/ThroneStage";
import { DuelistProfile } from "@pkg/duel/components/arena/DuelistProfile";
import { DuelObject } from "@pkg/duel/components/arena/DuelObject";
import { NearMissBurst } from "@pkg/duel/components/arena/NearMissBurst";
import { NearMissEdgeVignette } from "@pkg/duel/components/arena/NearMissEdgeVignette";
import { DuelHud } from "@pkg/duel/components/arena/DuelHud";
import { BettingPanel } from "@pkg/duel/components/arena/BettingPanel";
import { SpectatorDeck } from "@pkg/duel/components/arena/SpectatorDeck";
import { RewardTierBanner } from "@pkg/duel/components/arena/RewardTierBanner";
import { VerificationOracleModal, type BettingAuditEntry } from "@pkg/duel/components/oracle/VerificationOracleModal";
import { HeatLevelBadge } from "@pkg/duel/components/lobby/HeatLevelBadge";
import { notify } from "@/lib/notify";

const DivineJackpotOverlay = lazy(() => import("@pkg/duel/components/arena/DivineJackpotOverlay"));

const DURATION_MS = 2800;

export default function ImperialDuelArena() {
  const { roomId } = useParams();
  const [sp] = useSearchParams();
  const isSpectator = sp.get("as") === "spectator";
  const room = useDuelRoom(roomId);

  const odds = useOddsEngine({ roomId: room.id, heat: room.heat });
  const spectatorSync = useSpectatorSync(room.spectators, room.heat);
  const imbalance = poolImbalance(odds.pool);

  const signals = useFomoOracle({
    spectators: spectatorSync.spectators,
    jackpotPct: room.jackpotPct,
    poolImbalance: imbalance,
  });

  const shadow = useShadowBetting();
  const [round, setRound] = useState(1);
  const [state, setState] = useState<"idle" | "rolling" | "settled">("idle");
  const [result, setResult] = useState<DuelRoundResult | null>(null);
  const [showBurst, setShowBurst] = useState(false);
  const [oracleOpen, setOracleOpen] = useState(false);
  const [nearMissIntensity, setNearMissIntensity] = useState(0);
  const [nearMissSide, setNearMissSide] = useState<"left" | "right" | null>(null);
  const [lastPayout, setLastPayout] = useState<{ won: boolean; amount: number; stake: number } | null>(null);
  const [auditLog, setAuditLog] = useState<BettingAuditEntry[]>([]);
  const [divineOpen, setDivineOpen] = useState(false);
  const [divineWinnerName, setDivineWinnerName] = useState("");
  const [lastSeedHash, setLastSeedHash] = useState<string>("");
  const historyRef = useRef<Array<"left" | "right">>([]);

  const easeStrong = (result?.nearMiss ?? false) || nearMissIntensity > 0.4;
  const tick = useDuelTick(state === "rolling", DURATION_MS, easeStrong);

  // pool_imbalance 트리거 토스트 (한 라운드당 1회)
  const lastImbToast = useRef(0);
  useEffect(() => {
    if (imbalance >= 0.45 && Date.now() - lastImbToast.current > 25_000) {
      lastImbToast.current = Date.now();
      notify.warning("황실이 한쪽으로 기울었습니다 — 반대편 배당이 폭발합니다");
    }
  }, [imbalance]);

  const startRoll = useCallback(async () => {
    setState("rolling");
    setShowBurst(false);
    setNearMissIntensity(0);
    setNearMissSide(null);
    const serverSeed = randomSeed(32);
    const clientSeed = randomSeed(16);
    const nonce = round;
    const serverSeedHash = await sha256Hex(serverSeed);
    const rng = await rollHmac(serverSeed, clientSeed, nonce);
    const { threshold, offset } = computeThreshold({ recentResults: historyRef.current, personalHeat: signals.personalScore });
    const winner: "left" | "right" = rng.roll < threshold ? "left" : "right";
    const nm = detectNearMiss(rng.roll, threshold);
    const strongIntensity = strongNearMissIntensity(rng.roll);
    const tier = rewardTierFromRoll(rng.roll);
    const next: DuelRoundResult = {
      winner,
      rollValue: rng.roll,
      rolledDeg: Math.floor(rng.roll * 360),
      nearMiss: nm.nearMiss,
      nearMissMargin: nm.margin,
      threshold,
      rewardTier: tier,
      proof: {
        serverSeedHash, serverSeed, clientSeed, nonce,
        hmacHex: rng.hmacHex,
        rollHex: rng.rollHex,
        groth16ProofBytes: 287,
        zkStarkPlaceholder: "STARK:" + rng.hmacHex.slice(0, 48) + "…",
      },
      fomo: { ...signals, dynamicOffset: offset, nearMissFlag: nm.nearMiss, threshold },
    };
    historyRef.current = [...historyRef.current, winner].slice(-10);

    // 즉시 intensity 반영 — 회전 중 dynamic glow/sweep 가속
    setNearMissIntensity(strongIntensity);

    window.setTimeout(() => {
      setResult(next);
      setState("settled");
      if (nm.nearMiss || strongIntensity > 0.2) {
        setShowBurst(true);
        // 진 측 표기
        setNearMissSide(winner === "left" ? "right" : "left");
      }
      signals.recordResult(winner, nm.nearMiss);

      // 베팅 정산
      const poolSnapshot = odds.pool;
      const settled = odds.settleRound(winner);
      const won = settled.payout > 0;
      const stake = settled.bet?.amount ?? 0;
      if (settled.bet) {
        setLastPayout({ won, amount: settled.payout, stake });
      }

      // 황실 잭팟 토스트
      if (tier === "divine") {
        notify.imperial(`신성한 대관식입니다 — JACKPOT (${winner === "left" ? room.left.nickname : room.right.nickname})`);
      } else if (tier === "empyrean") {
        notify.imperial("천계가 열립니다 — Empyrean Tier");
      }

      setAuditLog((log) => [
        ...log,
        {
          round,
          leftPool: poolSnapshot.leftPool,
          rightPool: poolSnapshot.rightPool,
          winnerSide: winner,
          payout: settled.payout,
          hmacShort: rng.hmacHex.slice(0, 16),
        },
      ].slice(-30));
    }, DURATION_MS);
  }, [round, signals, odds, room]);

  const onNext = () => {
    setRound((r) => r + 1);
    setState("idle");
    setResult(null);
    setNearMissIntensity(0);
    setLastPayout(null);
  };

  const lastReward = useMemo(() => {
    if (!result) return null;
    return `${REWARD_LABEL[result.rewardTier]} · ${result.winner === "left" ? room.left.nickname : room.right.nickname} 승리`;
  }, [result, room]);

  return (
    <div className="min-h-screen bg-[#0A0503] text-amber-50">
      <div className="container mx-auto px-3 md:px-6 py-4 md:py-6 max-w-6xl">
        <header className="flex items-center justify-between mb-3">
          <Link to="/duel" className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300/80 hover:text-amber-200">
            <ArrowLeft className="w-3.5 h-3.5" /> 대관전 로비
          </Link>
          <div className="text-center">
            <div className="text-[10px] tracking-[0.32em] font-black uppercase text-amber-400/85">
              {room.title} {isSpectator && " · 관전 모드"}
            </div>
            <h1 className="font-imperial text-xl md:text-2xl text-amber-100 leading-tight"
                style={{ textShadow: "0 0 14px hsl(38 92% 60% / 0.55)" }}>
              옥좌의 결투장
            </h1>
          </div>
          <HeatLevelBadge level={room.heat} />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
          <div className="space-y-3">
            {result && state === "settled" && (
              <RewardTierBanner
                tier={result.rewardTier}
                winnerNick={result.winner === "left" ? room.left.nickname : room.right.nickname}
              />
            )}

            <ThroneStage nearMissIntensity={nearMissIntensity}>
              <div className="relative px-4 md:px-8 py-6 md:py-10">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6">
                  <DuelistProfile d={room.left} side="left" glow={state === "settled" && result?.winner === "left"} />
                  <div className="flex flex-col items-center gap-2">
                    <DuelObject
                      kind={room.object}
                      rolledDeg={result?.rolledDeg ?? 0}
                      progress={tick}
                      spinning={state === "rolling"}
                    />
                    <span className="text-[9px] tracking-[0.32em] font-black uppercase text-pink-300/90">VS</span>
                  </div>
                  <DuelistProfile d={room.right} side="right" glow={state === "settled" && result?.winner === "right"} />
                </div>
                <NearMissBurst
                  show={showBurst}
                  intensity={Math.max(nearMissIntensity, result?.nearMiss ? 0.6 : 0)}
                  onDone={() => setShowBurst(false)}
                />
              </div>
            </ThroneStage>

            {!isSpectator && (
              <DuelHud
                round={round}
                state={state}
                stake={room.stake}
                onRoll={state === "settled" ? onNext : startRoll}
                rollDisabled={false}
                onOpenOracle={() => setOracleOpen(true)}
                lastReward={lastReward}
              />
            )}

            {isSpectator && state === "settled" && (
              <button
                type="button"
                onClick={onNext}
                className="w-full rounded-2xl py-4 font-imperial tracking-[0.22em] text-sm border border-amber-400/45 text-amber-100 bg-black/40 hover:bg-black/60 active:scale-[0.97]"
              >
                다음 라운드 관전
              </button>
            )}
          </div>

          <aside className="space-y-3">
            <SpectatorDeck
              spectators={spectatorSync.spectators}
              arrivals={spectatorSync.arrivals}
              pool={odds.pool}
              leftName={room.left.nickname}
              rightName={room.right.nickname}
            />
            <BettingPanel
              leftName={room.left.nickname}
              rightName={room.right.nickname}
              oddsLeft={odds.odds.left}
              oddsRight={odds.odds.right}
              disabled={state === "rolling"}
              nearMissSide={state === "settled" ? nearMissSide : null}
              lastPayout={lastPayout}
              onPlace={odds.place}
              myStake={odds.myBet ? { side: odds.myBet.side, amount: odds.myBet.amount } : null}
            />
          </aside>
        </div>

        <p className="mt-4 text-center text-[11px] text-amber-300/75 break-keep leading-snug">
          황실은 결투 전 서버 시드를 봉인하고, 결과 직후 폐하께 공개합니다.{" "}
          <button onClick={() => setOracleOpen(true)} className="underline decoration-amber-400/60 underline-offset-2">
            황실 검증 오라클 열기 →
          </button>
        </p>
      </div>

      <VerificationOracleModal
        open={oracleOpen}
        onOpenChange={setOracleOpen}
        result={result}
        signals={signals}
        bettingAudit={auditLog}
      />
    </div>
  );
}
