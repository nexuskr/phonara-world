/**
 * @pkg/realtime — Realtime 4-way Partition (LOCKED v3.1 Phase 3 PR-J)
 *
 * 외부 코드는 `useRealtimeChannel` / `supabase.channel()` 직접 import 금지 (ESLint enforced).
 * 4-파티션 wrapper 만 사용한다:
 *
 *   useWalletChannel   wallet:<resource>[:id]   잔액·입출금·PHON·NFT
 *   useGameChannel     game:<resource>[:id]     슬롯·라이브 포지션·잭팟·empire 이벤트
 *   useChatChannel     chat:<resource>[:id]     채팅·서포트·관리자 알림
 *   useMarketChannel   market:<resource>[:id]   오라클·예측시장·티커
 *
 * money-flow 관련 read realtime 은 반드시 useWalletChannel.
 *
 * key prefix 는 자동 부여 — 호출부는 `wallet:` 등 prefix 를 생략해도 안전하다.
 */
import {
  useRealtimeChannel,
  subscribeRealtime,
  type UseRealtimeChannelOpts,
  type ConnState,
  type ChannelBinding,
} from "@/hooks/use-realtime-channel";
import { regionalKey } from "./regions";

export type RealtimePartition = "wallet" | "game" | "chat" | "market";
export type PartitionOpts = UseRealtimeChannelOpts;
export type { ConnState, ChannelBinding };
/** Imperative (non-React) entry — for stores / modules. Prefer the 4 hooks below in components. */
export { subscribeRealtime };
/** Region sharding (PR-N) — re-export for admin / debug. */
export { detectRegion, getRegion, setRegion, type RealtimeRegion } from "./regions";

const LOG = "[PHONARA REALTIME]";

function buildKey(part: RealtimePartition, key: string): string {
  if (!key) return "";
  // 이미 region+partition 이 붙어있으면 그대로
  if (new RegExp(`^(ap|us|eu):${part}:`).test(key)) return key;
  // cross-partition 오용 감지
  if (
    import.meta.env.DEV &&
    /^(?:(?:ap|us|eu):)?(wallet|game|chat|market):/.test(key) &&
    !new RegExp(`^(?:(?:ap|us|eu):)?${part}:`).test(key)
  ) {
    // eslint-disable-next-line no-console
    console.warn(`${LOG} cross-partition key "${key}" mounted on ${part} — should be ${part}:*`);
  }
  return regionalKey(part, key);
}

/** wallet 채널: phon_balances · withdrawal_requests · deposit_requests · nft_collection 등 */
export function useWalletChannel(opts: PartitionOpts) {
  return useRealtimeChannel({ ...opts, key: buildKey("wallet", opts.key) });
}

/** game 채널: live_positions · slot_spins · jackpot · empire 이벤트 등 */
export function useGameChannel(opts: PartitionOpts) {
  return useRealtimeChannel({ ...opts, key: buildKey("game", opts.key) });
}

/** chat 채널: chat_messages · support_tickets · admin alerts · audit log 등 */
export function useChatChannel(opts: PartitionOpts) {
  return useRealtimeChannel({ ...opts, key: buildKey("chat", opts.key) });
}

/** market 채널: oracle_prices · prediction_markets · 마켓 티커 등 */
export function useMarketChannel(opts: PartitionOpts) {
  return useRealtimeChannel({ ...opts, key: buildKey("market", opts.key) });
}
