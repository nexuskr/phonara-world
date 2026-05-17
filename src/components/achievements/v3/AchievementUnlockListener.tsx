// Pass 2 — 전역 unlock 리스너. achievement_progress INSERT/UPDATE에서
// unlocked_at 이 새로 채워지면 토스트 + 폭죽. App 루트에 한 번만 마운트.
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWalletChannel } from "@pkg/realtime";
import { notify } from "@/lib/notify";

const LevelUpFireworks = lazy(() => import("./LevelUpFireworks"));

type CatalogLite = { id: string; title: string; reward_phon: number; icon: string };

export default function AchievementUnlockListener() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fireworks, setFireworks] = useState<{ title: string; subtitle?: string } | null>(null);
  const catalogRef = useRef<Map<string, CatalogLite>>(new Map());
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    void supabase
      .from("achievement_catalog")
      .select("id, title, reward_phon, icon")
      .then(({ data }) => {
        if (Array.isArray(data)) {
          catalogRef.current = new Map(data.map((r) => [r.id, r as CatalogLite]));
        }
      });
  }, [userId]);

  useWalletChannel({
    key: userId ? `achv-unlock:${userId}` : "achv-unlock:anon",
    enabled: !!userId,
    bindings: userId
      ? [{ event: "*", schema: "public", table: "achievement_progress", filter: `user_id=eq.${userId}` }]
      : [],
    onEvent: (payload) => {
      const row = (payload.new ?? {}) as { achievement_id?: string; unlocked_at?: string | null };
      if (!row.achievement_id || !row.unlocked_at) return;
      const key = `${row.achievement_id}:${row.unlocked_at}`;
      if (seenRef.current.has(key)) return;
      seenRef.current.add(key);
      const meta = catalogRef.current.get(row.achievement_id);
      const title = meta?.title ?? row.achievement_id;
      const reward = meta?.reward_phon ?? 0;
      notify.success(`🏆 새로운 업적 — ${title}`, {
        description: `${reward.toLocaleString()} PHON 보상 준비 완료 — 업적 탭에서 수령하세요`,
        duration: 5000,
      });
      setFireworks({
        title: `👑 폐하의 위엄이 한 단계 더 깊어졌습니다`,
        subtitle: title,
      });
    },
  });

  return (
    <Suspense fallback={null}>
      <LevelUpFireworks
        open={!!fireworks}
        title={fireworks?.title ?? ""}
        subtitle={fireworks?.subtitle}
        onClose={() => setFireworks(null)}
      />
    </Suspense>
  );
}
