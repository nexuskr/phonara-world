import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminSetTier, adminAdjustBalance } from "@/lib/deposits-rpc";
import { formatKRW } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  nickname: string;
  tier: "normal" | "vip" | "god" | "empire";
  auth_provider: string | null;
  profile_completed: boolean;
  real_name: string | null;
  phone: string | null;
  birth_date: string | null;
  available_balance: number;
  total_balance: number;
};

const TIERS: Row["tier"][] = ["normal", "vip", "god", "empire"];
type Filter = "all" | "magic" | "social" | "email" | "incomplete";

function providerLabel(p: string | null): string {
  if (!p) return "—";
  if (p === "email") return "이메일";
  if (p === "magic" || p === "magiclink") return "매직링크";
  if (p === "google") return "Google";
  if (p === "apple") return "Apple";
  return p;
}

function providerClass(p: string | null, complete: boolean): string {
  if (!complete) return "bg-destructive/20 text-destructive border border-destructive/40";
  if (p === "google" || p === "apple" || p === "social") return "bg-secondary/20 text-secondary border border-secondary/40";
  if (p === "magic" || p === "magiclink") return "bg-accent/20 text-accent border border-accent/40";
  return "glass";
}

export default function ServerUserAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  async function load() {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, nickname, tier, auth_provider, profile_completed, real_name, phone, birth_date")
      .order("created_at", { ascending: false })
      .limit(300);
    if (!profs) return;
    const ids = profs.map((p: any) => p.id);
    const { data: wallets } = await supabase
      .from("wallet_balances")
      .select("user_id, available_balance, total_balance")
      .in("user_id", ids);
    const map = new Map((wallets ?? []).map((w: any) => [w.user_id, w]));
    setRows(profs.map((p: any) => ({
      id: p.id,
      nickname: p.nickname,
      tier: p.tier,
      auth_provider: p.auth_provider,
      profile_completed: !!p.profile_completed,
      real_name: p.real_name,
      phone: p.phone,
      birth_date: p.birth_date,
      available_balance: map.get(p.id)?.available_balance ?? 0,
      total_balance: map.get(p.id)?.total_balance ?? 0,
    })));
  }

  useEffect(() => { void load(); }, []);

  async function setTier(id: string, tier: Row["tier"]) {
    setBusy(true);
    try {
      await adminSetTier(id, tier);
      toast({ title: `등급 변경: ${tier.toUpperCase()}` });
      await load();
    } catch (e: any) { toast({ title: "실패", description: e.message }); }
    finally { setBusy(false); }
  }

  async function adjust(id: string) {
    const v = prompt("증감 금액 (음수 가능)");
    if (!v) return;
    const delta = parseInt(v.replace(/[^\d-]/g, ""), 10);
    if (!Number.isFinite(delta) || delta === 0) return;
    const reason = prompt("사유") || "admin_adjust";
    setBusy(true);
    try {
      await adminAdjustBalance(id, delta, reason);
      toast({ title: "잔액 조정 완료" });
      await load();
    } catch (e: any) { toast({ title: "실패", description: e.message }); }
    finally { setBusy(false); }
  }

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "incomplete") list = list.filter(r => !r.profile_completed);
    else if (filter === "magic") list = list.filter(r => r.auth_provider === "magic" || r.auth_provider === "magiclink");
    else if (filter === "social") list = list.filter(r => ["google", "apple", "social"].includes(r.auth_provider ?? ""));
    else if (filter === "email") list = list.filter(r => r.auth_provider === "email");
    if (q) list = list.filter(r => r.nickname?.toLowerCase().includes(q.toLowerCase()) || r.id.startsWith(q) || (r.real_name ?? "").includes(q) || (r.phone ?? "").includes(q));
    return list;
  }, [rows, q, filter]);

  const counts = useMemo(() => ({
    all: rows.length,
    incomplete: rows.filter(r => !r.profile_completed).length,
    magic: rows.filter(r => r.auth_provider === "magic" || r.auth_provider === "magiclink").length,
    social: rows.filter(r => ["google", "apple", "social"].includes(r.auth_provider ?? "")).length,
    email: rows.filter(r => r.auth_provider === "email").length,
  }), [rows]);

  const FILTERS: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: "전체", n: counts.all },
    { id: "incomplete", label: "프로필 미완성", n: counts.incomplete },
    { id: "magic", label: "매직링크", n: counts.magic },
    { id: "social", label: "소셜", n: counts.social },
    { id: "email", label: "이메일", n: counts.email },
  ];

  return (
    <div className="space-y-3">
      <input
        value={q} onChange={e => setQ(e.target.value)}
        placeholder="닉네임 / ID / 실명 / 전화번호로 검색"
        className="w-full px-4 py-2 rounded-xl glass border border-border text-sm"
      />
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${filter === f.id ? "bg-gradient-gold text-gold-foreground" : "glass text-muted-foreground"}`}>
            {f.label} <span className="opacity-70">({f.n})</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center text-xs text-muted-foreground py-8 glass rounded-2xl">회원 없음</div>}
      {filtered.map(u => (
        <div key={u.id} className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-bold text-sm truncate">{u.nickname}</div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${providerClass(u.auth_provider, u.profile_completed)}`}>
                  {providerLabel(u.auth_provider)}
                </span>
                {!u.profile_completed && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-destructive/20 text-destructive border border-destructive/40">
                    프로필 미완성
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono truncate">{u.id.slice(0, 8)} · {u.tier.toUpperCase()}</div>
              {u.profile_completed && (
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {u.real_name ?? "—"} · {u.phone ?? "—"} · {u.birth_date ?? "—"}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-display font-bold text-sm text-gradient-primary">{formatKRW(u.available_balance)}</div>
              <div className="text-[10px] text-muted-foreground">총 {formatKRW(u.total_balance)}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-3">
            {TIERS.map(t => (
              <button key={t} disabled={busy} onClick={() => setTier(u.id, t)}
                className={`py-1.5 rounded-lg text-[10px] font-bold ${u.tier === t ? "bg-gradient-gold text-gold-foreground" : "glass"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => adjust(u.id)} disabled={busy}
            className="mt-2 w-full py-2 rounded-xl glass border border-border text-xs font-bold">
            잔액 조정
          </button>
        </div>
      ))}
    </div>
  );
}
