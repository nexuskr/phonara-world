import { useEffect, useState } from "react";
import { ShieldCheck, Copy, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import { getRoundProof, recomputeMultiplierFromSeed, type RoundProof } from "@/lib/crash";
import { sha256Hex } from "@/lib/slots/fairness";
import { notify } from "@/lib/notify";

interface Props {
  roundId: string | null | undefined;
  defaultOpen?: boolean;
  compact?: boolean;
}

function short(s?: string | null, n = 10) {
  if (!s) return "—";
  return s.length > n * 2 + 3 ? `${s.slice(0, n)}…${s.slice(-n)}` : s;
}

async function copy(s: string) {
  try { await navigator.clipboard.writeText(s); notify.success("복사됨"); }
  catch { notify.error("복사 실패"); }
}

export default function FairnessPanel({ roundId, defaultOpen = false, compact = false }: Props) {
  const [open, setOpen] = useState(defaultOpen || compact);
  const [proof, setProof] = useState<RoundProof | null>(null);
  const [recomputedHash, setRecomputedHash] = useState<string | null>(null);
  const [recomputedMult, setRecomputedMult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !roundId) return;
    let alive = true;
    setLoading(true);
    getRoundProof(roundId).then(async (p) => {
      if (!alive) return;
      setProof(p);
      if (p.ok && p.seed) {
        const [h, m] = await Promise.all([sha256Hex(p.seed), recomputeMultiplierFromSeed(p.seed)]);
        if (!alive) return;
        setRecomputedHash(h);
        setRecomputedMult(m);
      } else {
        setRecomputedHash(null);
        setRecomputedMult(null);
      }
    }).catch(() => {/* */}).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open, roundId]);

  const hashOk = proof?.seed_hash && recomputedHash && recomputedHash.toLowerCase() === proof.seed_hash.toLowerCase();
  const multOk = proof?.crash_multiplier != null && recomputedMult != null &&
    Math.abs(Number(proof.crash_multiplier) - recomputedMult) < 0.011;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full min-h-11 px-4 py-3 flex items-center justify-between gap-2 active:bg-background/40"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ShieldCheck className="w-4 h-4 text-[hsl(var(--gold))]" />
          공정성 검증 (Provably Fair)
          {proof?.seed_revealed && hashOk && (
            <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-[hsl(var(--gold))] font-bold">
              <CheckCircle2 className="w-3 h-3" /> 검증됨
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 text-xs">
          {!roundId && <p className="text-muted-foreground py-2">라운드 정보 대기 중…</p>}

          {roundId && loading && !proof && <p className="text-muted-foreground py-2">불러오는 중…</p>}

          {proof && proof.ok && (
            <>
              <Row label="라운드 ID" value={short(proof.id, 8)} full={proof.id ?? undefined} />
              <Row label="시드 해시(commit)" value={short(proof.seed_hash, 12)} full={proof.seed_hash ?? undefined} />

              {proof.seed_revealed && proof.seed ? (
                <>
                  <Row label="공개된 시드" value={short(proof.seed, 12)} full={proof.seed} />
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-background/40 px-3 py-2">
                    <span className="text-muted-foreground">재계산된 해시</span>
                    <span className={`font-mono tabular-nums ${hashOk ? "text-[hsl(var(--gold))]" : "text-destructive"}`}>
                      {recomputedHash ? short(recomputedHash, 10) : "…"}
                      {hashOk
                        ? <CheckCircle2 className="inline w-3.5 h-3.5 ml-1 -mt-0.5" />
                        : recomputedHash && <XCircle className="inline w-3.5 h-3.5 ml-1 -mt-0.5" />}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-background/40 px-3 py-2">
                    <span className="text-muted-foreground">서버 크래시 배수</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {Number(proof.crash_multiplier ?? 0).toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-background/40 px-3 py-2">
                    <span className="text-muted-foreground">재계산된 배수</span>
                    <span className={`font-bold tabular-nums ${multOk ? "text-[hsl(var(--gold))]" : "text-destructive"}`}>
                      {recomputedMult != null ? `${recomputedMult.toFixed(2)}x` : "…"}
                      {multOk
                        ? <CheckCircle2 className="inline w-3.5 h-3.5 ml-1 -mt-0.5" />
                        : recomputedMult != null && <XCircle className="inline w-3.5 h-3.5 ml-1 -mt-0.5" />}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground py-2">
                  라운드 종료 후 시드가 공개됩니다. 지금은 해시(약속)만 확인할 수 있어요.
                </p>
              )}

              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">어떻게 검증되나요?</summary>
                <div className="mt-2 space-y-1.5 text-muted-foreground leading-relaxed">
                  <p>1. 라운드 시작 전 서버가 비밀 시드의 <b className="text-foreground">SHA-256 해시</b>를 먼저 공개해요.</p>
                  <p>2. 라운드가 폭발한 뒤 시드 원본을 공개해요.</p>
                  <p>3. 누구나 그 시드를 다시 해싱해서 <b className="text-foreground">처음 약속한 해시와 동일</b>한지 확인할 수 있어요.</p>
                  <p>4. 시드로 배수를 다시 계산해 결과 조작 여부를 검증해요.</p>
                </div>
              </details>
            </>
          )}

          {proof && !proof.ok && <p className="text-destructive">해당 라운드를 찾을 수 없어요</p>}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-background/40 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="font-mono tabular-nums text-foreground">{value}</span>
        {full && (
          <button
            onClick={() => copy(full)}
            className="p-1 rounded-md hover:bg-background/60 text-muted-foreground hover:text-foreground"
            aria-label="복사"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}
