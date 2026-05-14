/**
 * NftGalleryDialog — pick a main NFT from the user's collection.
 * Shows free-changes-remaining or PHON cost + cooldown.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useMyPower } from "@/hooks/use-my-power";
import { getMainNftStatus, setMainNft, adminGrantSelfNft, type MainNftStatus, invalidateMainNftCache } from "@/lib/mainNft";
import { getNftImage, getRarityRingClass, getNftTypeLabel } from "@/lib/nftImage";
import { notify } from "@/lib/notify";
import { EmptyState } from "@/components/ui/empty-state";
import { Coins, Clock, Sparkles, Shield } from "lucide-react";
import { useDB } from "@/lib/store";
import { cn } from "@/lib/utils";

const ADMIN_SHOWCASE: Array<{ type: "crown" | "emperor" | "founder"; level: "bronze" | "gold" | "diamond" }> = [
  { type: "crown", level: "bronze" }, { type: "crown", level: "gold" }, { type: "crown", level: "diamond" },
  { type: "emperor", level: "bronze" }, { type: "emperor", level: "gold" }, { type: "emperor", level: "diamond" },
  { type: "founder", level: "bronze" }, { type: "founder", level: "gold" }, { type: "founder", level: "diamond" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
}

export default function NftGalleryDialog({ open, onOpenChange, onChanged }: Props) {
  const { t } = useTranslation("profile");
  const { nfts, refresh } = useMyPower();
  const [status, setStatus] = useState<MainNftStatus | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [db] = useDB();
  const isAdmin = !!db.user?.isAdmin;
  const [adminBusy, setAdminBusy] = useState<string | null>(null);

  useEffect(() => { if (open) getMainNftStatus().then(setStatus); }, [open]);

  const cooldownActive =
    status?.cooldown_until && new Date(status.cooldown_until).getTime() > Date.now();
  const cooldownStr = cooldownActive
    ? new Date(status!.cooldown_until!).toLocaleString()
    : null;

  async function adminPick(type: "crown"|"emperor"|"founder", level: "bronze"|"gold"|"diamond") {
    const key = `${type}:${level}`;
    setAdminBusy(key);
    const res = await adminGrantSelfNft(type, level);
    setAdminBusy(null);
    if (!res.ok) { notify.error(res.error ?? "failed"); return; }
    invalidateMainNftCache();
    notify.success(`${type.toUpperCase()} ${level.toUpperCase()} 적용됨`);
    refresh();
    getMainNftStatus().then(setStatus);
    onChanged?.();
  }

  async function pick(nftId: string) {
    if (!status) return;
    if (cooldownActive) {
      notify.error(t("nft.cooldownActive", { until: cooldownStr ?? "" }));
      return;
    }
    setBusyId(nftId);
    const res = await setMainNft(nftId);
    setBusyId(null);
    if (!res.ok) {
      const msg = res.error?.includes("insufficient_phon")
        ? t("nft.insufficientPhon")
        : res.error?.includes("cooldown")
          ? t("nft.cooldownActive", { until: "" })
          : (res.error ?? t("nft.changeError"));
      notify.error(msg);
      return;
    }
    invalidateMainNftCache();
    notify.success(
      res.cost && res.cost > 0
        ? t("nft.changedPaid", { cost: res.cost })
        : t("nft.changedFree", { remaining: res.free_remaining ?? 0 }),
    );
    refresh();
    onChanged?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("nft.galleryTitle")}
          </DialogTitle>
          <DialogDescription>{t("nft.galleryDesc")}</DialogDescription>
        </DialogHeader>

        {status && (
          <div className="flex flex-wrap items-center gap-3 text-xs rounded-lg border border-border/50 bg-card/50 p-3">
            {status.next_cost_phon === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                {t("nft.freeRemaining", { n: status.free_remaining })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                <Coins className="w-3.5 h-3.5" />
                {t("nft.nextCost", { phon: status.next_cost_phon })}
              </span>
            )}
            {cooldownActive && (
              <span className="inline-flex items-center gap-1 text-rose-400">
                <Clock className="w-3.5 h-3.5" />
                {t("nft.cooldownUntil", { until: cooldownStr })}
              </span>
            )}
          </div>
        )}

        {nfts.length === 0 ? (
          <EmptyState title={t("nft.noNftYet")} description={t("nft.earnFirst")} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1">
            {nfts.map((n) => {
              const img = getNftImage(n.type, n.level);
              const isMain = status?.main_nft_id === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => !isMain && pick(n.id)}
                  disabled={isMain || !!busyId}
                  className={cn(
                    "group relative rounded-xl overflow-hidden border border-border/50 bg-card transition-all",
                    isMain && "ring-2 ring-primary",
                    !isMain && "hover:scale-[1.03] hover:border-primary/60",
                    busyId === n.id && "opacity-60",
                  )}
                >
                  <div className={cn("aspect-square overflow-hidden", getRarityRingClass(n.level))}>
                    {img ? (
                      <img src={img} alt={`${n.type} ${n.level}`} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-card/60" />
                    )}
                  </div>
                  <div className="p-2 text-left">
                    <div className="text-xs font-bold uppercase">
                      {getNftTypeLabel(n.type)} <span className="text-muted-foreground">· {n.level}</span>
                    </div>
                    <div className="text-[10px] text-amber-400">+{n.boost_pct}% boost</div>
                  </div>
                  {isMain && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-imperial tracking-widest px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                      {t("nft.currentMain")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {isAdmin && (
          <div className="space-y-2 pt-3 border-t border-border/40">
            <div className="flex items-center gap-2 text-xs">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-imperial tracking-[0.2em] text-amber-400 uppercase">Admin Showcase</span>
              <span className="text-muted-foreground">— 9종 전체 (무료 · 쿨다운 없음)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ADMIN_SHOWCASE.map(({ type, level }) => {
                const key = `${type}:${level}`;
                const img = getNftImage(type, level);
                return (
                  <button
                    key={key}
                    onClick={() => adminPick(type, level)}
                    disabled={!!adminBusy}
                    className={cn(
                      "group relative rounded-xl overflow-hidden border border-amber-500/30 bg-card transition-all hover:scale-[1.03] hover:border-amber-400",
                      adminBusy === key && "opacity-60",
                    )}
                  >
                    <div className={cn("aspect-square overflow-hidden", getRarityRingClass(level))}>
                      {img && <img src={img} alt={key} className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <div className="p-1.5 text-left">
                      <div className="text-[10px] font-bold uppercase">
                        {getNftTypeLabel(type)} · {level}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel", "닫기")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
