import React from "react";
import { logClientError } from "@/lib/error-logger";

interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    void logClientError(error.message, {
      stack: error.stack,
      context: { type: "react.error_boundary", component_stack: info.componentStack },
    });
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-background">
          <div className="glass-strong neon-border rounded-3xl p-8 max-w-md text-center">
            <h1 className="font-display font-black text-2xl text-gradient-primary mb-2">
              일시적인 오류가 발생했습니다
            </h1>
            <p className="text-sm text-muted-foreground mb-5">
              {this.state.error?.message ?? "알 수 없는 오류"}
            </p>
            <button
              onClick={this.reset}
              className="w-full py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
