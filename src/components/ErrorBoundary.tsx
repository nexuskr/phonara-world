import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
  scope?: string;
  fallback?: ReactNode;
}
interface State {
  error: Error | null;
  count: number;
}

/**
 * Production error boundary. Logs to console + window.__phonara_errors
 * (consumed by ErrorMonitorAdmin queue) and renders a recovery card.
 *
 * Wrap dashboard / admin shells; do NOT wrap entire App (would mask
 * react-router & supabase auth state errors).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, count: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const scope = this.props.scope ?? "unknown";
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary:${scope}]`, error, info.componentStack);
    try {
      const w = window as any;
      w.__phonara_errors = w.__phonara_errors || [];
      w.__phonara_errors.push({
        scope,
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        at: new Date().toISOString(),
      });
      // Best-effort report; never throw if logger missing
      import("@/lib/error-logger").then((m: any) => {
        m?.logError?.({ message: error.message, stack: error.stack, context: { scope, componentStack: info.componentStack } });
      }).catch(() => {});
    } catch { /* noop */ }
  }

  reset = () => this.setState((s) => ({ error: null, count: s.count + 1 }));

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-[40vh] flex items-center justify-center p-6">
        <div className="glass-strong neon-border rounded-2xl p-6 max-w-lg w-full space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-display font-bold">화면을 그릴 수 없어요</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            일시적인 문제가 발생했어요. 다시 시도해 주세요. 문제가 반복되면 새로고침을 눌러주세요.
          </p>
          <pre className="text-[11px] bg-input/40 rounded-lg p-2 overflow-auto max-h-32 text-muted-foreground">
            {this.state.error.message}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={this.reset}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" /> 다시 시도
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 rounded-xl glass text-sm font-bold"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>
    );
  }
}
