import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Plus, Trash2, Save, Copy } from "lucide-react";
import { notify } from "@/lib/notify";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingList } from "@/components/ui/loading-state";

type Row = {
  id: string;
  network: string;
  address: string;
  label: string | null;
  memo: string | null;
  is_active: boolean;
  sort_order: number;
};

const NETWORKS = ["TRC20", "ERC20", "BEP20", "BTC", "Polygon", "Solana"];

export default function CoinAddressAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ network: string; address: string; label: string; memo: string }>({
    network: "TRC20", address: "", label: "", memo: "",
  });

  async function load() {
    const { data, error } = await supabase
      .from("coin_deposit_addresses")
      .select("id,network,address,label,memo,is_active,sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) { notify.error("불러오기 실패", { description: error.message }); return; }
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => { void load(); }, []);

  async function add() {
    if (!draft.network.trim() || draft.address.trim().length < 8) {
      notify.error("입력 확인", { description: "네트워크와 8자 이상 주소를 입력하세요." });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("coin_deposit_addresses").insert({
        network: draft.network.trim().toUpperCase(),
        address: draft.address.trim(),
        label: draft.label.trim() || null,
        memo: draft.memo.trim() || null,
      });
      if (error) throw error;
      notify.success("추가 완료");
      setDraft({ network: "TRC20", address: "", label: "", memo: "" });
      await load();
    } catch (e: any) {
      notify.error("추가 실패", { description: e.message });
    } finally { setBusy(false); }
  }

  async function update(r: Row, patch: Partial<Row>) {
    setBusy(true);
    try {
      const { error } = await supabase.from("coin_deposit_addresses").update(patch).eq("id", r.id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      notify.error("저장 실패", { description: e.message });
    } finally { setBusy(false); }
  }

  async function remove(r: Row) {
    if (!confirm(`삭제하시겠어요?\n${r.network} · ${r.address.slice(0, 12)}…`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("coin_deposit_addresses").delete().eq("id", r.id);
      if (error) throw error;
      notify.success("삭제 완료");
      await load();
    } catch (e: any) {
      notify.error("삭제 실패", { description: e.message });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-5 neon-border">
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-5 h-5 text-secondary" />
          <h3 className="font-imperial font-bold text-sm">코인 입금 주소 관리</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4 break-keep">
          활성화된 주소가 사용자 충전 화면에 노출됩니다. 여러 네트워크를 등록할 수 있으며 정렬 순서가 낮을수록 우선 표시됩니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <select
            value={draft.network}
            onChange={(e) => setDraft((d) => ({ ...d, network: e.target.value }))}
            className="sm:col-span-2 px-3 py-2 rounded-xl glass border border-border text-xs font-bold"
          >
            {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input
            value={draft.address}
            onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
            placeholder="입금 주소"
            className="sm:col-span-5 px-3 py-2 rounded-xl glass border border-border text-xs font-mono"
          />
          <input
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="라벨 (예: USDT TRC20)"
            className="sm:col-span-3 px-3 py-2 rounded-xl glass border border-border text-xs"
          />
          <button
            onClick={add}
            disabled={busy}
            className="sm:col-span-2 px-3 py-2 rounded-xl bg-gradient-gold text-gold-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> 추가
          </button>
          <input
            value={draft.memo}
            onChange={(e) => setDraft((d) => ({ ...d, memo: e.target.value }))}
            placeholder="메모/주의사항 (선택)"
            className="sm:col-span-12 px-3 py-2 rounded-xl glass border border-border text-xs"
          />
        </div>
      </div>

      {rows === null ? (
        <LoadingList rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState title="등록된 주소가 없습니다" description="위 폼에서 첫 주소를 추가하세요." variant="muted" size="sm" />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <CoinRow key={r.id} row={r} busy={busy} onUpdate={(p) => update(r, p)} onRemove={() => remove(r)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CoinRow({ row, busy, onUpdate, onRemove }: {
  row: Row; busy: boolean;
  onUpdate: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const [local, setLocal] = useState({
    address: row.address, label: row.label ?? "", memo: row.memo ?? "", sort_order: row.sort_order,
  });
  const dirty =
    local.address !== row.address ||
    local.label !== (row.label ?? "") ||
    local.memo !== (row.memo ?? "") ||
    local.sort_order !== row.sort_order;

  return (
    <div className="glass rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-secondary/20 text-secondary border border-secondary/40">
            {row.network}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${row.is_active ? "bg-gold/20 text-gold border border-gold/40" : "bg-muted/40 text-muted-foreground border border-border"}`}>
            {row.is_active ? "활성" : "비활성"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { void navigator.clipboard.writeText(row.address); notify.success("주소 복사됨"); }}
            className="px-2 py-1.5 rounded-lg glass border border-border text-[11px] inline-flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> 복사
          </button>
          <button
            onClick={() => onUpdate({ is_active: !row.is_active })}
            disabled={busy}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold ${row.is_active ? "glass border border-border" : "bg-gradient-gold text-gold-foreground"}`}
          >
            {row.is_active ? "비활성화" : "활성화"}
          </button>
          <button onClick={onRemove} disabled={busy} className="px-2 py-1.5 rounded-lg glass border border-destructive/40 text-destructive inline-flex items-center gap-1 text-[11px]">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <input
        value={local.address}
        onChange={(e) => setLocal((s) => ({ ...s, address: e.target.value }))}
        className="w-full px-3 py-2 rounded-xl glass border border-border text-xs font-mono"
      />
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <input
          value={local.label}
          onChange={(e) => setLocal((s) => ({ ...s, label: e.target.value }))}
          placeholder="라벨"
          className="sm:col-span-5 px-3 py-2 rounded-xl glass border border-border text-xs"
        />
        <input
          value={local.memo}
          onChange={(e) => setLocal((s) => ({ ...s, memo: e.target.value }))}
          placeholder="메모/주의사항"
          className="sm:col-span-5 px-3 py-2 rounded-xl glass border border-border text-xs"
        />
        <input
          type="number"
          value={local.sort_order}
          onChange={(e) => setLocal((s) => ({ ...s, sort_order: parseInt(e.target.value || "0", 10) }))}
          placeholder="순서"
          className="sm:col-span-2 px-3 py-2 rounded-xl glass border border-border text-xs tabular-nums"
        />
      </div>
      {dirty && (
        <button
          onClick={() => onUpdate({ address: local.address, label: local.label || null, memo: local.memo || null, sort_order: local.sort_order })}
          disabled={busy}
          className="w-full px-3 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" /> 변경사항 저장
        </button>
      )}
    </div>
  );
}
