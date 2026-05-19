import { Component, type ReactNode } from "react";
import { notify } from "@/lib/notify";

interface State {
  err: Error | null;
}

/**
 * P1-12 GameErrorBoundary — per-game soft boundary.
 * - Surfaces toast via the sanctioned `@/lib/notify` (never raw sonner).
 * - Renders an imperial fallback card so the page chrome survives.
 */
export class GameErrorBoundary extends Component<
  { children: ReactNode; gameSlug?: string; fallback?: ReactNode },
  State
> {
  state: State = { err: null };
  static getDerivedStateFromError(err: Error): State {
    return { err };
  }
  componentDidCatch(err: Error) {
    try {
      notify.error?.("게임을 다시 불러왔습니다", {
        description: err.message?.slice(0, 120),
      });
    } catch {
      /* noop */
    }
  }
  render() {
    if (!this.state.err) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div
        role="alert"
        className="imperial-card flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-destructive/40 p-6 text-center"
      >
        <span className="text-gradient-gold text-base font-bold">잠시 황궁이 흔들렸습니다</span>
        <span className="text-xs text-muted-foreground">
          {this.props.gameSlug ? `[${this.props.gameSlug}] ` : ""}
          잠시 후 자동 복구됩니다.
        </span>
        <button
          type="button"
          onClick={() => this.setState({ err: null })}
          className="mt-2 inline-flex h-9 items-center justify-center rounded-md gradient-gold px-4 text-sm font-semibold text-background"
        >
          다시 시작
        </button>
      </div>
    );
  }
}
