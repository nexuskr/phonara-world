/**
 * @pkg/ui/nav/TopBar — v14.0 TopBar alias.
 * 기존 `PhonaraTopBar` 를 표준 진입점으로 노출. UI는 그대로,
 * 미래에 패키지로 분리될 때 import 경로가 바뀌지 않도록 한 겹 감싼다.
 */
import PhonaraTopBar from "@/components/nav/PhonaraTopBar";

export default function TopBar() {
  return <PhonaraTopBar />;
}
