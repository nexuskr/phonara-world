import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";

type Filter = "all" | "active" | "expired" | "paid" | "unpaid";

type Row = {
  id: string;
  inviter_id: string;
  invitee_id: string;
  code_used: string | null;
  created_at: string;
  window_expires_at: string | null;
  policy_version: number | null;
  first_deposit_bonus_paid: boolean;
  total_commission: number | null;
};

export default function ReferralsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("id,inviter_id,invitee_id,code_used,created_at,window_expires_at,policy_version,first_deposit_bonus_paid,total_commission")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!alive) return;
      if (!error) setRows((data as Row[]) ?? []);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("admin:referrals")
      .on("postgres_changes", { event: "*", schema: "public", table: "referrals" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return rows.filter((r) => {
      const exp = r.window_expires_at ? new Date(r.window_expires_at).getTime() : 0;
      const expired = exp > 0 && exp < now;
      if (filter === "active" && expired) return false;
      if (filter === "expired" && !expired) return false;
      if (filter === "paid" && !r.first_deposit_bonus_paid) return false;
      if (filter === "unpaid" && r.first_deposit_bonus_paid) return false;
      if (q) {
        const s = q.trim().toLowerCase();
        if (
          !(r.code_used || "").toLowerCase().includes(s) &&
          !r.inviter_id.toLowerCase().includes(s) &&
          !r.invitee_id.toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [rows, filter, q]);

  const counts = useMemo(() => {
    const now = Date.now();
    let active = 0, expired = 0, paid = 0;
    for (const r of rows) {
      const exp = r.window_expires_at ? new Date(r.window_expires_at).getTime() : 0;
      if (exp > 0 && exp < now) expired++; else active++;
      if (r.first_deposit_bonus_paid) paid++;
    }
    return { active, expired, paid, total: rows.length };
  }, [rows]);

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString() : "—";
  const daysLeft = (iso: string | null) => {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    return Math.ceil(ms / 86400000);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <Kpi label="Total" value={counts.total} />
        <Kpi label="Active" value={counts.active} accent="text-primary" />
        <Kpi label="Expired" value={counts.expired} accent="text-destructive" />
        <Kpi label="Paid" value={counts.paid} accent="text-gold" />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "active", "expired", "paid", "unpaid"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 min-h-[36px] rounded-lg text-xs font-bold ${filter === f ? "bg-gradient-gold text-gold-foreground" : "glass text-muted-foreground"}`}
          >{f}</button>
        ))}
        <div className="relative ml-auto flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="code / inviter / invitee"
            className="w-full pl-7 pr-2 min-h-[36px] rounded-lg bg-input/60 border border-border text-xs"
          />
        </div>
      </div>

      <div className="glass-strong rounded-2xl overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-muted-foreground">
            <tr className="text-left">
              <th className="p-2">Created</th>
              <th className="p-2">Code</th>
              <th className="p-2">Inviter</th>
              <th className="p-2">Invitee</th>
              <th className="p-2">Window expires</th>
              <th className="p-2">Days</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-right">Paid</th>
              <th className="p-2 text-right">Commission</th>
              <th className="p-2">v</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No referrals</td></tr>
            )}
            {filtered.map((r) => {
              const dl = daysLeft(r.window_expires_at);
              const expired = dl !== null && dl <= 0;
              return (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="p-2 tabular-nums">{fmt(r.created_at)}</td>
                  <td className="p-2 font-mono">{r.code_used ?? "—"}</td>
                  <td className="p-2 font-mono text-muted-foreground">{r.inviter_id.slice(0, 8)}…</td>
                  <td className="p-2 font-mono text-muted-foreground">{r.invitee_id.slice(0, 8)}…</td>
                  <td className="p-2 tabular-nums">{fmt(r.window_expires_at)}</td>
                  <td className={`p-2 tabular-nums ${expired ? "text-destructive" : "text-primary"}`}>
                    {dl === null ? "—" : expired ? "0" : dl}
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${expired ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"}`}>
                      {expired ? "EXPIRED" : "ACTIVE"}
                    </span>
                  </td>
                  <td className="p-2 text-right">{r.first_deposit_bonus_paid ? "✅" : "—"}</td>
                  <td className="p-2 text-right tabular-nums">{(r.total_commission ?? 0).toLocaleString()}</td>
                  <td className="p-2 tabular-nums text-muted-foreground">{r.policy_version ?? 1}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent = "text-foreground" }: { label: string; value: number; accent?: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-display font-black text-lg tabular-nums ${accent}`}>{value.toLocaleString()}</div>
    </div>
  );
}
