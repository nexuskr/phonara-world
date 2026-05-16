/**
 * @pkg/realtime — Realtime 4-way Partition (LOCKED v3.0 Week 1 #3)
 *
 *  4 채널만 허용 — 그 외 직접 supabase.channel() 호출 금지 (ESLint custom rule 예정):
 *    - wallet : 잔액/입출금/PHON 잔액
 *    - game   : 슬롯·라이브 포지션·게임 결과
 *    - chat   : 채팅·DM·comment
 *    - market : oracle 가격·예측 시장·티커
 *
 * 기존 single-entry `useRealtimeChannel` (`@/hooks/use-realtime-channel`)을
 * 4 partition으로 라벨링하는 얇은 래퍼. 각 partition은 권장 prefix를 따른다:
 *   wallet:phon_balances · game:live_positions · chat:chat_messages · market:oracle_prices
 *
 * 진짜 socket 분리는 Supabase realtime 단일 ws를 쓰므로 물리 분리는 아니지만,
 * (1) 채널 키 namespace, (2) 컴포넌트 import 경로, (3) 텔레메트리 라벨을 통일해
 * "어디서 무엇이 구독하는지"를 한눈에 추적 가능하게 한다.
 */
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";

export type RealtimePartition = "wallet" | "game" | "chat" | "market";

type AnyOpts = Parameters<typeof useRealtimeChannel>[0];

/** wallet 채널: phon_balances · withdrawal_requests · deposit_requests 등 */
export function useWalletChannel(opts: AnyOpts) {
  return useRealtimeChannel({ ...opts, key: prefix("wallet", opts.key) });
}

/** game 채널: live_positions · slot_spins · game_results 등 */
export function useGameChannel(opts: AnyOpts) {
  return useRealtimeChannel({ ...opts, key: prefix("game", opts.key) });
}

/** chat 채널: chat_messages · dm_threads · comments 등 */
export function useChatChannel(opts: AnyOpts) {
  return useRealtimeChannel({ ...opts, key: prefix("chat", opts.key) });
}

/** market 채널: oracle_prices · prediction_markets · 마켓 티커 등 */
export function useMarketChannel(opts: AnyOpts) {
  return useRealtimeChannel({ ...opts, key: prefix("market", opts.key) });
}

function prefix(part: RealtimePartition, key: string): string {
  if (key.startsWith(`${part}:`)) return key;
  return `${part}:${key}`;
}
