/**
 * @pkg/telemetry/sampling — Telemetry Sampling Rule (LOCKED v3.0 §14-3)
 *
 *  HIGH-FREQUENCY (sample 5~10%, client bucket)
 *    scroll · hover · pointermove · animation frame · fps tick · route change · mount
 *
 *  CRITICAL FINANCIAL (sample 100%, 무조건 flush + retry)
 *    deposit · withdraw · receipt verify · oracle drift · kill-switch toggle
 *    permission change · anomaly events · crown award · package purchase · refund
 *
 * 사용:
 *   track("scroll_to_bottom", { route }, { tier: "high" });
 *   track("withdraw_submitted", { amount }, { tier: "critical" });
 *   softFail("clip-feed", { reason });
 */

type Tier = "high" | "critical";

const HIGH_SAMPLE_RATE = 0.08; // 8%

type Payload = Record<string, unknown> | undefined;

function shouldSample(tier: Tier): boolean {
  if (tier === "critical") return true;
  return Math.random() < HIGH_SAMPLE_RATE;
}

const queue: Array<{ name: string; payload: Payload; tier: Tier; ts: number }> = [];
let flushScheduled = false;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  const run = () => {
    flushScheduled = false;
    const batch = queue.splice(0, queue.length);
    if (batch.length === 0) return;
    // 현재는 DEV 콘솔 + window.dispatchEvent 로만 발행.
    // 추후 spans / error_logs 테이블로 보낼 때 이 지점만 교체.
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[telemetry]", batch);
    }
    try {
      window.dispatchEvent(new CustomEvent("phonara:telemetry", { detail: batch }));
    } catch {
      /* ignore */
    }
  };
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run);
  } else {
    setTimeout(run, 250);
  }
}

export function track(name: string, payload?: Payload, opts: { tier?: Tier } = {}) {
  const tier = opts.tier ?? "high";
  if (!shouldSample(tier)) return;
  queue.push({ name, payload, tier, ts: Date.now() });
  scheduleFlush();
}

/** SoftBoundary 등 graceful fallback 발생 시 호출 (critical tier). */
export function softFail(component: string, meta?: Payload) {
  track("soft_fail", { component, ...(meta ?? {}) }, { tier: "critical" });
}

/** Budget 위반 (animations > 3, INP > 200 등) 보고 (critical tier). */
export function budgetViolation(kind: string, meta?: Payload) {
  track("budget_violation", { kind, ...(meta ?? {}) }, { tier: "critical" });
}
