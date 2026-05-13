/**
 * PR-14 — Mission Control 임계값 / SLA 관리 패널.
 * admin_settings_get/set 으로 'cockpit.thresholds' & 'cockpit.sla' 편집.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { LoadingList } from "@/components/ui/loading-state";
import { Sliders, Save, RotateCcw } from "lucide-react";

type Thresholds = {
  deposits_hot: number;
  withdrawals_hot: number;
  aml_hot: number;
  refund_hot: number;
  anomaly_hot: number;
};

type Sla = {
  withdrawal_minutes: number;
  deposit_minutes: number;
  aml_minutes: number;
};

const DEFAULT_T: Thresholds = {
  deposits_hot: 5, withdrawals_hot: 3, aml_hot: 1, refund_hot: 2, anomaly_hot: 5,
};
const DEFAULT_S: Sla = { withdrawal_minutes: 30, deposit_minutes: 15, aml_minutes: 60 };

const T_LABELS: Record<keyof Thresholds, string> = {
  deposits_hot:    "충전 검수 임계 (건)",
  withdrawals_hot: "출금 지급 임계 (건)",
  aml_hot:         "AML 큐 임계 (건)",
  refund_hot:      "환불/손실보호 임계 (건)",
  anomaly_hot:     "이상감지 임계 (건)",
};

const S_LABELS: Record<keyof Sla, string> = {
  withdrawal_minutes: "출금 SLA (분)",
  deposit_minutes:    "충전 SLA (분)",
  aml_minutes:        "AML SLA (분)",
};

export default function ThresholdsAdmin() {
  const [t, setT] = useState<Thresholds>(DEFAULT_T);
  const [s, setS] = useState<Sla>(DEFAULT_S);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [tr, sr] = await Promise.all([
        (supabase as any).rpc("admin_settings_get", { _key: "cockpit.thresholds" }),
        (supabase as any).rpc("admin_settings_get", { _key: "cockpit.sla" }),
      ]);
      if (tr.data && typeof tr.data === "object") setT({ ...DEFAULT_T, ...tr.data });
      if (sr.data && typeof sr.data === "object") setS({ ...DEFAULT_S, ...sr.data });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    setSaving(true);
    try {
      const [tr, sr] = await Promise.all([
        (supabase as any).rpc("admin_settings_set", { _key: "cockpit.thresholds", _value: t }),
        (supabase as any).rpc("admin_settings_set", { _key: "cockpit.sla", _value: s }),
      ]);
      if (tr.error || sr.error) throw tr.error ?? sr.error;
      notify.success("임계값 저장 완료");
    } catch (e: any) {
      notify.fail("저장 실패", e);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setT(DEFAULT_T);
    setS(DEFAULT_S);
    notify.info("기본값으로 복원됨", { description: "저장 버튼을 눌러야 적용됩니다." });
  }

  if (loading) return <LoadingList rows={6} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" />
          <h2 className="font-display font-black text-xl">Mission Control 임계값</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="glass-strong rounded-xl px-3 py-2 text-xs font-bold border border-border/60 hover:border-primary/60 transition flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 기본값
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl px-3 py-2 text-xs font-bold bg-primary text-primary-foreground border border-primary hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        대기 건수가 임계값 이상이면 Cockpit 액션 타일이 적색 펄스로 강조됩니다. SLA는 추후 자동 알림 기준으로 사용됩니다.
      </p>

      <section className="glass-strong rounded-2xl p-5 border border-border/50 space-y-4">
        <h3 className="text-[10px] tracking-[0.3em] font-black uppercase text-muted-foreground">
          ① 액션 타일 임계 (Cockpit Hot)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(T_LABELS) as (keyof Thresholds)[]).map((k) => (
            <label key={k} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2">
              <span className="text-xs">{T_LABELS[k]}</span>
              <input
                type="number"
                min={0}
                max={9999}
                value={t[k]}
                onChange={(e) => setT({ ...t, [k]: Math.max(0, Number(e.target.value) || 0) })}
                className="w-20 bg-background border border-border/60 rounded-lg px-2 py-1 text-right text-sm font-bold tabular-nums focus:border-primary outline-none"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="glass-strong rounded-2xl p-5 border border-border/50 space-y-4">
        <h3 className="text-[10px] tracking-[0.3em] font-black uppercase text-muted-foreground">
          ② SLA 목표 (분 단위)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.keys(S_LABELS) as (keyof Sla)[]).map((k) => (
            <label key={k} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2">
              <span className="text-xs">{S_LABELS[k]}</span>
              <input
                type="number"
                min={1}
                max={1440}
                value={s[k]}
                onChange={(e) => setS({ ...s, [k]: Math.max(1, Number(e.target.value) || 1) })}
                className="w-20 bg-background border border-border/60 rounded-lg px-2 py-1 text-right text-sm font-bold tabular-nums focus:border-primary outline-none"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
