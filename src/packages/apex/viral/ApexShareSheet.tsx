/**
 * <ApexShareSheet /> — Kakao / Naver Band / X / Web Share / Clipboard.
 * Auto-opens on multiplier ≥ 10× or payout ≥ 50,000 PHON (once per rollId).
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApexSticker } from "./ApexSticker";
import { pickStickerForResult, type StickerMeta } from "./stickers";
import { apexLogShare } from "@/packages/apex/lib/api";
import { notify } from "@/lib/notify";

export interface ApexShareResult {
  rollId: string;
  multiplier: number;
  payoutPhonEq: number;
  streak?: number;
  gameCode?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  result: ApexShareResult | null;
}

const DEDUPE_KEY = (rollId: string) => `apex:shared:${rollId}`;

export function ApexShareSheet({ open, onClose, result }: Props) {
  const [sticker, setSticker] = useState<StickerMeta | null>(null);

  useEffect(() => {
    if (!result) return;
    setSticker(pickStickerForResult({
      multiplier: result.multiplier,
      payoutPhonEq: result.payoutPhonEq,
      streak: result.streak,
    }));
  }, [result]);

  if (!result || !sticker) return null;

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/apex?ref=${encodeURIComponent(result.rollId)}`
    : "https://phonara.world/apex";
  const text = `${sticker.label} · ${sticker.caption}\nPHONARA APEX에서 폭발했습니다!`;

  const markShared = (kind: "kakao" | "band" | "twitter" | "web_share" | "referral") => {
    try { sessionStorage.setItem(DEDUPE_KEY(result.rollId), kind); } catch {}
    void apexLogShare(kind, result.rollId);
  };

  const onKakao = () => {
    const k = (window as any).Kakao;
    if (k?.Share?.sendDefault) {
      k.Share.sendDefault({
        objectType: "text",
        text: `${text}\n${shareUrl}`,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      });
    } else if (navigator.share) {
      void navigator.share({ title: "PHONARA APEX", text, url: shareUrl });
    } else {
      void navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      notify.success("클립보드 복사", { description: "카카오톡에 붙여넣기 하세요." });
    }
    markShared("kakao");
  };

  const onBand = () => {
    const u = `https://band.us/plugin/share?body=${encodeURIComponent(text + "\n" + shareUrl)}&route=${encodeURIComponent(shareUrl)}`;
    window.open(u, "_blank", "noopener,noreferrer,width=520,height=720");
    markShared("band");
  };

  const onTwitter = () => {
    const u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(u, "_blank", "noopener,noreferrer");
    markShared("twitter");
  };

  const onWebShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "PHONARA APEX", text, url: shareUrl }); markShared("web_share"); }
      catch {}
    } else {
      void navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      notify.success("클립보드 복사 완료");
      markShared("web_share");
    }
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
    notify.success("링크 복사 완료");
    markShared("referral");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{sticker.label} 공유하기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <ApexSticker meta={sticker} size={280} />
          <p className="text-sm text-muted-foreground text-center">
            ×{result.multiplier.toFixed(2)} · {Math.floor(result.payoutPhonEq).toLocaleString("ko-KR")} PHON
          </p>
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button onClick={onKakao} className="bg-[#fee500] text-black hover:bg-[#fee500]/90">카카오톡</Button>
            <Button onClick={onBand} className="bg-[#00c73c] hover:bg-[#00c73c]/90">네이버 밴드</Button>
            <Button onClick={onTwitter} variant="outline">X (Twitter)</Button>
            <Button onClick={onWebShare} variant="outline">시스템 공유</Button>
            <Button onClick={onCopy} variant="secondary" className="col-span-2">링크 복사</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function shouldAutoShare(opts: {
  rollId: string;
  multiplier: number;
  payoutPhonEq: number;
}): boolean {
  if (!opts.rollId) return false;
  try {
    if (sessionStorage.getItem(DEDUPE_KEY(opts.rollId))) return false;
  } catch {}
  return opts.multiplier >= 10 || opts.payoutPhonEq >= 50_000;
}
