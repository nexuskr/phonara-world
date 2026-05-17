// Pass 2 — confirm + celebrate boost. Fires LevelUpFireworks via parent.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AchievementRow } from "@/hooks/use-achievements-v3";

type Props = {
  row: AchievementRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  busy: boolean;
};

export default function AchievementClaimDialog({ row, open, onOpenChange, onConfirm, busy }: Props) {
  if (!row) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>{row.icon || "🏆"}</span>
            <span>{row.title}</span>
          </DialogTitle>
          <DialogDescription className="break-keep">{row.description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-center">
          <div className="text-xs text-amber-200/80">수령 보상</div>
          <div className="text-2xl font-imperial font-black text-amber-300 mt-0.5">
            {row.reward_phon.toLocaleString()} PHON
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            나중에
          </Button>
          <Button
            className="bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 hover:from-amber-400 hover:to-yellow-300"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "수령 중…" : "지금 수령"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
