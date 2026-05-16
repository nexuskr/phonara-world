/**
 * @pkg/ui/SoftBoundary — Fail-Soft Architecture (LOCKED v3.0 §12-4)
 *
 * Optional 컴포넌트(chat/clip/avatar/feed/prediction/3d/social) 마운트 지점에
 * 항상 이걸 감싼다. 자식이 throw 해도 critical path(auth/wallet/deposit/withdraw)는
 * 절대 영향받지 않는다.
 *
 *   <SoftBoundary name="live-clip-feed">
 *     <ClipFeed />
 *   </SoftBoundary>
 *
 * 동작:
 *  - 자식 throw → 작은 빈 카드 + 자동 5s 재시도 (최대 3회)
 *  - telemetry.softFail(name) 자동 호출
 *  - critical=true 로는 절대 사용 금지 (이건 의도적으로 optional 전용)
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { softFail } from "@pkg/telemetry";

type Props = {
  name: string;
  children: ReactNode;
  /** custom fallback. 미지정 시 작은 빈 카드. */
  fallback?: ReactNode;
  /** ms 후 자동 retry. default 5000. */
  retryAfterMs?: number;
  /** 최대 retry 횟수. default 3. */
  maxRetries?: number;
};

type State = { hasError: boolean; retryCount: number };

export class SoftBoundary extends Component<Props, State> {
  state: State = { hasError: false, retryCount: 0 };
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    softFail(this.props.name, { message: error.message, stack: info.componentStack });
    if (import.meta.env?.DEV) {
      console.warn(`[SoftBoundary:${this.props.name}]`, error);
    }
    this.scheduleRetry();
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private scheduleRetry = () => {
    const max = this.props.maxRetries ?? 3;
    if (this.state.retryCount >= max) return;
    const ms = this.props.retryAfterMs ?? 5000;
    this.retryTimer = setTimeout(() => {
      this.setState((s) => ({ hasError: false, retryCount: s.retryCount + 1 }));
    }, ms);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border/40 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground"
        >
          잠시 후 다시 시도합니다…
        </div>
      );
    }
    return this.props.children;
  }
}
