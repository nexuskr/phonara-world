// P0.5 — Admin Bot Strength control panel.
// 봇 시드 엔진 강도(0/25/50/100%)와 온라인 기준선·변동 폭을 조절합니다.
// 모든 변경은 admin_set_bot_strength RPC를 통해 has_role('admin') + AAL2(상위 게이트) 보호.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Bot, ToggleLeft, ToggleRight, Users, Activity } from "lucide-react";

type BotSettings = {
  enabled: boolean;
  strength_pct: number;
  online_base: number;
  online_jitter: number;
  updated_at: string;
};

const PRESETS: Array<{ pct: number; label: string; desc: string }> = [
  { pct: 0,   label: "OFF",   desc: "심사·점검·실유저 검증" },
  { pct: 25,  label: "25%",   desc: "베타·소수 노출" },
  { pct: 50,  label: "50%",   desc: "정식 런칭 안정 운영" },
  { pct: 100, label: "100%",  desc: "최대 FOMO · 그랜드 오프닝" },
];

export default function BotStrengthAdmin() {
  const [s, setS] = useState<BotSettings | null>(null);
  const [feedSample, setFeedSample] = useState<any[]>([]);
  const [online, setOnline] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState(12000);
  const [jitter, setJitter] = useState(3000);

  async function load() {
    setLoading(true);
    const [{ data: settings }, { data: feed }, { data: cnt }] = await Promise.all([
      supabase.from("bot_settings").select("enabled,strength_pct,online_base,online_jitter,updated_at").eq("id", 1).maybeSingle(),
      supabase.rpc("get_bot_feed", { _limit: 12 }),
      supabase.rpc("get_bot_online_count"),
    ]);
    if (settings) {
      setS(settings as BotSettings);
      setBase(settings.online_base);
      setJitter(settings.online_jitter);
    }
    if (Array.isArray(feed)) setFeedSample(feed);
    if (typeof cnt === "number") setOnline(cnt);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  async function apply(enabled: boolean, pct: number, baseOverride?: number, jitterOverride?: number) {
    setSaving(true);
    const { data, error } = await supabase.rpc("admin_set_bot_strength", {
      _enabled: enabled,
      _strength_pct: pct,
      _online_base: baseOverride ?? null,
      _online_jitter: jitterOverride ?? null,
    });
    setSaving(false);
    if (error) {
      notify.error("저장 실패", error.message);
      return;
    }
    notify.success("봇 강도 적용됨", `${pct}% / ${enabled ? "ON" : "OFF"}`);
    if (data) setS(data as BotSettings);
    void load();
  }

  if (loading && !s) return <LoadingList rows={6} />;
  if (!s) return <EmptyState title="설정을 불러올 수 없습니다" description="관리자 권한을 확인하세요." />;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="glass-strong rounded-2xl p-5 neon-border">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="font-imperial text-lg tracking-wider text-gradient-imperial">Bot Seeding 엔진</h2>
          </div>
          <button
            onClick={() => apply(!s.enabled, s.strength_pct)}
            disabled={saving}
            className="lux-btn lux-btn-ghost flex items-center gap-2"
          >
            {s.enabled
              ? <><ToggleRight className="w-5 h-5 text-secondary" /> ON</>
              : <><ToggleLeft className="w-5 h-5 text-muted-foreground" /> OFF</>}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 break-keep">
          시뮬레이션 트래픽을 생성하여 신규 사용자에게 활성 플랫폼처럼 보이도록 합니다.
          봇은 표시 전용이며 KRW/USDT 잔고에 영향을 주지 않습니다.
        </p>

        {/* 현재 상태 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <Stat icon={Activity} label="현재 강도" value={`${s.strength_pct}%`} />
          <Stat icon={Users} label="현재 온라인 (시뮬)" value={online.toLocaleString()} />
          <Stat icon={Activity} label="베이스라인" value={s.online_base.toLocaleString()} />
          <Stat icon={Activity} label="변동 폭 (±)" value={s.online_jitter.toLocaleString()} />
        </div>
      </div>

      {/* 프리셋 */}
      <div className="glass-strong rounded-2xl p-5">
        <div className="text-sm font-bold mb-3">강도 프리셋</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map(p => (
            <button
              key={p.pct}
              onClick={() => apply(p.pct > 0, p.pct)}
              disabled={saving}
              className={`text-left rounded-xl p-3 transition border ${
                s.strength_pct === p.pct && (p.pct === 0 ? !s.enabled : s.enabled)
                  ? "bg-gradient-imperial text-primary-foreground border-primary glow-imperial"
                  : "glass border-border/40 hover:border-primary/40"
              }`}
            >
              <div className="font-display font-black text-lg">{p.label}</div>
              <div className="text-[11px] opacity-80 break-keep">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 베이스라인/지터 조정 */}
      <div className="glass-strong rounded-2xl p-5">
        <div className="text-sm font-bold mb-3">온라인 카운터 정밀 조정</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">베이스라인 (명)</span>
            <input
              type="number"
              min={0} max={50000} step={500}
              value={base}
              onChange={e => setBase(Math.max(0, Math.min(50000, Number(e.target.value) || 0)))}
              className="mt-1 w-full bg-transparent border border-border/40 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">변동 폭 ± (명)</span>
            <input
              type="number"
              min={0} max={20000} step={250}
              value={jitter}
              onChange={e => setJitter(Math.max(0, Math.min(20000, Number(e.target.value) || 0)))}
              className="mt-1 w-full bg-transparent border border-border/40 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          onClick={() => apply(s.enabled, s.strength_pct, base, jitter)}
          disabled={saving}
          className="lux-btn lux-btn-primary mt-3"
        >
          정밀 조정 적용
        </button>
      </div>

      {/* 라이브 피드 미리보기 */}
      <div className="glass-strong rounded-2xl p-5">
        <div className="text-sm font-bold mb-3">라이브 피드 샘플 (실시간)</div>
        {feedSample.length === 0 ? (
          <EmptyState title="아직 이벤트가 없습니다" description="엔진이 활성화되면 1분 안에 표시됩니다." />
        ) : (
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {feedSample.map((f: any) => (
              <li key={f.id} className="text-xs flex items-center gap-2 py-1 border-b border-border/20 last:border-0">
                <span>{f.avatar_emoji}</span>
                <span className="text-gradient-gold font-bold">{f.nickname}</span>
                <span className="text-muted-foreground truncate">{f.event_text}</span>
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                  {new Date(f.occurred_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground break-keep">
        ⓘ 모든 강도 변경은 권한 변경 로그에 기록되며, Reviewer Mode 진입 시 자동으로 0%로 강제됩니다.
        라이브 카운터는 시뮬레이션 트래픽을 포함합니다.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <Icon className="w-4 h-4 mx-auto text-muted-foreground" />
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
      <div className="font-display font-bold text-sm tabular-nums">{value}</div>
    </div>
  );
}
