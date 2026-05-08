import { useState } from "react";
import { Upload, X, Image as ImgIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  userId: string;
  onUploaded?: (path: string | null) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/png", "image/jpeg", "image/webp"];

export default function WithdrawReceiptUpload({ userId, onUploaded }: Props) {
  const [path, setPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(f: File) {
    if (!ACCEPT.includes(f.type)) {
      toast({ title: "이미지만 업로드 가능", description: "PNG / JPG / WEBP", variant: "destructive" });
      return;
    }
    if (f.size > MAX_BYTES) {
      toast({ title: "5MB 이하 파일만 업로드", variant: "destructive" });
      return;
    }
    setBusy(true);
    const ext = f.name.split(".").pop() || "png";
    const key = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("withdraw-receipts").upload(key, f, { upsert: false });
    setBusy(false);
    if (error) {
      toast({ title: "업로드 실패", description: error.message, variant: "destructive" });
      return;
    }
    setPath(key);
    setPreviewUrl(URL.createObjectURL(f));
    onUploaded?.(key);
    toast({ title: "✓ 영수증 첨부 완료" });
  }

  function clear() {
    setPath(null);
    setPreviewUrl(null);
    onUploaded?.(null);
  }

  return (
    <div>
      <div className="text-[10px] tracking-[0.2em] text-muted-foreground mb-2 font-bold uppercase flex items-center gap-1.5">
        <ImgIcon className="w-3 h-3" /> 증빙 스크린샷 (선택)
      </div>
      {!path ? (
        <label className="flex items-center justify-center gap-2 min-h-[56px] rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] cursor-pointer hover:border-primary/70 hover:bg-primary/[0.06] transition press">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-primary" />}
          <span className="text-xs font-bold text-primary">{busy ? "업로드 중..." : "이미지 선택 (PNG/JPG/WEBP, 5MB)"}</span>
          <input
            type="file"
            accept={ACCEPT.join(",")}
            className="hidden"
            disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
          />
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-xl p-3 border border-primary/40 bg-primary/[0.06]">
          {previewUrl && <img src={previewUrl} alt="receipt" className="w-12 h-12 rounded-lg object-cover" />}
          <div className="flex-1 text-[11px] font-mono text-muted-foreground truncate">{path}</div>
          <button onClick={clear} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
