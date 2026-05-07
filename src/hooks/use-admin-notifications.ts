import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatKRW } from "@/lib/store";

const CHANNEL = "phonemission:admin-notify";
const SEEN_KEY = "pm_admin_seen_v1";
const SEEN_MAX = 500;

function loadSeen(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveSeen(s: Set<string>) {
  const arr = Array.from(s).slice(-SEEN_MAX);
  try { sessionStorage.setItem(SEEN_KEY, JSON.stringify(arr)); } catch {}
}

/**
 * 관리자 전용 신규 신청 알림 hook.
 * - BroadcastChannel로 탭간 dedupe (같은 이벤트는 한 탭에서만 토스트)
 * - sessionStorage SEEN set으로 동일 이벤트 ID 재토스트 차단
 * - leader election: 가장 먼저 잡는 탭이 토스트, 나머지는 SEEN만 갱신
 */
export function useAdminNotifications(enabled: boolean) {
  const seenRef = useRef<Set<string>>(loadSeen());
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
    bcRef.current = bc;

    const markSeen = (id: string) => {
      if (seenRef.current.has(id)) return false;
      seenRef.current.add(id);
      saveSeen(seenRef.current);
      return true;
    };

    bc?.addEventListener("message", (e: MessageEvent) => {
      const id = (e.data as any)?.id;
      if (id) markSeen(id);
    });

    const fire = (id: string, title: string, desc: string) => {
      if (!markSeen(id)) return;
      bc?.postMessage({ id });
      toast({ title, description: desc });
      // 브라우저 알림 (사용자 권한 시)
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try { new Notification(title, { body: desc, tag: id, icon: "/favicon.ico" }); } catch {}
      }
    };

    const ch = supabase
      .channel("admin-notify-stream")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "deposit_requests" },
        (p) => {
          const r: any = p.new;
          fire(`dep:${r.id}`, "🟢 새 충전 신청", `${formatKRW(r.amount)} · ${r.method}`);
        })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "withdrawal_requests" },
        (p) => {
          const r: any = p.new;
          fire(`wd:${r.id}`, "🔴 새 출금 신청", `${formatKRW(r.amount)} · ${r.method}`);
        })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "package_purchases" },
        (p) => {
          const r: any = p.new;
          fire(`pkg:${r.id}`, "🟡 새 패키지 신청", `${r.package_name} · ${formatKRW(r.amount)}`);
        })
      .subscribe();

    // 권한 한 번만 요청
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      supabase.removeChannel(ch);
      bc?.close();
      bcRef.current = null;
    };
  }, [enabled]);
}
