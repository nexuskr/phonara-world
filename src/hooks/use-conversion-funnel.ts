import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * 단계 진입 시 funnel 이벤트 emit.
 * 사용 예: useConversionFunnel("paywall_shown", { package_id });
 */
export function useConversionFunnel(
  step: string,
  props: Record<string, string | number | boolean | null | undefined> = {},
) {
  useEffect(() => {
    track(`funnel_${step}`, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, JSON.stringify(props)]);
}
