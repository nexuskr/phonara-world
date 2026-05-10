import { Link } from "react-router-dom";
import { useMfaLevel } from "@/hooks/use-mfa-level";
import { ShieldAlert, ShieldCheck } from "lucide-react";

/**
 * Banner shown on /admin to nudge admins toward AAL2.
 * Non-blocking during rollout window — will harden to a full gate later.
 */
export default function AdminAal2Banner() {
  const { loading, isAal2, hasFactor } = useMfaLevel();

  if (loading || isAal2) return null;

  return (
    <div className={`rounded-xl border p-3 flex items-start gap-3 text-sm ${
      hasFactor ? "border-accent/40 bg-accent/5" : "border-destructive/40 bg-destructive/5"
    }`}>
      {hasFactor ? (
        <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
      ) : (
        <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <div className="font-bold">
          {hasFactor ? "이번 세션은 AAL2가 아닙니다" : "관리자 2단계 인증 미설정"}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {hasFactor
            ? "민감 작업 시 등록한 인증 앱 코드 입력이 요구됩니다."
            : "최고 권한 보호를 위해 TOTP 인증 앱을 등록해주세요."}
        </div>
      </div>
      <Link
        to="/security/totp"
        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition shrink-0"
      >
        {hasFactor ? "재인증" : "지금 등록"}
      </Link>
    </div>
  );
}
