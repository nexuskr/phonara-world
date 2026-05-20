// Phase 6 — Health Dock Oracle Status (VRF v3 + 5-of-9 quorum).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  drand_round: number | null;
  server_pubkey: string | null;
  created_at: string;
  vrf_version: number | null;
  quorum_n: number | null;
  quorum_k: number | null;
  participating_nodes: number | null;
};

export default function OracleStatusCard() {
  const [row, setRow] = useState<Row | null>(null);
  const [mode, setMode] = useState<"prod" | "ephemeral" | "unknown">("unknown");
  const [lat, setLat] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const { data } = await (supabase as any)
          .from("apex_randomness_requests")
          .select("drand_round, server_pubkey, created_at, vrf_version, quorum_n, quorum_k, participating_nodes")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (live) setRow((data as unknown as Row) ?? null);
      } catch {}
      try {
        const t0 = performance.now();
        const res = await supabase.functions.invoke("apex-vrf-oracle-v3", {
          body: { game: "health", round_ref: `probe-${Date.now()}` },
        });
        const t1 = performance.now();
        if (!live) return;
        setLat(Math.round(t1 - t0));
        const m = (res as any)?.data?.mode || (res as any)?.headers?.["x-vrf-mode"];
        if (m === "prod" || m === "ephemeral") setMode(m);
      } catch {}
    };
    tick();
    const iv = setInterval(tick, 30_000);
    return () => { live = false; clearInterval(iv); };
  }, []);

  const v3 = (row?.vrf_version ?? 0) >= 3;
  const k = row?.quorum_k ?? 5;
  const n = row?.quorum_n ?? 9;
  const participating = row?.participating_nodes ?? 0;
  const quorumOk = participating >= k;

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">VRF Oracle</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {v3 && (
            <span className="rounded bg-fuchsia-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-fuchsia-300">
              VRF v3
            </span>
          )}
          <span className={`rounded px-2 py-0.5 text-[10px] font-mono ${quorumOk ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
            {participating}/{k}-of-{n} quorum
          </span>
          <span className={`rounded px-2 py-0.5 text-[10px] font-mono ${mode === "prod" ? "bg-emerald-500/20 text-emerald-300" : mode === "ephemeral" ? "bg-amber-500/20 text-amber-300" : "bg-muted text-muted-foreground"}`}>
            {mode.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Drand round</span><span className="font-mono">{row?.drand_round ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Probe latency</span><span className="font-mono">{lat != null ? `${lat} ms` : "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">tBLS threshold</span><span className="font-mono">{k}-of-{n} Ed25519</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Last attest</span><span className="font-mono text-xs">{row?.created_at ? new Date(row.created_at).toLocaleTimeString() : "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Server pubkey</span><span className="font-mono text-[10px] truncate max-w-[180px]">{row?.server_pubkey ? row.server_pubkey.slice(0, 16) + "…" : "—"}</span></div>
      </div>
    </div>
  );
}
