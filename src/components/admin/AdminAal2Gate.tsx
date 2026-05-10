import { ReactNode, useState } from "react";
import { useMfaLevel } from "@/hooks/use-mfa-level";
import { useStepUp } from "@/hooks/use-step-up";
import StepUpGate from "@/components/security/StepUpGate";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  /** 차단할 민감 탭 ID 집합 — 비어있으면 전체 보호 */
  protectedTabs?: string[];
  currentTab?: string;
  children: ReactNode;
}

/**
 * 관리자 민감 작업 하드 게이트.
 *
 *  - TOTP factor 등록 + AAL2 인증 완료 → 통과
 *  - TOTP factor 등록 + AAL1 → 스텝업 강제 (이 세션 동안 한 번)
 *  - TOTP factor 미등록 → 강력 권고 + 차단 (관리 권한자는 반드시 TOTP 등록)
 */
export default function AdminAal2Gate({ protectedTabs, currentTab, children }: Props) {
  const { loading, isAal2, hasFactor } = useMfaLevel();
  const { requireStepUp, dialogProps } = useStepUp();
  const [elevated, setElevated] = useState(false);

  if (loading) return <>{children}</>;

  const isProtected = !protectedTabs || !currentTab || protectedTabs.includes(currentTab);
  // 보호 대상 아닌 탭은 통과
  if (!isProtected) return <>{children}</>;

  // AAL2 이미 달성 또는 세션 내 스텝업 완료
  if (isAal2 || elevated) return <>{children}</>;

  return (
    <>
      <StepUpGate {...dialogProps} />
      <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-6 sm:p-8 text-center space-y-4">
        {hasFactor ? (
          <ShieldCheck className="w-12 h-12 text-accent mx-auto" />
        ) : (
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
        )}
        <div>
          <h2 className="font-imperial text-xl sm:text-2xl tracking-[0.18em] text-gradient-imperial mb-2">
            관리자 강화 인증 필요
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto break-keep">
            {hasFactor
              ? "이번 탭은 민감 데이터를 다룹니다. 등록된 인증 앱(TOTP) 으로 즉시 재인증해주세요."
              : "관리자 권한 보호를 위해 TOTP 인증 앱 등록이 의무화되어 있습니다. 먼저 인증 앱을 등록해주세요."}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {hasFactor ? (
            <Button
              size="lg"
              onClick={async () => {
                const ok = await requireStepUp("관리자 작업");
                if (ok) setElevated(true);
              }}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              지금 재인증
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link to="/security/totp">
                <ShieldCheck className="w-4 h-4 mr-2" />
                TOTP 등록하러 가기
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
