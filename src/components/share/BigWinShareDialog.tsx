import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Instagram, Music2, Youtube, X as XIcon, MessageCircle, Globe, Download, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { CHANNEL_INTENT, type BigWinDetail } from "@/lib/bigwinShare";
import type { ShareChannel } from "@/hooks/use-earn-hub";

interface Props {
  open: boolean;
  onClose: () => void;
  detail: BigWinDetail | null;
}

const CHANNELS: { id: ShareChannel; label: string; Icon: any }[] = [
  { id: "instagram", label: "Insta", Icon: Instagram },
  { id: "tiktok",    label: "TikTok", Icon: Music2 },
  { id: "youtube",   label: "Shorts", Icon: Youtube },
  { id: "x",         label: "X",      Icon: XIcon },
  { id: "naver",     label: "Naver",  Icon: Globe },
  { id: "kakao",     label: "Kakao",  Icon: MessageCircle },
  { id: "line",      label: "LINE",   Icon: MessageCircle },
  { id: "copy",      label: "저장",   Icon: Download },
];

function fmt(n: number) { return Number(n || 0).toLocaleString(); }

const RARITY_STROKE: Record<string, string> = {
  common: "rgba(148,163,184,0.7)",
  rare: "rgba(56,189,248,0.85)",
  epic: "rgba(244,114,182,0.9)",
  legendary: "rgba(250,204,21,0.95)",
};

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawAvatarOverlay(
  ctx: CanvasRenderingContext2D,
  avatar: { image_url?: string | null; emoji?: string | null; rarity: string },
  img: HTMLImageElement | null,
) {
  const cx = 180, cy = 1170, r = 96;
  ctx.save();
  // ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.strokeStyle = RARITY_STROKE[avatar.rarity] ?? RARITY_STROKE.common;
  ctx.lineWidth = 6;
  ctx.stroke();
  // clip circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  // bg
  ctx.fillStyle = "#0a0612";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else if (avatar.emoji) {
    ctx.fillStyle = "#fff";
    ctx.font = "120px 'Pretendard', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(avatar.emoji, cx, cy + 6);
  }
  ctx.restore();
}

function drawCard(canvas: HTMLCanvasElement, detail: BigWinDetail, nickname: string) {
  const W = 1080, H = 1350;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background — dark gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0a0612");
  bg.addColorStop(0.5, "#160a24");
  bg.addColorStop(1, "#08040f");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Gold ring
  ctx.strokeStyle = "rgba(241,196,15,0.35)";
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // Brand wordmark
  ctx.fillStyle = "#f1c40f";
  ctx.font = "900 56px 'Pretendard', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PHONARA", W / 2, 160);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 28px 'Pretendard', system-ui, sans-serif";
  ctx.fillText("매일 무료로 돈 버는 곳", W / 2, 210);

  // BIG WIN
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "800 48px 'Pretendard', system-ui, sans-serif";
  ctx.fillText("BIG WIN!", W / 2, 420);

  // Amount
  const amount = `+${fmt(detail.amount)}`;
  const grad = ctx.createLinearGradient(0, 500, 0, 760);
  grad.addColorStop(0, "#fde68a");
  grad.addColorStop(1, "#f59e0b");
  ctx.fillStyle = grad;
  ctx.font = "900 200px 'Pretendard', system-ui, sans-serif";
  ctx.fillText(amount, W / 2, 720);

  ctx.fillStyle = "#f472b6";
  ctx.font = "800 56px 'Pretendard', system-ui, sans-serif";
  ctx.fillText(detail.symbol || "PHON", W / 2, 800);

  // Nickname
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "700 44px 'Pretendard', system-ui, sans-serif";
  ctx.fillText(`@${nickname}`, W / 2, 980);

  // Date
  const d = new Date();
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "500 32px 'Pretendard', system-ui, sans-serif";
  ctx.fillText(date, W / 2, 1040);

  // CTA bottom
  ctx.fillStyle = "#f1c40f";
  ctx.fillRect(160, 1180, W - 320, 100);
  ctx.fillStyle = "#0a0612";
  ctx.font = "900 44px 'Pretendard', system-ui, sans-serif";
  ctx.fillText("phonara.world / +500 PHON", W / 2, 1245);
}

export default function BigWinShareDialog({ open, onClose, detail }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nickname, setNickname] = useState("Player");
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!open || !detail) return;
    (async () => {
      let nick = "Player";
      try {
        const { data: { user } } = await supabase.auth.getUser();
        nick = (detail.nickname || user?.user_metadata?.nickname || user?.email?.split("@")[0] || "Player").slice(0, 16);
      } catch { /* */ }
      setNickname(nick);

      // Try to fetch equipped avatar (silent fail).
      let avatar: { image_url?: string | null; emoji?: string | null; rarity: string } | null = null;
      let avatarImg: HTMLImageElement | null = null;
      try {
        const { data } = await supabase.rpc("get_my_equipped_avatar");
        const av = (data as any)?.avatar;
        if (av) {
          avatar = { image_url: av.image_url, emoji: av.emoji, rarity: av.rarity };
          if (av.image_url) avatarImg = await loadImage(av.image_url);
        }
      } catch { /* */ }

      requestAnimationFrame(() => {
        const c = canvasRef.current;
        if (!c) return;
        drawCard(c, detail, nick);
        if (avatar) {
          const ctx = c.getContext("2d");
          if (ctx) drawAvatarOverlay(ctx, avatar, avatarImg);
        }
        try { setDataUrl(c.toDataURL("image/png")); } catch { /* */ }
      });
    })();
  }, [open, detail]);

  const handleChannel = useCallback(async (ch: ShareChannel) => {
    if (!detail) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/?ref=share_${ch}` : "https://phonara.world";
    const text = `Phonara에서 +${fmt(detail.amount)} ${detail.symbol || "PHON"} 적중!`;

    // Try native share first
    if (ch === "copy") {
      try {
        if (dataUrl) {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `phonara-bigwin-${Date.now()}.png`;
          a.click();
        }
      } catch { /* */ }
    } else {
      const intent = CHANNEL_INTENT[ch];
      const target = intent ? intent(url, text) : null;
      if (target) {
        window.open(target, "_blank", "noopener,noreferrer");
      } else if (navigator.share) {
        try {
          await navigator.share({ title: "Phonara BIG WIN", text, url });
        } catch { /* user cancelled */ }
      } else {
        try { await navigator.clipboard.writeText(`${text} ${url}`); notify.success("내용이 복사됐어요"); } catch { /* */ }
      }
    }

    const { data, error } = await supabase.rpc("claim_share_reward" as any, { _channel: ch });
    if (error) { notify.fail("공유 보상 실패", error); return; }
    const d = data as any;
    if (d?.ok && !d?.already_claimed) notify.success(`+${fmt(d.amount)} PHON 공유 보상`);
    else if (d?.already_claimed) notify.info("이 채널은 오늘 이미 받았어요");
  }, [detail, dataUrl]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 bg-card border-primary/30 overflow-hidden">
        <DialogTitle className="sr-only">BIG WIN 공유</DialogTitle>
        <DialogDescription className="sr-only">방금 큰 승리를 8개 채널에 공유하고 +200 PHON씩 받으세요.</DialogDescription>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col"
            >
              <div className="px-5 pt-5 pb-3">
                <div className="text-[10px] tracking-[0.3em] font-black text-primary uppercase">BIG WIN</div>
                <div className="font-bold text-foreground text-lg mt-1">방금 +{fmt(detail?.amount ?? 0)} 적중!</div>
                <div className="text-xs text-muted-foreground">8개 채널 공유 시 채널당 +200 PHON</div>
              </div>

              <div className="px-5 pb-4">
                <div className="aspect-[4/5] rounded-xl overflow-hidden border border-border/60 bg-background/40">
                  <canvas ref={canvasRef} className="w-full h-full block" />
                </div>
              </div>

              <div className="px-5 pb-5 grid grid-cols-4 gap-2">
                {CHANNELS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleChannel(id)}
                    className="h-16 rounded-xl border border-border/60 bg-background/40 hover:bg-background/60 active:scale-[0.96] transition flex flex-col items-center justify-center gap-1"
                  >
                    <Icon className="w-5 h-5 text-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground">{label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={async () => {
                  if (!dataUrl) return;
                  try { await navigator.clipboard.writeText(`${typeof window !== "undefined" ? window.location.origin : ""}/?ref=share`); } catch { /* */ }
                  notify.info("이미지 저장 후 원하는 곳에 붙여넣어 보세요");
                }}
                className="mx-5 mb-5 h-12 rounded-xl text-xs font-bold text-muted-foreground border border-dashed border-border/60 inline-flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> 링크 복사
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
