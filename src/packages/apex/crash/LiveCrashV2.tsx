// LiveCrashV2 — server-authoritative Crash UI (Provably-Fair v2).
// Non-invasive to existing CrashGame.tsx. HybridRenderer-powered curve.
import { useEffect, useRef, useState } from "react";
import { Rocket, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCrashTick } from "./useCrashTick";

function makeIdem() {
  return (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

export default function LiveCrashV2() {
  const state = useCrashTick();
  const [bet, setBet] = useState(100);
  const [autoCashout, setAutoCashout] = useState(2);
  const [betId, setBetId] = useState<string | null>(null);
  const [idem, setIdem] = useState<string>(() => makeIdem());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const cashedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset per round
  useEffect(() => {
    if (state.phase === "pending") {
      setBetId(null); setIdem(makeIdem()); cashedRef.current = false; setMsg(null);
    }
  }, [state.phase, state.roundId]);

  // Curve render
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth * dpr, h = c.clientHeight * dpr;
    if (c.width !== w) { c.width = w; c.height = h; }
    ctx.clearRect(0, 0, w, h);
    const m = state.multiplier;
    const pts = 60;
    ctx.strokeStyle = state.phase === "busted" ? "#ef4444" : "#22d3ee";
    ctx.lineWidth = 3 * dpr; ctx.shadowColor = ctx.strokeStyle as string; ctx.shadowBlur = 14 * dpr;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let i = 0; i <= pts; i++) {
      const x = (i / pts) * w;
      const localM = 1 + (m - 1) * (i / pts);
      const y = h - Math.min(h - 8, Math.log(localM) * h * 0.4);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [state.multiplier, state.phase]);

  // Auto-cashout
  useEffect(() => {
    if (state.phase !== "running" || !betId || cashedRef.current) return;
    if (state.multiplier >= autoCashout) { void cashout(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.multiplier, state.phase, betId, autoCashout]);

  async function placeBet() {
    if (!state.roundId || state.phase !== "pending" || busy) return;
    setBusy(true); setMsg(null);
    try {
      const { data, error } = await supabase.rpc("apex_crash_place_bet", {
        _round_id: state.roundId, _stake: bet, _auto_cashout: autoCashout, _idem_key: idem,
      });
      if (error) throw error;
      setBetId(data as string);
      setMsg(`✅ 베팅 완료 · ${bet.toLocaleString()} PHON @ ${autoCashout}x`);
    } catch (e: any) { setMsg(`❌ ${e?.message ?? e}`); } finally { setBusy(false); }
  }

  async function cashout() {
    if (!state.roundId || !betId || cashedRef.current) return;
    cashedRef.current = true;
    try {
      const { data, error } = await supabase.rpc("apex_crash_cashout", {
        _round_id: state.roundId, _current_x: state.multiplier, _idem_key: idem + ":cashout",
      });
      if (error) throw error;
      setMsg(`💰 CASHOUT @ ${state.multiplier.toFixed(2)}x · +${Number(data).toLocaleString()} PHON`);
    } catch (e: any) { cashedRef.current = false; setMsg(`❌ ${e?.message ?? e}`); }
  }

  const phaseColor = state.phase === "busted" ? "text-destructive" : "text-primary";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black apex-gradient-text flex items-center gap-2">
          <Rocket className="w-7 h-7 text-primary" /> CRASH <span className="text-xs font-mono text-muted-foreground">V2 · LIVE</span>
        </h1>
        {state.roundNo && (
          <Link to={`/apex/verify/${state.roundNo}`} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10">
            <ShieldCheck className="w-3 h-3" /> Verify #{state.roundNo}
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-primary/20 bg-card/70 p-5 backdrop-blur-md space-y-4">
        <div className="relative h-56 rounded-xl bg-background/70 overflow-hidden border border-primary/20">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className={`text-7xl font-black tabular-nums ${phaseColor}`}>{state.multiplier.toFixed(2)}x</div>
            <div className="text-[10px] uppercase tracking-widest mt-1 text-muted-foreground">
              {state.phase === "pending" && "BETTING WINDOW · 4s"}
              {state.phase === "running" && "FLYING"}
              {state.phase === "busted" && `CRASHED @ ${state.crashX?.toFixed(2)}x`}
              {state.phase === "idle" && "WAITING…"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Bet (PHON)</label>
            <input type="number" min={10} value={bet}
              onChange={(e) => setBet(Math.max(10, Number(e.target.value) || 10))}
              disabled={state.phase !== "pending" || !!betId}
              className="mt-1 w-full rounded-lg bg-input border border-border px-3 py-2 text-sm font-bold" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Auto Cashout (x)</label>
            <input type="number" min={1.01} step={0.01} value={autoCashout}
              onChange={(e) => setAutoCashout(Math.max(1.01, Number(e.target.value) || 1.01))}
              disabled={state.phase === "running" && !!betId}
              className="mt-1 w-full rounded-lg bg-input border border-border px-3 py-2 text-sm font-bold text-primary" />
          </div>
        </div>

        {!betId && (
          <button onClick={placeBet} disabled={busy || state.phase !== "pending"}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider disabled:opacity-40">
            {state.phase === "pending" ? `BET · ${bet.toLocaleString()} PHON` : "WAITING NEXT ROUND…"}
          </button>
        )}
        {betId && state.phase === "running" && !cashedRef.current && (
          <button onClick={cashout}
            className="w-full py-3 rounded-xl bg-amber-500 text-background font-black uppercase tracking-wider">
            CASHOUT @ {state.multiplier.toFixed(2)}x
          </button>
        )}

        {msg && <div className="text-sm text-center text-foreground/80">{msg}</div>}

        <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-muted-foreground border-t border-border/50">
          <div>Hash: <span className="font-mono">{state.serverSeedHash?.slice(0, 12) ?? "—"}…</span></div>
          <div>Public: <span className="font-mono">{state.publicSeed?.slice(0, 10) ?? "—"}…</span></div>
          <div>Jitter: <span className="font-mono">{state.jitterMs.toFixed(0)}ms</span></div>
        </div>
        <p className="text-center text-[10px] text-muted-foreground">House Edge 1.0% · RTP 99.0% · Ed25519 signed</p>
      </div>
    </div>
  );
}
