/**
 * P3-C + Phase 6 — Cross-Chain Cashout panel.
 * Adds SOL / SUI / APT / CCTP_V2 with Native badges and latency hints.
 */
import { useState } from "react";
import { GlowCard } from "@/packages/apex/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequestCashout, feePreview, type CashoutNetwork } from "./useApexCashout";

type Net = { code: CashoutNetwork; name: string; eta: string; native?: boolean; latencyP95: string };
const NETWORKS: Net[] = [
  { code: "TRC20",   name: "USDT · TRON",      eta: "~1m",  latencyP95: "55s" },
  { code: "BSC",     name: "USDT · BSC",       eta: "~30s", latencyP95: "28s" },
  { code: "ERC20",   name: "USDT · Ethereum",  eta: "~3m",  latencyP95: "180s" },
  { code: "SOL",     name: "USDC · Solana",    eta: "~5s",  native: true, latencyP95: "4.8s" },
  { code: "SUI",     name: "USDC · Sui",       eta: "~6s",  native: true, latencyP95: "5.5s" },
  { code: "APT",     name: "USDC · Aptos",     eta: "~6s",  native: true, latencyP95: "5.8s" },
  { code: "CCTP_V2", name: "USDC · CCTP v2",   eta: "~20s", native: true, latencyP95: "18s" },
];

export function CashoutPanel() {
  const [network, setNetwork] = useState<CashoutNetwork>("SOL");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState(50);
  const { busy, request } = useRequestCashout();
  const fee = feePreview(network);
  const receive = Math.max(0, amount - fee);
  const cur = NETWORKS.find(n => n.code === network)!;
  const submit = async () => {
    await request(network, address.trim(), amount);
  };
  return (
    <GlowCard>
      <div className="p-5 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-cyan-300/80">Cross-Chain Cashout</div>
          <div className="text-xl font-bold">즉시 출금 · Native &lt; 6s · Legacy &lt; 5m</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n.code}
              onClick={() => setNetwork(n.code)}
              className={`relative rounded border px-2 py-3 text-left text-xs transition ${
                network === n.code ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20"
              }`}
            >
              {n.native && (
                <span className="absolute right-1.5 top-1.5 rounded bg-emerald-500/20 px-1 py-px text-[8px] font-mono font-bold text-emerald-300">
                  NATIVE
                </span>
              )}
              <div className="font-bold pr-12">{n.name}</div>
              <div className="text-muted-foreground">eta {n.eta}</div>
              <div className="text-[10px] text-muted-foreground/80">p95 {n.latencyP95}</div>
            </button>
          ))}
        </div>
        <label className="block space-y-1 text-xs">
          <span className="text-muted-foreground">수신 주소 ({network})</span>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x… or T… or Sol…" />
        </label>
        <label className="block space-y-1 text-xs">
          <span className="text-muted-foreground">출금 금액 (USDT/USDC, 최소 10)</span>
          <Input type="number" min={10} value={amount} onChange={(e) => setAmount(Math.max(10, +e.target.value || 0))} />
        </label>
        <div className="rounded bg-white/5 p-3 text-xs space-y-1">
          <div className="flex justify-between"><span>네트워크 수수료</span><span className="tabular-nums">-{fee.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>예상 도착</span><span className="tabular-nums text-cyan-300">{cur.latencyP95} (p95)</span></div>
          <div className="flex justify-between font-bold text-base"><span>실수령</span><span className="tabular-nums text-emerald-300">{receive.toFixed(2)}</span></div>
        </div>
        <Button onClick={submit} disabled={busy || amount < 10 || address.length < 20} className="w-full">
          {busy ? "전송중…" : `${amount.toFixed(2)} 출금`}
        </Button>
        <div className="text-[10px] text-muted-foreground leading-relaxed">
          출금 보안 인증(AAL2) 필요 · velocity 가드(10분 3건/1시간 5건) 자동 적용 · Native 체인은 CCTP/즉시 결제
        </div>
      </div>
    </GlowCard>
  );
}

export default CashoutPanel;
