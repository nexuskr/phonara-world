// Pass 2 — 4 카테고리 탭 + 트리 시각화 + 실시간 진행도.
import { useMemo, useState, lazy, Suspense } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import AchievementCard from "./AchievementCard";
import { useAchievementsV3, type AchievementRow, type CategoryKey } from "@/hooks/use-achievements-v3";
import { useClaimAchievement } from "@/hooks/use-claim-achievement";

const AchievementClaimDialog = lazy(() => import("./AchievementClaimDialog"));
const LevelUpFireworks = lazy(() => import("./LevelUpFireworks"));

const CATEGORIES: { key: CategoryKey; label: string; emoji: string }[] = [
  { key: "trade", label: "트레이딩", emoji: "📈" },
  { key: "stake", label: "스테이킹", emoji: "🌾" },
  { key: "empire", label: "제국", emoji: "👑" },
  { key: "social", label: "소셜", emoji: "🤝" },
  { key: "daily", label: "데일리", emoji: "🌅" },
];

export default function AchievementTree() {
  const { rows, loading, byCategory, unlockedCount, claimableCount, completion } = useAchievementsV3();
  const { claim, claiming } = useClaimAchievement();
  const [tab, setTab] = useState<CategoryKey>("trade");
  const [dialogRow, setDialogRow] = useState<AchievementRow | null>(null);
  const [fireworks, setFireworks] = useState<{ title: string; subtitle?: string } | null>(null);

  const categorized = useMemo(() => {
    return Object.fromEntries(CATEGORIES.map((c) => [c.key, byCategory(c.key)])) as Record<CategoryKey, AchievementRow[]>;
  }, [byCategory]);

  const handleClaim = async () => {
    if (!dialogRow) return;
    const res = await claim(dialogRow.id);
    if (res.ok) {
      const r = dialogRow;
      setDialogRow(null);
      setFireworks({
        title: `🏆 새로운 업적 — ${r.title}`,
        subtitle: `${res.reward_phon.toLocaleString()} PHON 지급됐습니다`,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="달성" value={`${unlockedCount} / ${rows.length}`} />
        <Stat label="수령 대기" value={claimableCount} highlight={claimableCount > 0} />
        <Stat label="완성도" value={`${completion}%`} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CategoryKey)}>
        <TabsList className="grid grid-cols-5 w-full">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.key} value={c.key} className="text-xs sm:text-sm">
              <span className="mr-1" aria-hidden>{c.emoji}</span>
              <span className="hidden sm:inline">{c.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((c) => (
          <TabsContent key={c.key} value={c.key} className="mt-4">
            {loading ? (
              <LoadingList rows={4} />
            ) : categorized[c.key]?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categorized[c.key].map((row) => (
                  <AchievementCard
                    key={row.id}
                    row={row}
                    claiming={claiming === row.id}
                    onClaim={(r) => setDialogRow(r)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="아직 업적이 없습니다" description="곧 새로운 도전이 열립니다." />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Suspense fallback={null}>
        <AchievementClaimDialog
          row={dialogRow}
          open={!!dialogRow}
          onOpenChange={(v) => !v && setDialogRow(null)}
          onConfirm={handleClaim}
          busy={!!claiming}
        />
        <LevelUpFireworks
          open={!!fireworks}
          title={fireworks?.title ?? ""}
          subtitle={fireworks?.subtitle}
          onClose={() => setFireworks(null)}
        />
      </Suspense>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={[
      "rounded-2xl border px-3 py-2.5",
      highlight ? "border-amber-400/40 bg-amber-500/10" : "border-border bg-card",
    ].join(" ")}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={["text-lg font-bold", highlight && "text-amber-300"].filter(Boolean).join(" ")}>{value}</div>
    </div>
  );
}
