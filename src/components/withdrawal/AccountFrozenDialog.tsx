/**
 * PR-P0-4 — AccountFrozenDialog
 *
 * Surfaces account_frozen events globally (toast → AlertDialog upgrade).
 * Listens to `phonara:account-frozen` and shows CS contact + activity link.
 */
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";
import { FROZEN_EVENT } from "@/lib/withdrawal/errors";

export default function AccountFrozenDialog() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState<string>(
    "이상 활동이 감지되어 자동 보호가 적용됐어요. 본인이 한 시도가 아니라면 즉시 고객센터로 문의해 주세요.",
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { description?: string } | undefined;
      if (detail?.description) setDescription(detail.description);
      setOpen(true);
    };
    window.addEventListener(FROZEN_EVENT, handler);
    return () => window.removeEventListener(FROZEN_EVENT, handler);
  }, []);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="border-amber-500/40 bg-gradient-to-b from-background to-amber-950/10">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <AlertDialogTitle>계정이 일시 보호 중입니다</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="leading-relaxed pt-2">
            {description}
            <span className="block mt-3 text-xs text-muted-foreground">
              · 자동 보호는 24시간 후 자동 해제됩니다.
              <br />
              · 본인이 한 시도가 아니라면 비밀번호 변경을 권장합니다.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>닫기</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              window.location.href = "mailto:support@phonara.world?subject=계정 보호 해제 문의";
            }}
            className="bg-amber-500 hover:bg-amber-600"
          >
            고객센터 문의
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
