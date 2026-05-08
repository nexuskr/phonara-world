import { useTranslation } from "react-i18next";

/**
 * 공용 Disclaimer 컴포넌트 — Packages, Simulator, Paywall, Withdraw, BoostHero, CommandHero 등
 * 금융 관련 모든 화면 하단에 고정으로 노출. 키워드 "보장/확정/평생" 없이 시뮬레이션 명시.
 */
export default function Disclaimer({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "compact" | "withdraw";
  className?: string;
}) {
  const { i18n } = useTranslation();
  const ko = i18n.language?.startsWith("ko");

  const text =
    variant === "compact"
      ? ko
        ? "*사전 공지된 30일 스케줄 기반 시뮬레이션. 실제 결과는 활동·시장·정책에 따라 달라질 수 있습니다."
        : "*Simulation based on pre-disclosed 30-day schedule. Actual results may vary."
      : variant === "withdraw"
      ? ko
        ? "*출금 처리 시간은 큐 상태·검증·은행 영업시간에 따라 달라질 수 있습니다. Sovereign 등급은 우선 큐로 처리되지만 즉시 처리를 의미하지 않습니다."
        : "*Withdrawal time depends on queue, verification and bank hours. Sovereign tier uses a priority queue but is not instant."
      : ko
      ? "*본 화면의 모든 수치는 사전 공지된 30일 스케줄 기반 시뮬레이션이며, 실제 결과는 활동·시장·정책에 따라 달라질 수 있습니다. 투자 권유나 수익 보장이 아닙니다. 부정행위 적발 시 보상 회수 및 계정 동결될 수 있습니다."
      : "*All figures shown are simulations based on the pre-disclosed 30-day schedule. Actual results may vary by activity, market and policy. This is not investment advice or a guaranteed return. Abuse triggers clawback and account freeze.";

  return (
    <p
      className={`text-[10px] leading-relaxed text-muted-foreground/80 break-keep px-4 py-3 ${className}`}
      role="note"
    >
      {text}
    </p>
  );
}
