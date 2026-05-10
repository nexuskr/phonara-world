import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";
import { ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  factorId: string;
  onClose: () => void;
  onVerified: () => void;
}

/**
 * AAL2 step-up: prompts the user for their TOTP code to elevate the
 * current session before sensitive actions (admin, withdraw).
 */
export default function MfaChallengeDialog({ open, factorId, onClose, onVerified }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify() {
    if (code.length !== 6) return;
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
      if (error) throw error;
      notify.success("강력 인증 완료");
      setCode("");
      onVerified();
    } catch (e: any) {
      notify.error("인증 실패", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            2단계 인증
          </DialogTitle>
          <DialogDescription>
            등록한 인증 앱에서 6자리 코드를 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6자리 코드"
            className="text-center text-2xl tracking-[0.5em] font-bold"
            autoFocus
          />
          <Button onClick={verify} disabled={busy || code.length !== 6} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
