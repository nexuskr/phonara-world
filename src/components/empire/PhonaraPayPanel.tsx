/**
 * PhonaraPayPanel — USDT TRC20 입금 1탭 패널.
 * 1) 금액 입력 → unique_amount 발급
 * 2) 주소 + 정확 금액 표시 (복사 + QR data URL)
 * 3) 30분 카운트다운
 * 4) Realtime: crypto_deposit_intents.status = 'filled' 감지 → 즉시 PHON 표시 + 토스트
 *
 * 입금 받을 주소는 환경변수 또는 props로 주입.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Coins, Copy, CheckCircle2, Clock, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  createDepositIntent, getPhonBalance, getMyPendingDeposits,
  PHON_PER_USDT, type CryptoDepositIntent,
} from "@/lib/phonaraPay";
import { notify } from "@/lib/notify";
import { useFirstEmperorBurst } from "@/components/empire/FirstEmperorBurst";
import { cn } from "@/lib/utils";

const PRESETS = [10, 50, 100, 500, 1000];

interface Props {
  receiveAddress?: string; // 운영자 TRON 지갑 (admin이 설정)
}

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function qrSrc(text: string) {
  // 외부 의존성 0 — 공개 무료 QR 서비스
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(text)}`;
}

export default function PhonaraPayPanel({ receiveAddress }: Props) {
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<CryptoDepositIntent | null>(null);
  const [phonBal, setPhonBal] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<"addr" | "amt" | null>(null);
  const intentRef = useRef<CryptoDepositIntent | null>(null);

  useEffect(() => {
    void getPhonBalance().then(setPhonBal);
    void getMyPendingDeposits().then((rows) => { if (rows[0]) setIntent(rows[0]); });
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Realtime: 매칭 즉시 알림
  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  const fireBurst = useFirstEmperorBurst((s) => s.fire);

  useEffect(() => {
    const ch = supabase
      .channel(`pay:intents:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "crypto_deposit_intents" }, async (payload) => {
        const row = payload.new as CryptoDepositIntent;
        if (intentRef.current && row.id === intentRef.current.id && row.status === "filled") {
          setIntent(row);
          const phon = Math.round(row.unique_amount * PHON_PER_USDT);
          // Fetch power state to determine NFT level + first-bonus
          const [{ data: nftRows }, { data: lev }, { data: boost }] = await Promise.all([
            supabase.rpc("get_my_nft_collection"),
            supabase.rpc("get_my_max_leverage"),
            supabase.rpc("get_my_total_boost_pct"),
          ]);
          const list = (nftRows as any[]) || [];
          const isFirst = list.length === 1 && list[0]?.source === "deposit";
          const latest = list[0]; // ordered DESC
          notify.success(`💥 ${(latest?.level ?? "BRONZE").toUpperCase()} CROWN 획득`, {
            description: `+${phon.toLocaleString()} PHON · ⚡ +${boost ?? 0}% · 🚀 ${lev ?? 10}x 해금`,
          });
          fireBurst({
            nft_level: latest?.level ?? "bronze",
            boost_pct: Number(boost ?? 0),
            max_leverage: Number(lev ?? 10),
            phon_bonus: Math.floor(phon * 0.1),
            first_bonus: isFirst,
          });
          void getPhonBalance().then(setPhonBal);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fireBurst]);

  const remaining = intent ? new Date(intent.expires_at).getTime() - now : 0;
  const isFilled = intent?.status === "filled";
  const isExpired = !!intent && remaining <= 0 && !isFilled;

  async function handleCreate() {
    if (!receiveAddress) {
      notify.error("입금 주소 미설정", { description: "운영자에게 문의하세요." });
      return;
    }
    setBusy(true);
    try {
      const r = await createDepositIntent(amount, receiveAddress);
      setIntent(r);
      notify.success("입금 요청 생성", { description: `정확히 ${r.unique_amount} USDT 송금하세요.` });
    } catch (e: any) {
      notify.error("요청 실패", { description: e?.message || "다시 시도해주세요." });
    } finally { setBusy(false); }
  }

  function copy(text: string, kind: "addr" | "amt") {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  function reset() {
    setIntent(null);
  }

  return (
    <Card className="p-5 sm:p-6 border-2 border-primary/30 bg-gradient-to-br from-background via-background to-primary/5 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-black text-primary tracking-[0.2em]">
          <Coins className="w-3 h-3" /> PHONARA PAY · USDT TRC20
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">PHON 잔액</div>
          <div className="font-display font-black tabular-nums text-amber-300">{phonBal.toLocaleString()}</div>
        </div>
      </div>

      {!intent || isExpired ? (
        <>
          <div className="text-xs font-bold text-muted-foreground mb-2">입금 금액 (USDT)</div>
          <div className="grid grid-cols-5 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={
                  "px-2 py-2 rounded-lg text-xs font-bold tabular-nums border transition " +
                  (amount === p
                    ? "bg-gradient-imperial text-primary-foreground border-primary"
                    : "bg-muted/30 text-foreground border-border hover:border-primary/40")
                }
              >
                {p}
              </button>
            ))}
          </div>
          <Input
            type="number" min={1} max={10000} step={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            className="mt-2 tabular-nums"
            placeholder="직접 입력"
          />
          <div className="mt-2 text-[11px] text-muted-foreground">
            예상 적립: <span className="font-bold text-amber-300 tabular-nums">{(amount * PHON_PER_USDT).toLocaleString()} PHON</span>
          </div>
          <Button
            onClick={handleCreate}
            disabled={busy || amount < 1 || !receiveAddress}
            size="lg"
            className="w-full mt-4 bg-gradient-imperial text-primary-foreground font-black"
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
            입금 요청 생성
          </Button>
          {!receiveAddress && (
            <p className="mt-2 text-[10px] text-destructive text-center">
              ⚠ 운영자가 입금 주소를 아직 설정하지 않았습니다.
            </p>
          )}
        </>
      ) : isFilled ? (
        <div className="text-center py-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <div className="font-display font-black text-2xl mt-3">입금 완료!</div>
          <div className="text-sm text-muted-foreground mt-1">
            +{Math.round(intent.unique_amount * PHON_PER_USDT).toLocaleString()} PHON 적립
          </div>
          <Button onClick={reset} variant="outline" size="sm" className="mt-4">
            새 입금 만들기
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 카운트다운 */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className={cn(
              "font-mono font-black tabular-nums",
              remaining < 60_000 ? "text-destructive animate-pulse" : "text-amber-300",
            )}>{fmt(remaining)}</span>
            <span className="text-[10px] text-muted-foreground">남음</span>
          </div>

          {/* QR */}
          <div className="flex justify-center">
            <img
              src={qrSrc(intent.receive_address)}
              alt="TRON address QR"
              width={180} height={180}
              loading="lazy"
              className="rounded-xl border border-border bg-white p-1"
            />
          </div>

          {/* 정확 금액 강조 */}
          <div className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-400/50 text-center">
            <div className="text-[10px] text-amber-300 font-bold tracking-widest">정확히 이 금액 송금</div>
            <div className="font-display font-black text-3xl tabular-nums text-amber-300 mt-0.5">
              {intent.unique_amount.toFixed(4)} <span className="text-base">USDT</span>
            </div>
            <button
              onClick={() => copy(String(intent.unique_amount.toFixed(4)), "amt")}
              className="mt-1 text-[10px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              {copied === "amt" ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied === "amt" ? "복사됨" : "금액 복사"}
            </button>
          </div>

          {/* 주소 */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border">
            <div className="text-[10px] text-muted-foreground font-bold">받는 주소 (TRON · TRC20)</div>
            <div className="mt-1 font-mono text-[11px] break-all">{intent.receive_address}</div>
            <button
              onClick={() => copy(intent.receive_address, "addr")}
              className="mt-1 text-[10px] inline-flex items-center gap-1 text-primary hover:text-primary/80"
            >
              {copied === "addr" ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied === "addr" ? "복사됨" : "주소 복사"}
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            ⚠ 정확히 <span className="font-bold text-amber-300">{intent.unique_amount.toFixed(4)} USDT</span> 만 인식됩니다.<br />
            다른 금액/네트워크/토큰으로 송금 시 매칭되지 않습니다.
          </p>

          <Button onClick={reset} variant="outline" size="sm" className="w-full">
            취소하고 다시 만들기
          </Button>
        </div>
      )}
    </Card>
  );
}
