/**
 * P3-C — Cross-Chain Cashout panel.
 */
import { useState } from "react";
import { GlowCard } from "@/packages/apex/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequestCashout, feePreview, type CashoutNetwork } from "./useApexCashout";

const NETWORKS: { code: CashoutNetwork; name: string; eta: string }[] = [
  { code: "TRC20", name: "USDT · TRON",     eta: "~1m" },
  { code: "BSC",   name: "USDT · BSC",      eta: "~30s" },
  { code: "ERC20", name: "USDT · Ethereum", eta: "~3m" },
];

export function CashoutPanel() {
  const [network, setNetwork] = useState<CashoutNetwork>("TRC20");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState(50);
  const { busy, request } = useRequestCashout();
  const fee = feePreview(network);
  const receive = Math.max(0, amount - fee);
  const submit = async () => {
    await request(network, address.trim(), amount);
  };
  return (
    <GlowCard>
      <div className="p-5 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-cyan-300/80">Cross-Chain Cashout</div>
          <div className="text-xl font-bold">USDT 즉시 출금 · p95 &lt; 5분</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n.code}
              onClick={() => setNetwork(n.code)}
              className={`rounded border px-2 py-3 text-left text-xs transition ${
                network === n.code ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="font-bold">{n.name}</div>
              <div className="text-muted-foreground">eta {n.eta}</div>
            </button>
          ))}
        </div>
        <label className="block space-y-1 text-xs">
          <span className="text-muted-foreground">수신 주소 ({network})</span>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x… or T…" />
        </label>
        <label className="block space-y-1 text-xs">
          <span className="text-muted-foreground">출금 금액 (USDT, 최소 10)</span>
          <Input type="number" min={10} value={amount} onChange={(e) => setAmount(Math.max(10, +e.target.value || 0))} />
        </label>
        <div className="rounded bg-white/5 p-3 text-xs space-y-1">
          <div className="flex justify-between"><span>네트워크 수수료</span><span className="tabular-nums">-{fee.toFixed(2)} USDT</span></div>
          <div className="flex justify-between font-bold text-base"><span>실수령</span><span className="tabular-nums text-emerald-300">{receive.toFixed(2)} USDT</span></div>
        </div>
        <Button onClick={submit} disabled={busy || amount < 10 || address.length < 20} className="w-full">
          {busy ? "전송중…" : `${amount.toFixed(2)} USDT 출금`}
        </Button>
        <div className="text-[10px] text-muted-foreground leading-relaxed">
          출금 보안 인증(AAL2) 필요 · velocity 가드(10분 3건/1시간 5건) 자동 적용
        </div>
      </div>
    </GlowCard>
  );
}

export default CashoutPanel;
