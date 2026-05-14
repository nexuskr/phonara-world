import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { adminSetTier, adminAdjustBalance } from "@/lib/deposits-rpc";
import { formatKRW } from "@/lib/store";
import { notify } from "@/lib/notify";
import { Snowflake, Flame, Ban, ShieldOff, Trash2, Wallet, RefreshCw, Search, ExternalLink } from "lucide-react";
import BulkUserActions from "@/components/admin/users/BulkUserActions";

type Row = {
  id: string;
  nickname: string;
  email: string | null;
  tier: "normal" | "vip" | "god" | "empire";
  auth_provider: string | null;
  profile_completed: boolean;
  real_name: string | null;
  phone: string | null;
  birth_date: string | null;
  available_balance: number;
  total_balance: number;
  created_at: string;
  is_frozen: boolean;
  frozen_until: string | null;
  freeze_reason: string | null;
  is_banned: boolean;
  banned_until: string | null;
  is_deleted: boolean;
};

const TIERS: Row["tier"][] = ["normal", "vip", "god", "empire"];
type Filter = "all" | "active" | "frozen" | "banned" | "deleted" | "incomplete";

function providerLabel(p: string | null): string {
  if (!p) return "—";
  if (p === "email") return "이메일";
  if (p === "magic" || p === "magiclink") return "매직링크";
  if (p === "google") return "Google";
  if (p === "apple") return "Apple";
  return p;
}

export default function ServerUserAdmin() {
  const [sp] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOne = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users_full" as any, {
      _limit: 300, _offset: 0, _q: q || null,
    });
    if (error) notify.fail("회원 목록 로드 실패", error);
    setRows((data as Row[] | null) ?? []);
    setLoading(false);
  }, [q]);

  useEffect(() => { void load(); }, [load]);

  const run = useCallback(async (label: string, fn: () => Promise<any>) => {
    setBusy(true);
    try {
      await fn();
      notify.success(`${label} 완료`);
      await load();
    } catch (e: any) {
      notify.fail(`${label} 실패`, e);
    } finally { setBusy(false); }
  }, [load]);

  const setTier = (id: string, tier: Row["tier"]) =>
    run(`등급 ${tier.toUpperCase()}`, () => adminSetTier(id, tier));

  const adjust = (id: string) => {
    const v = prompt("증감 금액 (음수 가능)");
    if (!v) return;
    const delta = parseInt(v.replace(/[^\d-]/g, ""), 10);
    if (!Number.isFinite(delta) || delta === 0) return;
    const reason = prompt("사유") || "admin_adjust";
    void run("잔액 조정", () => adminAdjustBalance(id, delta, reason));
  };

  const freeze = (id: string) => {
    const h = prompt("동결 시간(시간 단위, 1~720)", "24");
    if (!h) return;
    const hours = parseInt(h, 10);
    if (!Number.isFinite(hours) || hours < 1) return;
    const reason = prompt("동결 사유") || "admin_manual";
    void run(`${hours}시간 동결`, async () => {
      const { error } = await supabase.rpc("admin_freeze_user", { _user_id: id, _hours: hours, _reason: reason });
      if (error) throw error;
    });
  };

  const unfreeze = (id: string) =>
    run("동결 해제", async () => {
      const { error } = await supabase.rpc("admin_unfreeze_user", { _user_id: id });
      if (error) throw error;
    });

  const ban = (id: string) => {
    if (!confirm("이 회원을 영구 차단할까요? 로그인이 즉시 차단됩니다.")) return;
    const reason = prompt("차단 사유") || "admin_ban";
    void run("영구 차단", async () => {
      const { error } = await supabase.rpc("admin_ban_user" as any, { _user_id: id, _reason: reason });
      if (error) throw error;
    });
  };

  const unban = (id: string) =>
    run("차단 해제", async () => {
      const { error } = await supabase.rpc("admin_unban_user" as any, { _user_id: id });
      if (error) throw error;
    });

  const softDelete = (id: string, nick: string) => {
    if (!confirm(`정말 ${nick} 회원을 탈퇴 처리할까요? (복구 어려움)`)) return;
    if (!confirm("최종 확인: 탈퇴를 진행합니다.")) return;
    const reason = prompt("탈퇴 사유") || "admin_delete";
    void run("탈퇴 처리", async () => {
      const { error } = await supabase.rpc("admin_soft_delete_user" as any, { _user_id: id, _reason: reason });
      if (error) throw error;
    });
  };

  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter(r => !r.is_frozen && !r.is_banned && !r.is_deleted).length,
    frozen: rows.filter(r => r.is_frozen && !r.is_banned).length,
    banned: rows.filter(r => r.is_banned && !r.is_deleted).length,
    deleted: rows.filter(r => r.is_deleted).length,
    incomplete: rows.filter(r => !r.profile_completed).length,
  }), [rows]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":     return rows.filter(r => !r.is_frozen && !r.is_banned && !r.is_deleted);
      case "frozen":     return rows.filter(r => r.is_frozen && !r.is_banned);
      case "banned":     return rows.filter(r => r.is_banned && !r.is_deleted);
      case "deleted":    return rows.filter(r => r.is_deleted);
      case "incomplete": return rows.filter(r => !r.profile_completed);
      default:           return rows;
    }
  }, [rows, filter]);

  const FILTERS: { id: Filter; label: string; n: number }[] = [
    { id: "all",        label: "전체",         n: counts.all },
    { id: "active",     label: "정상",         n: counts.active },
    { id: "frozen",     label: "동결",         n: counts.frozen },
    { id: "banned",     label: "차단",         n: counts.banned },
    { id: "deleted",    label: "탈퇴",         n: counts.deleted },
    { id: "incomplete", label: "프로필 미완성", n: counts.incomplete },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="닉네임 / 이메일 / ID / 실명 / 전화번호로 검색 후 Enter"
            className="w-full pl-10 pr-4 py-2 rounded-xl glass border border-border text-sm"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-2 rounded-xl glass border border-border text-xs font-bold flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> 새로고침
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
              filter === f.id ? "bg-gradient-gold text-gold-foreground" : "glass text-muted-foreground"
            }`}
          >
            {f.label} <span className="opacity-70">({f.n})</span>
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-gold">선택 {selected.size}명</span>
            <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground underline">
              선택 해제
            </button>
          </div>
          <BulkUserActions
            selectedIds={Array.from(selected)}
            onDone={() => { clearSelection(); void load(); }}
          />
        </div>
      )}

      {loading && <div className="text-center text-xs text-muted-foreground py-8 glass rounded-2xl">불러오는 중...</div>}
      {!loading && filtered.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-8 glass rounded-2xl">회원 없음</div>
      )}

      {filtered.map(u => {
        const statusBadges = [
          u.is_deleted && { label: "탈퇴", cls: "bg-destructive/30 text-destructive border-destructive/50" },
          u.is_banned && !u.is_deleted && { label: "차단", cls: "bg-destructive/20 text-destructive border-destructive/40" },
          u.is_frozen && !u.is_banned && { label: "동결", cls: "bg-gold/20 text-gold border-gold/40" },
          !u.profile_completed && { label: "프로필 미완성", cls: "bg-muted/40 text-muted-foreground border-border" },
        ].filter(Boolean) as { label: string; cls: string }[];
        const isChecked = selected.has(u.id);

        return (
          <div key={u.id} className={`glass rounded-2xl p-4 ${u.is_deleted ? "opacity-60" : ""} ${isChecked ? "ring-1 ring-gold/60" : ""}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <label className="flex items-start gap-2 min-w-0 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleOne(u.id)}
                  disabled={u.is_deleted}
                  className="mt-1 accent-gold shrink-0"
                />
                <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold text-sm truncate">{u.nickname || "(닉네임 없음)"}</div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider glass border border-border">
                    {providerLabel(u.auth_provider)}
                  </span>
                  {statusBadges.map(b => (
                    <span key={b.label} className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold border ${b.cls}`}>
                      {b.label}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                  {u.email ?? "(이메일 없음)"} · {u.id.slice(0, 8)} · {u.tier.toUpperCase()}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {u.real_name ?? "—"} · {u.phone ?? "—"} · {u.birth_date ?? "—"} · 가입 {new Date(u.created_at).toLocaleDateString("ko-KR")}
                </div>
                {u.is_frozen && u.frozen_until && (
                  <div className="text-[10px] text-gold mt-0.5">
                    ❄ 동결 {new Date(u.frozen_until).toLocaleString("ko-KR")}까지 · {u.freeze_reason ?? ""}
                  </div>
                )}
                </div>
              </label>
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <div className="font-display font-bold text-sm text-gradient-primary">{formatKRW(u.available_balance)}</div>
                <div className="text-[10px] text-muted-foreground">총 {formatKRW(u.total_balance)}</div>
                <Link
                  to={`/admin/product/users/${u.id}`}
                  className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  360 상세 <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Tier */}
            <div className="grid grid-cols-4 gap-1.5 mt-3">
              {TIERS.map(t => (
                <button
                  key={t}
                  disabled={busy || u.is_deleted}
                  onClick={() => setTier(u.id, t)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-40 ${
                    u.tier === t ? "bg-gradient-gold text-gold-foreground" : "glass"
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
              <button
                onClick={() => adjust(u.id)}
                disabled={busy || u.is_deleted}
                className="py-2 rounded-xl glass border border-border text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <Wallet className="w-3 h-3" /> 잔액
              </button>

              {u.is_frozen ? (
                <button
                  onClick={() => unfreeze(u.id)}
                  disabled={busy || u.is_deleted}
                  className="py-2 rounded-xl bg-gold/15 border border-gold/40 text-gold text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <Flame className="w-3 h-3" /> 동결 해제
                </button>
              ) : (
                <button
                  onClick={() => freeze(u.id)}
                  disabled={busy || u.is_deleted || u.is_banned}
                  className="py-2 rounded-xl glass border border-border text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <Snowflake className="w-3 h-3" /> 동결
                </button>
              )}

              {u.is_banned ? (
                <button
                  onClick={() => unban(u.id)}
                  disabled={busy || u.is_deleted}
                  className="py-2 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <ShieldOff className="w-3 h-3" /> 차단 해제
                </button>
              ) : (
                <button
                  onClick={() => ban(u.id)}
                  disabled={busy || u.is_deleted}
                  className="py-2 rounded-xl glass border border-border text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <Ban className="w-3 h-3" /> 차단
                </button>
              )}

              <button
                onClick={() => softDelete(u.id, u.nickname)}
                disabled={busy || u.is_deleted}
                className="py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" /> 탈퇴
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
