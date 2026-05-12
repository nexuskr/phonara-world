// PR-3: Baron FOMO Dialog — auto-shown when user enters Level 7+ via fomo_notifications.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Percent, Users, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";

type FomoRow = {
  id: number;
  kind: string;
  level: number | null;
  payload: any;
  created_at: string;
};

export default function BaronPromotionDialog() {
  const [row, setRow] = useState<FomoRow | null>(null);
  const nav = useNavigate();

  async function loadLatest() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase
      .from("fomo_notifications") as any)
      .select("id, kind, level, payload, created_at")
      .eq("user_id", user.id)
      .eq("kind", "baron_promotion")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setRow(data as FomoRow);
  }

  useEffect(() => {
    void loadLatest();
    const ch = supabase
      .channel("fomo-baron")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fomo_notifications" }, () => void loadLatest())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function dismiss() {
    if (!row) return;
    await (supabase.from("fomo_notifications") as any).update({ read_at: new Date().toISOString() }).eq("id", row.id);
    setRow(null);
  }

  if (!row) return null;
  const seats = row.payload?.seats_left ?? 50;
  const lev = row.payload?.leverage ?? 7;
  const fee = Math.round(((row.payload?.fee_discount ?? 0.22) as number) * 100);

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) void dismiss(); }}>
      <DialogContent className="max-w-md border-sim-gold/40 bg-gradient-to-b from-background to-sim-gold/5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-imperial text-xl tracking-wider text-gradient-imperial">
            <Crown className="w-5 h-5 text-sim-gold" /> Baron 승급
          </DialogTitle>
          <DialogDescription className="text-sm">
            상위 5% Baron 등급에 진입하셨습니다. 이번 주 단 <span className="text-sim-gold font-bold">{seats}명</span>만 받을 수 있는 혜택이 잠금 해제되었습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 my-3">
          <Perk icon={Zap}    label="레버리지" value={`${lev}x`} />
          <Perk icon={Percent} label="수수료 할인" value={`${fee}%`} />
          <Perk icon={Crown}  label="Crown 보너스" value="+100" />
          <Perk icon={Bot}    label="전용 AI Advisor" value="ON" />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Users className="w-3 h-3" /> 이번 주 잔여 {seats}석 · 마감 시 다음 시즌까지 대기
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={dismiss} className="flex-1">나중에</Button>
          <Button onClick={() => { void dismiss(); nav("/wallet"); }} className="flex-1 bg-gradient-to-r from-sim-gold to-primary text-primary-foreground">
            지금 활성화
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Perk({ icon: Icon, label, value }: any) {
  return (
    <div className="glass rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="font-display font-black text-sm text-sim-gold mt-0.5">{value}</div>
    </div>
  );
}
