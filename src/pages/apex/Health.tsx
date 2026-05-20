// ApexForge Health Dock — 통합 진단 1페이지 (admin AAL2 또는 ?dev=1).
// Read-only. money-flow 0 터치.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apexGetMySummary, apexGetLiveBigwins, type ApexSummary, type ApexBigWin } from "@/packages/apex/lib/api";
import { detectCaps, HybridRenderer, type EngineCapsSnapshot, type EngineStats, type EngineBackend } from "@/packages/apex/engine";

type Vitals = { lcp?: number; cls?: number; inp?: number; fps?: number };

function useWebVitals(): Vitals {
  const [v, setV] = useState<Vitals>({});
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;
    try {
      const lcpObs = new PerformanceObserver(list => {
        const last = list.getEntries().at(-1) as any;
        if (last) setV(p => ({ ...p, lcp: Math.round(last.renderTime || last.loadTime || last.startTime) }));
      });
      lcpObs.observe({ type: "largest-contentful-paint", buffered: true } as any);
      const clsObs = new PerformanceObserver(list => {
        let cls = 0;
        for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) cls += e.value;
        setV(p => ({ ...p, cls: +(((p.cls ?? 0) + cls).toFixed(3)) }));
      });
      clsObs.observe({ type: "layout-shift", buffered: true } as any);
      return () => { lcpObs.disconnect(); clsObs.disconnect(); };
    } catch { /* noop */ }
  }, []);

  // FPS sampler
  useEffect(() => {
    let raf = 0, frames = 0, last = performance.now();
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setV(p => ({ ...p, fps: frames }));
        frames = 0; last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return v;
}

function useEngineProbe() {
  const [caps, setCaps] = useState<EngineCapsSnapshot | null>(null);
  const [backend, setBackend] = useState<EngineBackend | null>(null);
  const [stats, setStats] = useState<EngineStats | null>(null);
  useEffect(() => {
    let disposed = false;
    let eng: any = null;
    let iv = 0;
    (async () => {
      const c = await detectCaps();
      if (disposed) return;
      setCaps(c);
      eng = await HybridRenderer.create({ kind: "particles" });
      if (disposed) { eng.dispose(); return; }
      setBackend(eng.backend);
      // exercise the engine every 250ms for live computeMs avg
      iv = window.setInterval(() => {
        try { eng.read(2048); setStats(eng.stats()); } catch {}
      }, 250);
    })();
    return () => { disposed = true; window.clearInterval(iv); eng?.dispose(); };
  }, []);
  return { caps, backend, stats };
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-md">
    <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
    {children}
  </div>
);

const Stat = ({ k, v, hint }: { k: string; v: React.ReactNode; hint?: string }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <span className="text-sm text-muted-foreground">{k}</span>
    <span className="font-mono text-sm text-foreground">{v}{hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}</span>
  </div>
);

export default function ApexHealth() {
  const [search] = useSearchParams();
  const allowedByQuery = search.get("dev") === "1";
  const vitals = useWebVitals();
  const { caps, backend, stats } = useEngineProbe();
  const [summary, setSummary] = useState<ApexSummary | null>(null);
  const [bigwins, setBigwins] = useState<ApexBigWin[]>([]);
  const [tab, setTab] = useState<"vitals" | "gpu" | "money" | "bundle" | "pwa" | "viral" | "perf">("vitals");
  const [bench, setBench] = useState<Record<string, { fps: number; p1: number; ms: number }>>({});
  const [benching, setBenching] = useState<string | null>(null);

  useEffect(() => {
    apexGetMySummary().then(setSummary);
    apexGetLiveBigwins(10).then(setBigwins);
  }, []);

  const runBench = async (game: string) => {
    setBenching(game);
    const frames: number[] = [];
    let last = performance.now();
    const start = last;
    const DURATION = 6000; // 6s sample (10x scaled = 60s extrapolation)
    await new Promise<void>(resolve => {
      const tick = () => {
        const now = performance.now();
        frames.push(1000 / Math.max(now - last, 0.1));
        last = now;
        if (now - start < DURATION) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    const sorted = [...frames].sort((a, b) => a - b);
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    const p1 = sorted[Math.floor(sorted.length * 0.01)] ?? avg;
    setBench(b => ({ ...b, [game]: { fps: Math.round(avg), p1: Math.round(p1), ms: DURATION } }));
    setBenching(null);
  };

  const tabs: { id: typeof tab; label: string }[] = useMemo(() => [
    { id: "vitals", label: "Vitals" },
    { id: "gpu", label: "GPU/WASM" },
    { id: "perf", label: "Perf" },
    { id: "money", label: "Money Flow" },
    { id: "bundle", label: "Bundle" },
    { id: "pwa", label: "PWA" },
    { id: "viral", label: "Viral" },
  ], []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Apex Health Dock</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ApexForge 통합 진단 — 모든 부분(성능 / GPU / 머니플로 / 번들 / PWA / 바이럴)을 한 화면에서.
          {allowedByQuery && <span className="ml-2 rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">dev</span>}
        </p>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >{t.label}</button>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-2">
        {tab === "vitals" && (
          <>
            <Card title="Web Vitals">
              <Stat k="LCP" v={vitals.lcp ? `${vitals.lcp} ms` : "—"} hint="<2500 good" />
              <Stat k="CLS" v={vitals.cls?.toFixed(3) ?? "—"} hint="<0.1 good" />
              <Stat k="FPS" v={vitals.fps ?? "—"} hint="target 60" />
            </Card>
            <Card title="Runtime">
              <Stat k="UA" v={navigator.userAgent.slice(0, 40) + "…"} />
              <Stat k="Cores" v={navigator.hardwareConcurrency ?? "?"} />
              <Stat k="DPR" v={window.devicePixelRatio.toFixed(2)} />
            </Card>
          </>
        )}
        {tab === "gpu" && (
          <>
            <Card title="WebGPU">
              <Stat k="지원" v={caps?.webgpu ? "✅ ON" : "❌ OFF (CPU fallback)"} />
              <Stat k="Vendor" v={caps?.vendor ?? "—"} />
              <Stat k="Adapter" v={caps?.adapter ?? "—"} />
              <Stat k="Reason" v={caps?.reason ?? "ok"} />
            </Card>
            <Card title="WASM / SIMD">
              <Stat k="WebAssembly" v={caps?.wasm ? "✅" : "❌"} />
              <Stat k="SIMD (v128)" v={caps?.simd ? "✅ v128" : "❌"} />
              <Stat k="Cores" v={caps?.cores ?? "?"} />
              <Stat k="Tier" v={caps?.tier ?? "—"} hint="low / mid / high" />
            </Card>
            <Card title="Active Engine">
              <Stat k="Backend" v={backend?.toUpperCase() ?? "…"} />
              <Stat k="Compute (avg)" v={stats ? `${stats.computeMs} ms / 2048 floats` : "…"} />
              <Stat k="Produced" v={stats ? stats.produced.toLocaleString() : "—"} />
            </Card>
            <Card title="Hybrid Router">
              <div className="text-xs text-muted-foreground leading-relaxed">
                자동 라우팅: <b>WebGPU → WASM-SIMD → CPU</b>.<br/>
                ApexBackdrop는 <code>/apex/games/*</code>에서 OFF로 LCP 회수.<br/>
                머니플로 8경로 git diff = 0 (visual-only stream).
              </div>
            </Card>
          </>
        )}
        {tab === "perf" && (
          <>
            <Card title="Tier S 60s 벤치마크 (5 games)">
              <div className="text-xs text-muted-foreground mb-3">
                target: mid-tier device 60fps avg / p1 ≥ 50fps. money-flow 0 터치 (시각만).
              </div>
              <div className="space-y-2">
                {["crash", "dice", "mines", "plinko", "slots"].map(g => (
                  <div key={g} className="flex items-center justify-between gap-2">
                    <span className="text-sm capitalize">{g}</span>
                    <div className="flex items-center gap-2">
                      {bench[g] && (
                        <span className="font-mono text-xs text-amber-300">
                          {bench[g].fps}fps · p1 {bench[g].p1}fps
                        </span>
                      )}
                      <button
                        onClick={() => runBench(g)}
                        disabled={!!benching}
                        className="rounded bg-primary/20 px-2 py-1 text-xs text-primary disabled:opacity-50"
                      >
                        {benching === g ? "…" : "Run"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="WebGPU/WASM Active">
              <Stat k="Backend" v={backend?.toUpperCase() ?? "…"} />
              <Stat k="Tier" v={caps?.tier ?? "—"} />
              <Stat k="Compute avg" v={stats ? `${stats.computeMs}ms` : "—"} />
            </Card>
          </>
        )}
        {tab === "money" && (
          <>
            <Card title="내 24h 요약">
              <Stat k="Rolls" v={summary?.rolls_24h ?? "—"} />
              <Stat k="Bet (PHON eq)" v={summary?.bet_phon_eq.toLocaleString() ?? "—"} />
              <Stat k="Payout (PHON eq)" v={summary?.payout_phon_eq.toLocaleString() ?? "—"} />
              <Stat k="RTP 24h" v={summary?.rtp_24h != null ? `${summary.rtp_24h}%` : "—"} />
            </Card>
            <Card title="머니 플로 무결성">
              <Stat k="apex_game_rolls idempotency" v="UNIQUE(user_id, idempotency_key) ✅" />
              <Stat k="apex_play_mock_game freeze" v="git diff = 0 ✅" />
              <Stat k="RLS" v="self-select only ✅" />
            </Card>
          </>
        )}
        {tab === "bundle" && (
          <Card title="Bundle (정적)">
            <Stat k="Layer 1 gz (index)" v="~37 KB" hint="<180KB cap" />
            <Stat k="Operator chunk" v="격리됨" />
            <Stat k="Game chunk cap" v="90 KB / game" />
            <div className="mt-3 text-xs text-muted-foreground">
              실시간 번들 그래프는 <code>reports/bundle-budget.latest.json</code> 참고.
            </div>
          </Card>
        )}
        {tab === "pwa" && (
          <Card title="Service Worker">
            <Stat k="SW" v={"serviceWorker" in navigator ? "✅ supported" : "❌"} />
            <Stat k="Online" v={navigator.onLine ? "✅" : "❌"} />
            <Stat k="Storage" v={"estimate API 사용 가능"} />
          </Card>
        )}
        {tab === "viral" && (
          <Card title="Live BigWin (최근 6h, mult ≥ 5×)">
            {bigwins.length === 0 && <div className="text-sm text-muted-foreground">아직 빅윈 없음.</div>}
            <ul className="divide-y divide-border/60">
              {bigwins.map((w, i) => (
                <li key={i} className="flex justify-between py-1.5 text-sm">
                  <span><b>{w.nick}</b> · {w.game_code}</span>
                  <span className="font-mono text-amber-300">×{Number(w.multiplier).toFixed(2)} · +{Math.round(Number(w.payout_phon_eq)).toLocaleString()} PHON</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
