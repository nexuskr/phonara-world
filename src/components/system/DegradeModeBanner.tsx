/**
 * DegradeModeBanner — Warm King mode (50-70대 친화).
 * Sticky 상단 띠, 큰 글자, Warm Gold + Hot Pink 그라디언트, 닫기 버튼 없음(관리자만 해제).
 */
import { ShieldCheck } from "lucide-react";
import { useDegradeMode } from "@/hooks/use-degrade-mode";
import { g } from "@pkg/core/i18n/glossary";

export function DegradeModeBanner() {
  const { degraded, reason } = useDegradeMode();
  if (!degraded) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] w-full border-b border-gold/40 bg-gradient-to-r from-gold/20 via-gold/10 to-pink/20 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 text-foreground">
        <ShieldCheck className="h-11 w-11 shrink-0 text-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-tight md:text-xl">
            {g("degradeBannerOn")}
          </p>
          <p className="truncate text-sm text-muted-foreground md:text-base">
            {reason ?? g("degradeBannerReasonDefault")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default DegradeModeBanner;
