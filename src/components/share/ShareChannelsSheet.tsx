import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CHANNEL_META, shareAndClaim, type ShareChannel } from "@/lib/share/channels";
import { buildShareCardUrl, buildShareLandingUrl, type ShareKind } from "@/lib/share/shareCardUrl";
import { G } from "@/lib/glossary";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind?: ShareKind;
  amount?: number;
  nick?: string;
  referralCode?: string;
  onClaimed?: (channel: ShareChannel, amount: number) => void;
}

// Kakao SDK 연동은 별도 스프린트에서 처리 — 현재는 카카오스토리/X/Threads/FB/Telegram/Instagram 6채널.
const ORDER: ShareChannel[] = ["kakaostory", "x", "threads", "facebook", "telegram", "instagram"];

export default function ShareChannelsSheet({
  open,
  onOpenChange,
  kind = "bigwin",
  amount = 0,
  nick = "익명",
  referralCode,
  onClaimed,
}: Props) {
  const url = useMemo(() => buildShareLandingUrl(referralCode), [referralCode]);
  const imageUrl = useMemo(
    () => buildShareCardUrl({ kind, amount, nick }),
    [kind, amount, nick],
  );
  const text = useMemo(
    () =>
      amount > 0
        ? `Phonara에서 ${amount.toLocaleString()} PHON 받았어요. 무료로 시작해 보세요!`
        : "Phonara — 무료로 시작해 매일 PHON 받는 곳",
    [amount],
  );

  async function handle(ch: ShareChannel) {
    const res = await shareAndClaim(ch, { url, text, imageUrl });
    if (res.ok && res.amount && !res.already_claimed) onClaimed?.(ch, res.amount);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-card border-t border-primary/30 rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl font-black text-foreground">
            {G.earnShareSheetTitle}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {G.earnShareSheetSub}
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {ORDER.slice(0, 6).map((ch) => {
            const m = CHANNEL_META[ch];
            return (
              <button
                key={ch}
                onClick={() => handle(ch)}
                className={`min-h-[88px] rounded-2xl bg-gradient-to-br ${m.accent} text-white font-bold flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition shadow-lg`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-xs">{m.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handle("instagram")}
          className={`mt-3 w-full min-h-[64px] rounded-2xl bg-gradient-to-r ${CHANNEL_META.instagram.accent} text-white font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg`}
        >
          <span className="text-xl">{CHANNEL_META.instagram.emoji}</span>
          {CHANNEL_META.instagram.label} · {G.earnShareInstagramHint}
        </button>

        <p className="mt-4 text-[11px] text-muted-foreground text-center">
          {G.earnShareSub}
        </p>
      </SheetContent>
    </Sheet>
  );
}
