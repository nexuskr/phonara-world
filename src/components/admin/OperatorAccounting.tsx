import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatKRW } from "@/lib/store";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { ShieldCheck, TrendingUp, TrendingDown, Coins } from "lucide-react";

type Pnl = {
  ok: boolean;
  from: string; to: string;
  deposits: number; withdrawals: number;
  packages: { revenue: number; paid: number; net: number };
  jackpot: { accrued: number; paid: number; operator_margin: number; pool_balance: number };
  arena: { collected: number; paid: number; operator_rake: number; pool_balance: number };
  recovery_bonus_paid: number;
  operator_net_pnl: number;
  zero_loss_check: boolean;
};

const RANGES = [
  { id: "7d", label: "최근 7일", days: 7 },
  { id: "30d", label: "최근 30일", days: 30 },
  { id: "90d", label: "최근 90일", days: 90 },
] as const;

export default function OperatorAccounting() {
  const [range, setRange] = useState<typeof RANGES[number]["id"]>("30d");
  const [data, setData] = useState<Pnl | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const days = RANGES.find(r => r.id === range)?.days ?? 30;
      const from = new Date(Date.now() - days * 86_400_000).toISOString();
      const to = new Date().toISOString();
      const { data: res, error } = await supabase.rpc("admin_operator_pnl", { p_from: from, p_to: to });
      if (!alive) return;
      if (error) notify.error(`회계 조회 실패: ${error.message}`);
      setData(res as unknown as Pnl);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [range]);

  if (loading) return <LoadingList rows={4} />;
  if (!data) return <EmptyState icon={<ShieldCheck className="w-6 h-6" />} title="회계 데이터 없음" description="기간을 다시 선택해 주세요." />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button key={r.id} onClick={() => setRange(r.id)}
            className={`px-3 min-h-[40px] rounded-xl text-xs font-bold transition ${range === r.id ? "bg-gradient-gold text-gold-foreground glow-gold" : "glass text-muted-foreground"}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className={`glass-strong rounded-2xl p-5 neon-border ${data.zero_loss_check ? "" : "border-destructive/50"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-muted-foreground">운영자 순손익 (Zero-Loss 검증)</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${data.zero_loss_check ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
            {data.zero_loss_check ? "PASS" : "ALERT"}
          </span>
        </div>
        <div className="font-imperial text-3xl text-gradient-imperial">
          {formatKRW(data.operator_net_pnl)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card icon={TrendingUp} label="입금 승인" v={data.deposits} />
        <Card icon={TrendingDown} label="출금 완료" v={data.withdrawals} />
      </div>

      <Section title="패키지">
        <Row label="매출" v={data.packages.revenue} />
        <Row label="정산 지급" v={data.packages.paid} />
        <Row label="패키지 순익" v={data.packages.net} bold />
      </Section>

      <Section title="잭팟 풀">
        <Row label="누적 적립" v={data.jackpot.accrued} />
        <Row label="당첨 지급" v={data.jackpot.paid} />
        <Row label="운영자 보존 (45%)" v={data.jackpot.operator_margin} bold />
        <Row label="현재 풀 잔액" v={data.jackpot.pool_balance} muted />
      </Section>

      <Section title="Arena 챌린지">
        <Row label="입장료 합계" v={data.arena.collected} />
        <Row label="보상 지급" v={data.arena.paid} />
        <Row label="운영자 rake (10%)" v={data.arena.operator_rake} bold />
        <Row label="현재 풀 잔액" v={data.arena.pool_balance} muted />
      </Section>

      <Section title="Recovery Bonus">
        <Row label="누적 지급" v={data.recovery_bonus_paid} />
      </Section>

      <p className="text-[10px] text-muted-foreground break-keep px-1">
        운영자 순익 = 패키지 순익 + 잭팟 보존 + Arena rake − Recovery Bonus 지급. Zero-Loss Check가 PASS면 플랫폼 무손실 구조가 유지됩니다.
      </p>
    </div>
  );
}

function Card({ icon: Icon, label, v }: { icon: any; label: string; v: number }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="font-imperial text-lg">{formatKRW(v)}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-strong rounded-2xl p-4 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Coins className="w-3.5 h-3.5 text-primary" />
        <h3 className="font-imperial font-bold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, v, bold, muted }: { label: string; v: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold text-primary" : muted ? "text-muted-foreground" : ""}`}>
        {formatKRW(v)}
      </span>
    </div>
  );
}
