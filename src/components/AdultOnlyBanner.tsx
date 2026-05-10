import { ShieldAlert } from "lucide-react";

interface AdultOnlyBannerProps {
  className?: string;
}

/**
 * 만 19세 이상 성인 전용 고정 배너.
 * ToS/Privacy/Risk/Footer/Login/Onboarding/Packages 페이지 상단에 노출.
 */
export function AdultOnlyBanner({ className = "" }: AdultOnlyBannerProps) {
  return (
    <div
      role="note"
      aria-label="성인 전용 안내"
      className={
        "flex items-center justify-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground " +
        className
      }
    >
      <ShieldAlert className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span>본 서비스는 만 19세 이상 성인만 이용 가능합니다.</span>
    </div>
  );
}

export default AdultOnlyBanner;
