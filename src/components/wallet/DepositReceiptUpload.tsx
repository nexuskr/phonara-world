import { useState } from "react";
import { Upload, X, Image as ImgIcon, Loader2 } from "lucide-react";
import { uploadReceipt } from "@/lib/deposits-rpc";
import { notify } from "@/lib/notify";

interface Props {
  onUploaded?: (signedUrl: string | null) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/png", "image/jpeg", "image/webp"];

/**
 * Bank-transfer receipt screenshot uploader for the user-side deposit flow.
 * Uploads to the private `receipts` bucket and returns a 1-year signed URL
 * that the server stores on `deposit_requests.receipt_url`.
 */
export default function DepositReceiptUpload({ onUploaded }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(f: File) {
    if (!ACCEPT.includes(f.type)) {
      notify.error("이미지만 업로드 가능", { description: "PNG / JPG / WEBP" });
      return;
    }
    if (f.size > MAX_BYTES) {
      notify.error("5MB 이하 파일만 업로드");
      return;
    }
    setBusy(true);
    try {
      const signed = await uploadReceipt(f);
      setUrl(signed);
      setPreviewUrl(URL.createObjectURL(f));
      onUploaded?.(signed);
      notify.success("✓ 영수증 첨부 완료", {
        description: "관리자 승인 시 AI가 자동 분석합니다.",
      });
    } catch (e: any) {
      notify.error("업로드 실패", { description: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setUrl(null);
    setPreviewUrl(null);
    onUploaded?.(null);
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.2em] text-muted-foreground mb-2 font-bold uppercase flex items-center gap-1.5">
        <ImgIcon className="w-3 h-3" aria-hidden /> 이체 영수증 스크린샷 (권장)
      </div>
      {!url ? (
        <label className="flex items-center justify-center gap-2 min-h-[56px] rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] cursor-pointer hover:border-primary/70 hover:bg-primary/[0.06] transition press">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Upload className="w-4 h-4 text-primary" aria-hidden />}
          <span className="text-xs font-bold text-primary">
            {busy ? "업로드 중..." : "이미지 선택 (PNG/JPG/WEBP, 5MB)"}
          </span>
          <input
            type="file"
            accept={ACCEPT.join(",")}
            className="hidden"
            disabled={busy}
            aria-label="이체 영수증 이미지 선택"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
          />
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-xl p-3 border border-primary/40 bg-primary/[0.06]">
          {previewUrl && <img src={previewUrl} alt="이체 영수증 미리보기" className="w-12 h-12 rounded-lg object-cover" />}
          <div className="flex-1 text-[11px] font-mono text-muted-foreground truncate">첨부 완료</div>
          <button
            onClick={clear}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition"
            aria-label="영수증 첨부 취소"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-1.5">
        영수증을 첨부하면 평균 승인 시간이 30분 → 5분으로 단축됩니다.
      </p>
    </div>
  );
}
