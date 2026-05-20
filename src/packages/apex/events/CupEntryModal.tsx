import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

interface Props { seasonId: string; entryFeePhon: number; onClose: () => void; onEntered: () => void; }

export function CupEntryModal({ seasonId, entryFeePhon, onClose, onEntered }: Props) {
  const [busy, setBusy] = useState(false);

  const enter = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("apex_cup_enter" as any, { _season_id: seasonId, _idem_key: null });
      if (error) throw error;
      notify.success("컵 입장 완료", { description: `${entryFeePhon} PHON 차감됨` });
      onEntered();
      onClose();
    } catch (e: any) {
      notify.error("입장 실패", e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[90vw] max-w-sm rounded-xl border border-primary/40 bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-bold">Apocalypse Cup 참가</div>
        <div className="mt-2 text-sm text-muted-foreground">참가비 {entryFeePhon} PHON 가 즉시 차감됩니다. 환불 불가. 이 시즌은 1회만 참가 가능합니다.</div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border px-3 py-2 text-sm" disabled={busy}>취소</button>
          <button onClick={enter} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={busy}>
            {busy ? "처리중…" : "지금 참가"}
          </button>
        </div>
      </div>
    </div>
  );
}
