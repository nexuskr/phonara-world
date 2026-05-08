import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, RefreshCw, ShieldAlert, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Template {
  id: string;
  key: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  reward_credit: number;
  reward_xp: number;
  duration_minutes: number;
  auto_approve: boolean;
  active: boolean;
  ai_prompt_seed: string | null;
}

interface PendingMission {
  id: string;
  user_id: string;
  template_key: string;
  title: string;
  description: string;
  reward_credit: number;
  ai_reasoning: string | null;
  status: string;
  created_at: string;
}

const blank: Partial<Template> = {
  key: "",
  title: "",
  description: "",
  category: "general",
  difficulty: "EASY",
  reward_credit: 1000,
  reward_xp: 50,
  duration_minutes: 10,
  auto_approve: true,
  active: true,
  ai_prompt_seed: "",
};

export default function MissionTemplatesAdmin() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pending, setPending] = useState<PendingMission[]>([]);
  const [editing, setEditing] = useState<Partial<Template>>(blank);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [tpl, pen] = await Promise.all([
      supabase.from("mission_templates").select("*").order("category").order("key"),
      supabase.from("ai_generated_missions").select("id,user_id,template_key,title,description,reward_credit,ai_reasoning,status,created_at")
        .eq("status", "pending").order("created_at", { ascending: false }).limit(50),
    ]);
    setTemplates((tpl.data ?? []) as Template[]);
    setPending((pen.data ?? []) as PendingMission[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.key || !editing.title) { toast({ title: "key/title 필수", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.rpc("admin_upsert_mission_template", {
      _key: editing.key,
      _title: editing.title,
      _description: editing.description ?? "",
      _category: editing.category ?? "general",
      _difficulty: editing.difficulty ?? "EASY",
      _reward_credit: Number(editing.reward_credit ?? 1000),
      _reward_xp: Number(editing.reward_xp ?? 50),
      _duration_minutes: Number(editing.duration_minutes ?? 10),
      _auto_approve: !!editing.auto_approve,
      _active: !!editing.active,
      _ai_prompt_seed: editing.ai_prompt_seed ?? null,
    });
    setSaving(false);
    if (error) { toast({ title: "저장 실패", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✓ 저장 완료" });
    setEditing(blank);
    load();
  }

  async function resolve(id: string, action: "approve" | "reject" | "partial") {
    const { error } = await supabase.rpc("admin_resolve_ai_mission", { _id: id, _action: action });
    if (error) { toast({ title: "처리 실패", description: error.message, variant: "destructive" }); return; }
    toast({ title: action === "approve" ? "✓ 승인" : action === "partial" ? "⚖ 부분 승인 (50%)" : "✕ 거절" });
    load();
  }

  async function bulkAutoApprove() {
    const auto = templates.filter(t => t.auto_approve).map(t => t.key);
    if (auto.length === 0) { toast({ title: "auto_approve 템플릿 없음" }); return; }
    const targets = pending.filter(p => auto.includes((p as any).template_key ?? ""));
    if (targets.length === 0) { toast({ title: "대상 없음 (이미 자동 승인되었거나 수동 템플릿)" }); return; }
    for (const m of targets) {
      await supabase.rpc("admin_resolve_ai_mission", { _id: m.id, _action: "approve" });
    }
    toast({ title: `✓ ${targets.length}건 자동 승인` });
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="font-imperial text-xl font-black">미션 템플릿 · AI 결재</h2>
        <button onClick={load} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" /> 새로고침
        </button>
      </header>

      {/* ── Pending AI missions ── */}
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          AI 미션 결재 대기 ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="text-xs text-muted-foreground">대기 중인 미션이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="rounded-xl bg-card p-3 border border-border/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{m.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 break-keep">{m.description}</div>
                    {m.ai_reasoning && <div className="text-[11px] italic text-cyan-400/80 mt-1">💡 {m.ai_reasoning}</div>}
                    <div className="text-xs text-muted-foreground mt-1 tabular-nums">user {m.user_id.slice(0, 8)} · ₩{m.reward_credit.toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => resolve(m.id, "approve")} className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />승인</button>
                    <button onClick={() => resolve(m.id, "reject")} className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />거절</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Editor ── */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-3"><Plus className="w-4 h-4" /> 템플릿 추가/수정</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Field label="key (고유)" value={editing.key ?? ""} onChange={(v) => setEditing({ ...editing, key: v })} />
          <Field label="title" value={editing.title ?? ""} onChange={(v) => setEditing({ ...editing, title: v })} />
          <Field label="category" value={editing.category ?? ""} onChange={(v) => setEditing({ ...editing, category: v })} />
          <Field label="difficulty (EASY/MEDIUM/HARD)" value={editing.difficulty ?? ""} onChange={(v) => setEditing({ ...editing, difficulty: v })} />
          <Field label="reward_credit (KRW)" value={String(editing.reward_credit ?? 0)} onChange={(v) => setEditing({ ...editing, reward_credit: Number(v) })} type="number" />
          <Field label="reward_xp" value={String(editing.reward_xp ?? 0)} onChange={(v) => setEditing({ ...editing, reward_xp: Number(v) })} type="number" />
          <Field label="duration_minutes" value={String(editing.duration_minutes ?? 0)} onChange={(v) => setEditing({ ...editing, duration_minutes: Number(v) })} type="number" />
          <Field label="ai_prompt_seed" value={editing.ai_prompt_seed ?? ""} onChange={(v) => setEditing({ ...editing, ai_prompt_seed: v })} />
          <label className="col-span-2"><span className="text-xs text-muted-foreground">description</span>
            <textarea
              value={editing.description ?? ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
              rows={2}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!editing.auto_approve} onChange={(e) => setEditing({ ...editing, auto_approve: e.target.checked })} />
            자동 승인 (AI가 즉시 청구 가능)
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            활성
          </label>
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <button onClick={() => setEditing(blank)} className="text-xs px-3 py-2 rounded-lg bg-card border border-border">초기화</button>
          <button onClick={save} disabled={saving} className="text-xs px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold flex items-center gap-1 disabled:opacity-60">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 저장
          </button>
        </div>
      </section>

      {/* ── Templates list ── */}
      <section>
        <h3 className="font-bold text-sm mb-3">템플릿 목록</h3>
        {loading ? <div className="text-xs text-muted-foreground">로딩…</div> : (
          <div className="space-y-1.5">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setEditing(t)}
                className={`w-full text-left rounded-xl p-3 border ${
                  t.active ? "bg-card border-border/50 hover:border-primary/40" : "bg-card/30 border-border/30 opacity-60"
                } transition`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold flex items-center gap-2 flex-wrap">
                      {t.title}
                      <code className="text-[10px] px-1.5 py-0.5 rounded bg-card text-muted-foreground">{t.key}</code>
                      {t.auto_approve && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">AUTO</span>}
                      {!t.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-bold">OFF</span>}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {t.category} · {t.difficulty} · ₩{t.reward_credit.toLocaleString()} · {t.reward_xp}XP · {t.duration_minutes}m
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label>
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
      />
    </label>
  );
}
