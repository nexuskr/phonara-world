/**
 * useOptimizedAvatar — Avatar v3 데이터 훅.
 * 카탈로그(공개) + 내 loadout + 보유 파츠를 묶어서 반환.
 * - 카탈로그: 60s stale (SWR 가능, 단순화로 react-query만 사용).
 * - loadout / owned: realtime 이 아니라 RPC + 폴링 30s + 변경 시 invalidate.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AvatarPart, AvatarLoadout, AvatarSlot } from "../types";

const KEY_CATALOG = ["avatar-v3", "catalog"];
const KEY_LOADOUT = ["avatar-v3", "loadout"];
const KEY_OWNED = ["avatar-v3", "owned"];

export function useOptimizedAvatar() {
  const qc = useQueryClient();

  const catalogQ = useQuery<AvatarPart[]>({
    queryKey: KEY_CATALOG,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_avatar_parts_catalog" as never);
      if (error) throw error;
      return (data as unknown as AvatarPart[]) ?? [];
    },
  });

  const loadoutQ = useQuery<AvatarLoadout>({
    queryKey: KEY_LOADOUT,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_avatar_loadout" as never);
      if (error) throw error;
      const d = (data as unknown as Record<string, unknown>) || {};
      return {
        slots: (d.slots as AvatarLoadout["slots"]) ?? {},
        color_hex: (d.color_hex as string | null) ?? null,
        pos_x: typeof d.pos_x === "number" ? d.pos_x : 0,
        pos_y: typeof d.pos_y === "number" ? d.pos_y : 0,
        anim_phase: typeof d.anim_phase === "number" ? d.anim_phase : 0,
      };
    },
  });

  const ownedQ = useQuery<Set<string>>({
    queryKey: KEY_OWNED,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_avatar_parts_owned" as never)
        .select("part_id");
      if (error) throw error;
      const rows = (data as unknown as { part_id: string }[]) ?? [];
      return new Set(rows.map((r) => r.part_id));
    },
  });

  const partsBySlot = useMemo(() => {
    const map = new Map<AvatarSlot, AvatarPart[]>();
    for (const p of catalogQ.data ?? []) {
      if (!map.has(p.slot)) map.set(p.slot, []);
      map.get(p.slot)!.push(p);
    }
    return map;
  }, [catalogQ.data]);

  const equippedById = useMemo(() => {
    const map = new Map<string, AvatarPart>();
    for (const p of catalogQ.data ?? []) map.set(p.id, p);
    return map;
  }, [catalogQ.data]);

  const equippedParts = useMemo<Partial<Record<AvatarSlot, AvatarPart>>>(() => {
    const out: Partial<Record<AvatarSlot, AvatarPart>> = {};
    const slots = loadoutQ.data?.slots ?? {};
    for (const [slot, id] of Object.entries(slots)) {
      if (!id) continue;
      const p = equippedById.get(id as string);
      if (p) out[slot as AvatarSlot] = p;
    }
    return out;
  }, [loadoutQ.data, equippedById]);

  return {
    catalog: catalogQ.data ?? [],
    partsBySlot,
    loadout: loadoutQ.data,
    equippedParts,
    owned: ownedQ.data ?? new Set<string>(),
    isLoading: catalogQ.isLoading || loadoutQ.isLoading || ownedQ.isLoading,
    refetchAll: () => {
      qc.invalidateQueries({ queryKey: KEY_LOADOUT });
      qc.invalidateQueries({ queryKey: KEY_OWNED });
    },
  };
}
