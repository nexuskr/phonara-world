import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Upload, FileSignature, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  level: 1 | 2 | 3;
  onClose: () => void;
  onApproved?: () => void;
  /** Preview-only mode: shows the verification UI but never submits. */
  mode?: "live" | "preview";
}

export default function AMLGate({ open, level, onClose, onApproved }: Props) {
  const { t } = useTranslation("wallet");
  const [uploading, setUploading] = useState(false);
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [docSigned, setDocSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSelfie(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "파일이 너무 큽니다 (최대 8MB)", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/selfie-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("aml").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) {
      toast({ title: "업로드 실패", description: error.message, variant: "destructive" });
      return;
    }
    setSelfiePath(path);
    toast({ title: "셀카 업로드 완료" });
  }

  async function submit() {
    if (level >= 2 && !selfiePath) {
      toast({ title: "셀카가 필요합니다", variant: "destructive" }); return;
    }
    if (level === 3 && !docSigned) {
      toast({ title: "서류 동의가 필요합니다", variant: "destructive" }); return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_aml_verification", {
      _level: level,
      _selfie_path: selfiePath,
      _doc_signed: docSigned,
      _metadata: {},
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "제출 실패", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as any;
    if (r?.auto_approved) {
      toast({ title: "✓ 자동 승인 완료" });
      onApproved?.();
    } else {
      toast({ title: "제출 완료", description: "검토 후 승인됩니다 (최대 24시간)." });
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {t("amlTitle")}
          </DialogTitle>
          <DialogDescription>{t("amlBlocked", { level })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-border/50 p-3">
            <div className="font-bold mb-1">
              {level === 1 ? t("amlLevel1") : level === 2 ? t("amlLevel2") : t("amlLevel3")}
            </div>
            <p className="text-xs text-muted-foreground">
              {level === 1 && "기본 PIN/인증번호로 즉시 통과됩니다."}
              {level === 2 && "본인 얼굴이 잘 보이는 셀카 1장을 업로드해 주세요."}
              {level === 3 && "셀카 + 자금세탁방지(AML) 서류 동의가 필요합니다."}
            </p>
          </div>

          {level >= 2 && (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">셀카 업로드</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleSelfie}
                  disabled={uploading}
                  className="text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:font-bold"
                />
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {selfiePath && !uploading && <Upload className="w-4 h-4 text-emerald-500" />}
              </div>
            </label>
          )}

          {level === 3 && (
            <label className="flex items-start gap-2 rounded-lg border border-border/50 p-3 cursor-pointer hover:border-primary/50 transition">
              <input
                type="checkbox"
                checked={docSigned}
                onChange={(e) => setDocSigned(e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <FileSignature className="w-3.5 h-3.5" /> 자금세탁방지 동의
                </div>
                <p className="text-muted-foreground mt-0.5">
                  자금 출처가 합법적이며 본인 명의 계좌로만 출금함을 확인합니다. 허위 시 출금 거절·계정 정지·법적 책임이 따를 수 있습니다.
                </p>
              </div>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>취소</Button>
          <Button onClick={submit} disabled={submitting || uploading}>
            {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {t("amlGoVerify")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
