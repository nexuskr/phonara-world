import { useState } from "react";
import { Share2, Copy, Check, X as XIcon, Music2, Camera, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { shareReplay, replayLanding, type ShareChannel } from "@/lib/crownReplay";
import { notify } from "@/lib/notify";

interface Props {
  token: string;
  variant?: "compact" | "full";
  className?: string;
}

const channels: Array<{ id: ShareChannel; label: string; Icon: any; tone: string }> = [
  { id: "x", label: "X", Icon: XIcon, tone: "text-foreground" },
  { id: "tiktok", label: "TikTok", Icon: Music2, tone: "text-secondary" },
  { id: "reels", label: "Reels", Icon: Camera, tone: "text-primary" },
  { id: "kakao", label: "Kakao", Icon: MessageCircle, tone: "text-gold" },
];

export function ShareReplayButton({ token, variant = "compact", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handle(ch: ShareChannel) {
    await shareReplay(token, ch);
    if (ch === "tiktok" || ch === "reels") {
      notify.success("링크 복사 완료", { description: `${ch === "tiktok" ? "TikTok" : "Instagram"} 업로드 페이지에서 붙여넣으세요.` });
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(replayLanding(token, "copy"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    notify.success("Replay 링크 복사됨");
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gold/90 to-gold/70 text-background font-black text-sm shadow-[0_0_24px_-6px_hsl(var(--gold)/0.7)] active:scale-95 transition"
      >
        <Share2 className="w-4 h-4" />
        {variant === "full" ? "제국에 자랑하기" : "공유"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            className="absolute right-0 mt-2 z-50 min-w-[240px] glass-strong rounded-2xl border border-gold/30 p-2 shadow-2xl"
            onMouseLeave={() => setOpen(false)}
          >
            <div className="grid grid-cols-2 gap-1">
              {channels.map(({ id, label, Icon, tone }) => (
                <button
                  key={id}
                  onClick={() => handle(id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition text-sm font-semibold"
                >
                  <Icon className={`w-4 h-4 ${tone}`} />
                  {label}
                </button>
              ))}
              <button
                onClick={handleCopy}
                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 active:scale-95 transition text-sm font-semibold text-primary"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "복사됨" : "링크 복사"}
              </button>
            </div>
            <div className="mt-2 text-[10px] text-center text-muted-foreground">
              공유할수록 더 큰 Crown이 당신을 기다립니다 👑
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ShareReplayButton;
