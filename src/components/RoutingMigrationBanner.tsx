/**
 * RoutingMigrationBanner — v14.0 Sprint 0 1주 안내 배너.
 * `/dashboard` 상단에 노출. "새 홈은 /home 입니다" 1회 안내 후 닫기 가능.
 * Sprint 1 시작 시 `/dashboard` → `/home` 리다이렉트로 교체될 예정.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";

const KEY = "phonara:dashboard-migration-banner:v1";

export default function RoutingMigrationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (localStorage.getItem(KEY) === "dismissed") return;
      setShow(true);
    } catch { /* */ }
  }, []);

  if (!show) return null;

  return (
    <div className="container py-2">
      <div className="rounded-xl border border-[hsl(var(--gold)/.4)] bg-gradient-to-r from-[hsl(var(--gold)/.08)] to-[hsl(var(--pink)/.06)] px-4 py-2.5 flex items-center gap-3">
        <Sparkles className="w-4 h-4 text-[hsl(var(--gold))] shrink-0" strokeWidth={1.8} />
        <div className="text-sm text-foreground/90 flex-1 min-w-0">
          <span className="font-bold">새 홈이 열렸어요.</span>{" "}
          <span className="text-muted-foreground">더 간단하게 — 한 화면, 4탭.</span>
        </div>
        <Link
          to="/home"
          className="inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--gold))] hover:underline"
        >
          새 홈 가기 <ArrowRight className="w-3 h-3" />
        </Link>
        <button
          aria-label="닫기"
          onClick={() => {
            try { localStorage.setItem(KEY, "dismissed"); } catch { /* */ }
            setShow(false);
          }}
          className="text-muted-foreground hover:text-foreground transition press"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
