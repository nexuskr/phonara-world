/**
 * @pkg/telemetry/web-vitals — Interaction Budget Telemetry (LOCKED v3.0 §12-1)
 *
 * Mobile 전역 예산:
 *   - 첫 입력 응답 < 100ms (INP < 200ms 합격선)
 *   - 화면 전환 < 150ms
 *   - JS main thread block > 1s 금지
 *   - LCP < 2.5s
 *
 * 위반 시 budgetViolation()으로 critical tier 전송 → 추후 /admin/kpi 패널.
 */
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";
import { budgetViolation, track } from "./sampling";

const THRESHOLDS = {
  LCP: 2500,
  INP: 200,
  CLS: 0.1,
  FCP: 1800,
  TTFB: 800,
} as const;

function report(metric: Metric) {
  const threshold = THRESHOLDS[metric.name as keyof typeof THRESHOLDS];
  const payload = {
    metric: metric.name,
    value: Math.round(metric.value * 1000) / 1000,
    rating: metric.rating,
    id: metric.id,
    route: typeof location !== "undefined" ? location.pathname : "",
  };
  if (threshold !== undefined && metric.value > threshold) {
    budgetViolation(metric.name.toLowerCase(), payload);
  } else {
    track("web_vital", payload, { tier: "high" });
  }
}

/** App 부팅 시 1회 호출. requestIdleCallback 안쪽에서 호출 권장. */
export function initWebVitals() {
  try {
    onLCP(report);
    onINP(report);
    onCLS(report);
    onFCP(report);
    onTTFB(report);
  } catch (e) {
    if (import.meta.env?.DEV) console.warn("[web-vitals] init failed", e);
  }

  // Long task observer — JS main thread block > 1s 위반 보고.
  if (typeof PerformanceObserver !== "undefined") {
    try {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 1000) {
            budgetViolation("long_task", {
              duration: Math.round(entry.duration),
              name: entry.name,
              route: location.pathname,
            });
          }
        }
      });
      obs.observe({ type: "longtask", buffered: true });
    } catch {
      /* longtask 미지원 브라우저 */
    }
  }
}
