import { Navigate } from "react-router-dom";
// /quests → /missions 통합 (탭: 매일 출석)
export default function Quests() {
  return <Navigate to="/missions?tab=daily" replace />;
}
