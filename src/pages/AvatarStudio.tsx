/**
 * AvatarStudio — /avatar/studio
 * 12 슬롯 커스터마이저 + PHON 파츠 구매.
 */
import { useMemo, useState, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Coins, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useOptimizedAvatar } from "@/components/avatar/v3/hooks/useOptimizedAvatar";
import Avatar3D from "@/components/avatar/v3/Avatar3D";
import { SLOT_LABEL, SLOT_ORDER, RARITY_LABEL, RARITY_COLOR, type AvatarSlot, type AvatarPart } from "@/components/avatar/v3/types";

export default function AvatarStudio() {
  const nav = useNavigate();
  const [, startT] = useTransition();
  const { catalog, partsBySlot, loadout, equippedParts, owned, isLoading, refetchAll } = useOptimizedAvatar();
  const [activeSlot, setActiveSlot] = useState<AvatarSlot>("hair");
  const [busy, setBusy] = useState<string | null>(null);

  const list = useMemo(() => partsBySlot.get(activeSlot) ?? [], [partsBySlot, activeSlot]);

  async function handleEquip(p: AvatarPart) {
    setBusy(p.id);
    try {
      const { data, error } = await supabase.rpc("equip_avatar_part" as never, { _slot: p.slot, _part_id: p.id } as never);
      if (error) throw error;
      const d = data as unknown as { ok?: boolean; error?: string };
      if (!d?.ok) throw new Error(d?.error ?? "장착 실패");
      notify.success(`✨ ${p.name} 장착 완료 — 폐하의 위엄이 한층 더 빛납니다.`);
      startT(refetchAll);
    } catch (e) {
      notify.error("지금은 장착이 어렵습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setBusy(null); }
  }

  async function handlePurchase(p: AvatarPart) {
    setBusy(p.id);
    try {
      const { data, error } = await supabase.rpc("purchase_avatar_part" as never, { _part_id: p.id } as never);
      if (error) throw error;
      const d = data as unknown as { ok?: boolean; error?: string; need?: number; have?: number };
      if (!d?.ok) {
        if (d?.error === "insufficient_phon") {
          notify.warning(`PHON 이 부족합니다. (필요 ${Number(d.need).toLocaleString()} / 보유 ${Number(d.have).toLocaleString()})`);
        } else if (d?.error === "already_owned") {
          notify.info("이미 보유한 파츠입니다.");
        } else {
          notify.error("구매가 완료되지 못했습니다.");
        }
        return;
      }
      if (p.rarity === "legendary") {
        notify.success(`👑 ${p.name} — 이건 오직 폐하만이 가질 수 있는 위엄입니다.`);
      } else {
        notify.success(`✨ ${p.name} 획득 완료.`);
      }
      startT(refetchAll);
    } catch {
      notify.error("지금은 구매가 어렵습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setBusy(null); }
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/60">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-2">
          <button onClick={() => nav(-1)} className="p-1 -ml-1 text-muted-foreground" aria-label="뒤로">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-bold tracking-wide">아바타 스튜디오</h1>
          <span className="ml-auto text-[10px] text-muted-foreground">폐하의 영원한 모습</span>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-center">
          <Avatar3D equipped={equippedParts} color={loadout?.color_hex ?? undefined} size={240} />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          이 모습은 오직 당신만의 것 — 폐하의 제국이 오늘도 당신을 기다리고 있습니다.
        </p>
      </section>

      <nav className="max-w-3xl mx-auto px-4 mt-5 overflow-x-auto" aria-label="아바타 슬롯">
        <div className="flex gap-2 min-w-max pb-1">
          {SLOT_ORDER.map((s) => {
            const active = activeSlot === s;
            return (
              <button
                key={s}
                onClick={() => setActiveSlot(s)}
                className={[
                  "px-3 h-9 rounded-full text-xs font-semibold border transition",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border/60 hover:border-primary/60",
                ].join(" ")}
              >
                {SLOT_LABEL[s]}
              </button>
            );
          })}
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-4 mt-4">
        {isLoading ? (
          <LoadingList rows={3} />
        ) : list.length === 0 ? (
          <EmptyState title="이 슬롯에는 아직 파츠가 없습니다." description="곧 새 컬렉션이 도착합니다." />
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {list.map((p) => {
              const isOwned = owned.has(p.id);
              const isEquipped = equippedParts[p.slot]?.id === p.id;
              const ringColor = RARITY_COLOR[p.rarity];
              return (
                <li
                  key={p.id}
                  className="rounded-2xl border bg-card p-3 flex flex-col gap-2"
                  style={{ borderColor: `${ringColor}66` }}
                >
                  <div
                    className="aspect-square rounded-xl flex items-center justify-center text-4xl"
                    style={{
                      background: `radial-gradient(120% 120% at 50% 30%, ${p.color_hex ?? "hsl(var(--muted))"}33, hsl(var(--background)))`,
                      boxShadow: `inset 0 0 0 1px ${ringColor}44`,
                    }}
                  >
                    <span aria-hidden>{p.emoji ?? "✨"}</span>
                  </div>
                  <div className="min-h-[2.5rem]">
                    <div className="text-xs font-bold truncate">{p.name}</div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: ringColor }}>
                      {RARITY_LABEL[p.rarity]}
                    </div>
                  </div>
                  {isEquipped ? (
                    <button disabled className="h-9 rounded-lg bg-primary/20 text-primary text-xs font-semibold inline-flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3" /> 장착 중
                    </button>
                  ) : isOwned ? (
                    <button
                      onClick={() => handleEquip(p)}
                      disabled={busy === p.id}
                      className="h-9 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold"
                    >
                      {busy === p.id ? "장착 중…" : "장착"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchase(p)}
                      disabled={busy === p.id || p.vip_only}
                      className="h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {p.vip_only ? (<><Lock className="w-3 h-3" /> VIP 전용</>)
                        : busy === p.id ? "구매 중…"
                        : (<><Coins className="w-3 h-3" /> {Number(p.price_phon).toLocaleString()} PHON</>)}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
