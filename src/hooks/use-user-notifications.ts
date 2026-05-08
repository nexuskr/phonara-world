import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatKRW } from "@/lib/store";

const CHANNEL = "phonemission:user-notify";
const SEEN_KEY = "pm_user_seen_v1";
const SEEN_MAX = 200;
const DEBOUNCE_MS = 2500;
const QUIET_HOURS = { start: 23, end: 8 }; // 23~08 조용 모드 (브라우저 알림 X, 토스트만)

// 사용자가 정말로 알아야 하는 이벤트만 (mission_win 같은 매번 발생 이벤트는 제외)
const IMPORTANT_KINDS = new Set([
  "deposit_credit",
  "withdrawal_complete",
  "withdrawal_release",
  "package_settle",
  "profit_share",
  "admin_adjust",
]);

type Pending = { count: number; total: number; lastTitle: string; lastDesc: string };

function loadSeen(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveSeen(s: Set<string>) {
  try { sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(s).slice(-SEEN_MAX))); } catch {}
}

function isQuietNow() {
  const h = new Date().getHours();
  return h >= QUIET_HOURS.start || h < QUIET_HOURS.end;
}

/**
 * 본인 트랜잭션/출금 상태 변경 알림.
 * 스팸 방지:
 *  1) IMPORTANT_KINDS 화이트리스트 (mission_win 같은 일상 이벤트 제외)
 *  2) BroadcastChannel + sessionStorage SEEN으로 탭간/재구독 중복 차단
 *  3) 디바운스 2.5초: 같은 kind 묶음은 1개 토스트로 합산 ("3건 정산 +12,500원")
 *  4) 야간(23~08) 브라우저 알림 OFF (토스트는 유지)
 */
export function useUserNotifications(userId: string | null | undefined) {
  const seenRef = useRef<Set<string>>(loadSeen());
  const bcRef = useRef<BroadcastChannel | null>(null);
  const pendingRef = useRef<Map<string, Pending>>(new Map());
  const timerRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!userId) return;

    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`${CHANNEL}:${userId}`) : null;
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

    const flush = (key: string) => {
      const p = pendingRef.current.get(key);
      pendingRef.current.delete(key);
      timerRef.current.delete(key);
      if (!p) return;
      const title = p.count === 1
        ? p.lastTitle
        : `${p.lastTitle} 외 ${p.count - 1}건`;
      const desc = p.count === 1
        ? p.lastDesc
        : `합계 ${formatKRW(p.total)}`;
      toast({ title, description: desc });
      if (!isQuietNow() && typeof Notification !== "undefined" && Notification.permission === "granted") {
        try { new Notification(title, { body: desc, tag: key, icon: "/favicon.ico" }); } catch {}
      }
    };

    const enqueue = (key: string, id: string, amount: number, title: string, desc: string) => {
      if (!markSeen(id)) return;
      bc?.postMessage({ id });
      const cur = pendingRef.current.get(key) ?? { count: 0, total: 0, lastTitle: title, lastDesc: desc };
      cur.count += 1;
      cur.total += amount;
      cur.lastTitle = title;
      cur.lastDesc = desc;
      pendingRef.current.set(key, cur);
      const existing = timerRef.current.get(key);
      if (existing) clearTimeout(existing);
      const t = window.setTimeout(() => flush(key), DEBOUNCE_MS);
      timerRef.current.set(key, t);
    };

    const ch = supabase
      .channel(`user-notify:${userId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        (p) => {
          const r: any = p.new;
          if (!IMPORTANT_KINDS.has(r.kind)) return;
          const amount = Number(r.amount || 0);
          const map: Record<string, [string, string]> = {
            deposit_credit: ["💰 충전 승인", "충전이 승인되었습니다"],
            withdrawal_complete: ["✅ 출금 완료", "출금이 완료되었습니다"],
            withdrawal_release: ["↩️ 출금 반환", "출금 신청이 거절되어 잔액이 복구되었습니다"],
            package_settle: ["📈 패키지 정산", "일일 정산이 입금되었습니다"],
            profit_share: ["👑 EMPIRE 보상", "보상이 입금되었습니다"],
            admin_adjust: ["⚙️ 잔액 조정", r.direction === "credit" ? "잔액이 증가했습니다" : "잔액이 차감되었습니다"],
          };
          const [title, baseDesc] = map[r.kind];
          const desc = `${baseDesc} · ${r.direction === "debit" ? "-" : "+"}${formatKRW(amount)}`;
          enqueue(r.kind, `tx:${r.id}`, amount, title, desc);
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "withdrawal_requests", filter: `user_id=eq.${userId}` },
        (p) => {
          const r: any = p.new;
          const o: any = p.old;
          if (r.status === o?.status) return;
          if (r.status === "approved") {
            enqueue("wd_status", `wds:${r.id}:approved`, 0, "✅ 출금 승인", `${formatKRW(r.amount)} 승인됨, 곧 처리됩니다`);
          } else if (r.status === "rejected") {
            enqueue("wd_status", `wds:${r.id}:rejected`, 0, "❌ 출금 거절", r.rejected_reason || "사유 미기재");
          }
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "deposit_requests", filter: `user_id=eq.${userId}` },
        (p) => {
          const r: any = p.new;
          const o: any = p.old;
          if (r.status === o?.status) return;
          if (r.status === "rejected") {
            enqueue("dep_status", `deps:${r.id}:rejected`, 0, "❌ 충전 거절", r.rejected_reason || "사유 미기재");
          }
        })
      .subscribe();

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      // 사용자 알림은 명시적 동의 필요. 첫 진입에서 한 번만.
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      supabase.removeChannel(ch);
      bc?.close();
      bcRef.current = null;
      timerRef.current.forEach((t) => clearTimeout(t));
      timerRef.current.clear();
      pendingRef.current.clear();
    };
  }, [userId]);
}
