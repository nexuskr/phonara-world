import { useTranslation } from "react-i18next";

/**
 * Viral incentive 1단계 한정 고지문. /viral 페이지 및 viral 관련 컴포넌트 하단에 항시 노출.
 *
 * 잠금 원칙(plan v3.3):
 *  - 1단계 한정 (depth=1): 본인 추천 외에는 인센티브 없음
 *  - 회사 매출 분배 아님 (1회성 마케팅 인센티브)
 *  - "보류/지연/예약" 어휘 금지 — 권리 미생성 원칙
 */
export default function IncentiveDisclosure({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "compact";
  className?: string;
}) {
  const { i18n } = useTranslation();
  const ko = i18n.language?.startsWith("ko");

  const text =
    variant === "compact"
      ? ko
        ? "*1단계 한정 1회성 마케팅 인센티브입니다. 회사 매출 분배가 아니며, 다단계 구조가 아닙니다."
        : "*Single-tier one-time marketing incentive. Not a revenue share; not a multi-level structure."
      : ko
      ? "*본 인센티브는 본인이 직접 추천한 사용자(1단계)에 한해 지급되는 1회성 마케팅 인센티브입니다. 회사 매출의 분배가 아니며, 다단계 구조가 아닙니다. 일부 단계는 인센티브 프로그램에 포함되지 않을 수 있으며, 정책 변경 시 과거 이벤트에 소급 적용되지 않습니다."
      : "*This incentive is a one-time marketing incentive granted only to users you directly invited (single tier). It is not a share of company revenue and is not a multi-level structure. Some stages may not be part of the incentive program; policy changes are never applied retroactively to past events.";

  return (
    <p
      className={`text-[10px] leading-relaxed text-muted-foreground/80 break-keep px-4 py-3 ${className}`}
      role="note"
    >
      {text}
    </p>
  );
}
