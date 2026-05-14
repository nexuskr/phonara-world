import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Snowflake, ThermometerSun, Crown, Loader2 } from "lucide-react";

type Tier = "rookie" | "bronze" | "silver" | "gold" | "platinum" | "diamond";
const TIERS: Tier[] = ["rookie", "bronze", "silver", "gold", "platinum", "diamond"];

interface Props {
  selectedIds: string[];
  onDone?: () => void;
}

export default function BulkUserActions({ selectedIds, onDone }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [hours, setHours] = useState(24);
  const [reason, setReason] = useState("");
  const [tier, setTier] = useState<Tier>("bronze");
  const disabled = selectedIds.length === 0 || !!busy;

  async function bulkFreeze() {
    if (!selectedIds.length) return;
    if (!reason || reason.length < 4) { notify.fail("사유 4자 이상 필요"); return; }
    setBusy("freeze");
    const { data, error } = await supabase.rpc("admin_bulk_freeze_users" as any, {
      _user_ids: selectedIds, _hours: hours, _reason: reason,
    });
    setBusy(null);
    if (error) { notify.fail("일괄 동결 실패", error); return; }
    notify.success(`${(data as any)?.ok ?? 0}명 동결, ${(data as any)?.skipped ?? 0}명 제외`);
    onDone?.();
  }
  async function bulkUnfreeze() {
    if (!selectedIds.length) return;
    setBusy("unfreeze");
    const { data, error } = await supabase.rpc("admin_bulk_unfreeze_users" as any, { _user_ids: selectedIds });
    setBusy(null);
    if (error) { notify.fail("일괄 해제 실패", error); return; }
    notify.success(`${(data as any)?.affected ?? 0}건 해제됨`);
    onDone?.();
  }
  async function bulkTier() {
    if (!selectedIds.length) return;
    setBusy("tier");
    const { data, error } = await supabase.rpc("admin_bulk_set_tier" as any, { _user_ids: selectedIds, _tier: tier });
    setBusy(null);
    if (error) { notify.fail("등급 변경 실패", error); return; }
    notify.success(`${(data as any)?.affected ?? 0}명 등급 변경`);
    onDone?.();
  }

  return (
    <div className="glass-strong neon-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm">일괄 조치</h3>
        <span className="text-xs text-muted-foreground">선택 {selectedIds.length}명 (본인 제외)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <label className="text-[11px] text-muted-foreground">동결 시간 (1-720h)</label>
          <input
            type="number" min={1} max={720} value={hours}
            onChange={(e) => setHours(Math.max(1, Math.min(720, Number(e.target.value) || 24)))}
            className="w-full bg-input/60 border border-border rounded-xl px-3 py-1.5 text-xs"
          />
          <input
            value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="사유 (4자 이상)" maxLength={120}
            className="w-full bg-input/60 border border-border rounded-xl px-3 py-1.5 text-xs"
          />
          <button
            onClick={bulkFreeze} disabled={disabled}
            className="w-full px-3 py-2 rounded-xl bg-warning text-warning-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {busy === "freeze" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Snowflake className="w-3.5 h-3.5" />}
            동결
          </button>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] text-muted-foreground">동결 해제</label>
          <div className="text-[11px] text-muted-foreground">선택된 사용자의 활성 동결을 모두 해제합니다.</div>
          <button
            onClick={bulkUnfreeze} disabled={disabled}
            className="w-full px-3 py-2 rounded-xl glass text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {busy === "unfreeze" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThermometerSun className="w-3.5 h-3.5" />}
            해제
          </button>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] text-muted-foreground">등급 변경</label>
          <select
            value={tier} onChange={(e) => setTier(e.target.value as Tier)}
            className="w-full bg-input/60 border border-border rounded-xl px-3 py-1.5 text-xs"
          >
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={bulkTier} disabled={disabled}
            className="w-full px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {busy === "tier" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
