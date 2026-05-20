// /apex/verify/:roundNo — public Provably-Fair v2 verifier.
// Re-runs Ed25519 + SHA-256 + crash_x derivation in the browser.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShieldCheck, ShieldAlert, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RoundRow {
  round_no: number; server_seed: string | null; server_seed_hash: string; public_seed: string;
  nonce: number; crash_x: number; status: string; ed25519_signature: string | null;
  ed25519_public_key_b64: string | null; busted_at: string | null;
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function deriveCrashX(serverSeed: string, publicSeed: string, nonce: number) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${serverSeed}|${publicSeed}|${nonce}`));
  const view = new DataView(buf);
  const hi = view.getUint32(0), lo = view.getUint32(4);
  const u = (hi * 2 ** 20 + (lo >>> 12)) / 2 ** 52;
  if (u < 0.01) return 1.00;
  return Math.max(1.00, Math.min(10000, Math.floor((0.99 / u) * 100) / 100));
}
function b64dec(s: string) {
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export default function ApexVerify() {
  const { roundId: roundNoStr } = useParams();
  const [row, setRow] = useState<RoundRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checks, setChecks] = useState<{ hash: boolean; xOk: boolean; sigOk: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const roundNo = Number(roundNoStr);
        if (!roundNo) throw new Error("invalid_round");
        const { data, error } = await supabase.rpc("apex_crash_get_round", { _round_no: roundNo });
        if (error) throw error;
        const r = (Array.isArray(data) ? data[0] : data) as RoundRow | undefined;
        if (!r) throw new Error("not_found");
        setRow(r);
        if (r.status === "revealed" && r.server_seed && r.ed25519_public_key_b64 && r.ed25519_signature) {
          const hash = (await sha256Hex(r.server_seed)) === r.server_seed_hash;
          const recX = await deriveCrashX(r.server_seed, r.public_seed, Number(r.nonce));
          const xOk = Math.abs(recX - Number(r.crash_x)) < 1e-9;
          const payload = JSON.stringify({
            round_no: Number(r.round_no), server_seed: r.server_seed,
            public_seed: r.public_seed, nonce: Number(r.nonce), crash_x: Number(r.crash_x),
          });
          const pub = await crypto.subtle.importKey("raw", b64dec(r.ed25519_public_key_b64), "Ed25519", true, ["verify"]);
          const sigOk = await crypto.subtle.verify("Ed25519", pub, b64dec(r.ed25519_signature), new TextEncoder().encode(payload));
          setChecks({ hash, xOk, sigOk });
        }
      } catch (e: any) { setErr(String(e?.message ?? e)); }
    })();
  }, [roundNoStr]);

  const allOk = checks && checks.hash && checks.xOk && checks.sigOk;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link to="/apex/games/crash" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3 h-3" /> Crash로 돌아가기
      </Link>

      <header>
        <h1 className="text-3xl font-black tracking-tight">Provably-Fair Verifier</h1>
        <p className="text-sm text-muted-foreground mt-1">Round #{roundNoStr} · Ed25519 + SHA-256 검증 (브라우저 실행)</p>
      </header>

      {err && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{err}</div>}

      {row && (
        <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-md space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-xl ${allOk ? "bg-emerald-500/10 border border-emerald-500/40" : "bg-amber-500/10 border border-amber-500/40"}`}>
            {allOk ? <ShieldCheck className="w-8 h-8 text-emerald-400" /> : <ShieldAlert className="w-8 h-8 text-amber-400" />}
            <div>
              <div className="font-black text-lg">{allOk ? "VALID ✅" : row.status !== "revealed" ? "PENDING REVEAL" : "INVALID"}</div>
              <div className="text-xs text-muted-foreground">
                {allOk ? "모든 암호학적 검증 통과" : row.status !== "revealed" ? "라운드 종료 대기 중" : "검증 실패"}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <Row k="Round #" v={String(row.round_no)} />
            <Row k="Status" v={row.status} />
            <Row k="Crash X" v={row.crash_x ? Number(row.crash_x).toFixed(2) + "x" : "—"} />
            <Row k="Busted At" v={row.busted_at?.slice(0, 19) ?? "—"} />
            <Row k="Server Seed Hash" v={row.server_seed_hash} mono />
            <Row k="Public Seed" v={row.public_seed} mono />
            <Row k="Nonce" v={String(row.nonce)} mono />
            <Row k="Server Seed (revealed)" v={row.server_seed ?? "—"} mono />
            <Row k="Public Key (Ed25519)" v={row.ed25519_public_key_b64 ?? "—"} mono />
            <Row k="Signature" v={row.ed25519_signature ?? "—"} mono />
          </dl>

          {checks && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
              <Check label="SHA-256(server_seed) = hash" ok={checks.hash} />
              <Check label="crash_x recompute" ok={checks.xOk} />
              <Check label="Ed25519 signature" ok={checks.sigOk} />
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        외부 감사 가능 · 서버 시드 사전 해시 공개 후 reveal · `m(t) = 1.0024^(t/100ms)` · `crash_x = max(1, 0.99/U)` (U = SHA-256(seed||pub||nonce) top-52bits / 2^52)
      </p>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-background/50 px-3 py-2 border border-border/50">
      <div className="text-[10px] uppercase text-muted-foreground">{k}</div>
      <div className={`text-xs ${mono ? "break-all" : ""} text-foreground mt-0.5`}>{v}</div>
    </div>
  );
}
function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center text-[10px] font-bold ${ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-destructive/10 text-destructive border border-destructive/30"}`}>
      {ok ? "✅" : "❌"} {label}
    </div>
  );
}
