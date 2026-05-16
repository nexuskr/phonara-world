import { useMemo } from "react";
import { motion } from "framer-motion";
import { UserPlus, Copy, MessageCircle, Share2 } from "lucide-react";
import { notify } from "@/lib/notify";

interface Props {
  code: string;
  invited: number;
  earnedTotal: number;
}

export default function ReferralCard({ code, invited, earnedTotal }: Props) {
  const link = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/?ref=${code || ""}`;
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      notify.success("초대 링크가 복사됐어요");
    } catch {
      notify.error("복사에 실패했어요");
    }
  };

  const shareKakao = () => {
    const msg = encodeURIComponent(`Phonara 초대 링크: ${link}`);
    window.open(`sms:?body=${msg}`, "_blank");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Phonara", text: "Phonara 같이 해요", url: link });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="rounded-2xl border border-accent/30 bg-card p-5 flex flex-col gap-4"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </span>
          <div>
            <div className="text-base font-bold text-foreground">친구 초대</div>
            <div className="text-xs text-muted-foreground">친구 가입 +200 · 첫 입금 양쪽 +2,000</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-background/50 border border-border/40 p-3 text-center">
          <div className="text-[10px] text-muted-foreground">초대 누적</div>
          <div className="text-xl font-black text-foreground tabular-nums">{invited}</div>
        </div>
        <div className="rounded-xl bg-background/50 border border-border/40 p-3 text-center">
          <div className="text-[10px] text-muted-foreground">받은 PHON</div>
          <div className="text-xl font-black text-primary tabular-nums">
            {Number(earnedTotal).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-2.5">
        <code className="flex-1 text-sm font-mono font-bold text-foreground truncate">
          {code || "코드 생성 중…"}
        </code>
        <button
          onClick={copy}
          className="h-9 px-3 rounded-lg text-xs font-bold bg-muted/40 hover:bg-muted/60 transition inline-flex items-center gap-1"
        >
          <Copy className="w-3.5 h-3.5" /> 복사
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={shareKakao}
          className="h-12 rounded-xl font-bold text-sm bg-secondary/20 text-secondary-foreground border border-secondary/40 active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
        >
          <MessageCircle className="w-4 h-4" /> 문자/카톡
        </button>
        <button
          onClick={shareNative}
          className="h-12 rounded-xl font-bold text-sm bg-primary text-primary-foreground active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
        >
          <Share2 className="w-4 h-4" /> 공유하기
        </button>
      </div>
    </motion.div>
  );
}
