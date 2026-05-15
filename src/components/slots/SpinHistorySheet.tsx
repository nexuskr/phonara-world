import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History, ShieldCheck, ShieldAlert, Copy, Check } from "lucide-react";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { verifySpin } from "@/lib/slots/fairness";

type SpinRow = {
  id: string;
  game_code: string;
  bet_phon: number;
  payout_phon: number;
  bonus_triggered: boolean;
  bonus_multiplier: number | null;
  is_buy_bonus: boolean;
  server_seed_hash: string;
  server_seed_revealed: string;
  client_seed: string;
  nonce: number;
  created_at: string;
};

type Verdict = "pending" | "ok" | "bad" | "loading";

function fmt(n: number) { return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function shortHash(h: string) { return h ? `${h.slice(0, 10)}…${h.slice(-6)}` : ""; }

export default function SpinHistorySheet({ gameCode }: { gameCode: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SpinRow[] | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setRows(null);
    (async () => {
      const { data, error } = await supabase
        .from("slot_spins")
        .select("id,game_code,bet_phon,payout_phon,bonus_triggered,bonus_multiplier,is_buy_bonus,server_seed_hash,server_seed_revealed,client_seed,nonce,created_at")
        .eq("game_code", gameCode)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!alive) return;
      if (error) {
        notify.error("히스토리를 불러오지 못했습니다", { description: error.message });
        setRows([]);
        return;
      }
      setRows((data ?? []) as SpinRow[]);
    })();
    return () => { alive = false; };
  }, [open, gameCode]);

  const verifyOne = async (row: SpinRow) => {
    setVerdicts((m) => ({ ...m, [row.id]: "loading" }));
    const v = await verifySpin({
      server_seed_hash: row.server_seed_hash,
      server_seed_revealed: row.server_seed_revealed,
    });
    setVerdicts((m) => ({ ...m, [row.id]: v.ok ? "ok" : "bad" }));
    if (v.ok) {
      notify.success("Provably Fair 검증 통과", { description: "서버 시드 해시 = 공개 시드의 SHA-256" });
    } else {
      notify.error("검증 실패", { description: v.ok ? "" : v.reason });
    }
  };

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1200);
    } catch { /* noop */ }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="스핀 히스토리"
          className="p-2 rounded-lg border border-border/40 hover:bg-muted/40 transition text-muted-foreground"
        >
          <History className="w-4 h-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            스핀 히스토리 · Provably Fair
          </SheetTitle>
        </SheetHeader>

        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          각 스핀 전에 서버는 <span className="font-mono">server_seed_hash</span>를 미리 공개하고,
          스핀 직후 원본 <span className="font-mono">server_seed</span>를 공개합니다.
          아래 <span className="font-bold">검증</span> 버튼은 공개된 시드를 다시 SHA-256으로 해싱해 일치 여부를 확인합니다.
        </p>

        <div className="mt-4 space-y-2">
          {rows === null && <LoadingList rows={5} />}
          {rows && rows.length === 0 && (
            <EmptyState title="아직 스핀 기록이 없습니다" description="첫 스핀을 돌려보세요." />
          )}
          {rows && rows.map((r) => {
            const v = verdicts[r.id] ?? "pending";
            const won = Number(r.payout_phon) > 0;
            const mult = Number(r.bet_phon) > 0 ? Number(r.payout_phon) / Number(r.bet_phon) : 0;
            return (
              <div key={r.id} className="rounded-lg border border-border/40 bg-muted/20 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    {r.is_buy_bonus && <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-bold">BUY</span>}
                    {r.bonus_triggered && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[9px] font-bold">BONUS×{r.bonus_multiplier ?? "?"}</span>}
                  </div>
                  <div className={`font-mono font-bold ${won ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {won ? `+${fmt(r.payout_phon)}` : `-${fmt(r.bet_phon)}`}
                    {won && <span className="text-[10px] opacity-70 ml-1">{mult.toFixed(2)}×</span>}
                  </div>
                </div>

                <div className="grid grid-cols-[80px_1fr_auto] gap-x-2 gap-y-1 items-center">
                  <span className="text-muted-foreground">hash</span>
                  <span className="font-mono truncate">{shortHash(r.server_seed_hash)}</span>
                  <button onClick={() => copy(r.id + "h", r.server_seed_hash)} className="p-1 rounded hover:bg-muted/40">
                    {copied === r.id + "h" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>

                  <span className="text-muted-foreground">seed</span>
                  <span className="font-mono truncate">{shortHash(r.server_seed_revealed)}</span>
                  <button onClick={() => copy(r.id + "s", r.server_seed_revealed)} className="p-1 rounded hover:bg-muted/40">
                    {copied === r.id + "s" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>

                  <span className="text-muted-foreground">client / nonce</span>
                  <span className="font-mono truncate col-span-2">
                    {shortHash(r.client_seed)} <span className="opacity-60">/ #{r.nonce}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    size="sm"
                    variant={v === "ok" ? "default" : v === "bad" ? "destructive" : "outline"}
                    onClick={() => verifyOne(r)}
                    disabled={v === "loading"}
                    className="h-7 px-2 text-[11px]"
                  >
                    {v === "ok" && <><ShieldCheck className="w-3 h-3 mr-1" />검증됨</>}
                    {v === "bad" && <><ShieldAlert className="w-3 h-3 mr-1" />불일치</>}
                    {(v === "pending" || v === "loading") && <>{v === "loading" ? "검증 중…" : "검증"}</>}
                  </Button>
                  <span className="text-[9px] text-muted-foreground font-mono">{r.id.slice(0, 8)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
