import { Page, Route } from "@playwright/test";

export type MoneyFlowGuard = { called: string[] };

/**
 * 머니플로 8경로 RPC. 호출되면 즉시 fail.
 * 실제 함수 시그니처는 mem://imperial-* 참조.
 */
const MONEY_FLOW_RPCS = [
  "imperial_place_phon_bet",
  "imperial_settle_phon_bet",
  "_apply_house_edge_split",
  "request_withdrawal",
  "credit_crypto_deposit",
  "apply_token_burn",
  "rollback_injection_event",
  "claim_loss_protection",
];

/**
 * 모든 Supabase 호출을 가로채서 합성 응답 주입.
 * REST / RPC / Realtime WebSocket / Auth 전부.
 */
export async function installSupabaseMock(page: Page, guard: MoneyFlowGuard) {
  // Realtime WebSocket 차단 (E2E는 realtime mock으로 충분)
  await page.route("**/realtime/v1/websocket**", (route) => route.abort());

  // Auth 가입/로그인 mock
  await page.route("**/auth/v1/signup**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh",
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          email: "e2e@phonara.test",
          aud: "authenticated",
          role: "authenticated",
        },
      }),
    }),
  );

  await page.route("**/auth/v1/token**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh",
        user: { id: "00000000-0000-0000-0000-000000000001" },
      }),
    }),
  );

  await page.route("**/auth/v1/user**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-0000-0000-000000000001",
        email: "e2e@phonara.test",
      }),
    }),
  );

  // RPC 라우터
  await page.route("**/rest/v1/rpc/**", async (route: Route) => {
    const url = route.request().url();
    const fnName = url.split("/rpc/")[1].split("?")[0];

    // 머니플로 가드
    if (MONEY_FLOW_RPCS.some((n) => fnName.includes(n))) {
      guard.called.push(fnName);
      return route.fulfill({ status: 503, body: JSON.stringify({ error: "money_flow_blocked_in_e2e" }) });
    }

    const body = rpcResponseFor(fnName);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  // REST select/insert: 빈 배열 기본값
  await page.route("**/rest/v1/**", async (route: Route) => {
    if (route.request().url().includes("/rpc/")) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-0/0" },
      body: "[]",
    });
  });
}

/** RPC 이름별 합성 응답 (없으면 null) */
function rpcResponseFor(name: string): unknown {
  const map: Record<string, unknown> = {
    imperial_claim_signup_bonus: { status: "ok", amount_phon: 15000, new_balance: 15000 },
    claim_daily_attendance_v2: { status: "ok", streak: 1, reward: 500, new_balance: 15500 },
    get_whale_strikes_24h: [
      { id: "w1", kind: "crown", nickname: "황***제", amount: 12500, created_at: new Date().toISOString() },
      { id: "w2", kind: "baron_promotion", nickname: "남***작", amount: 0, created_at: new Date().toISOString() },
    ],
    get_world_domination_stats: { total_users: 12345, online_now: 234, payouts_24h: 9876543 },
    get_live_activity_60s: [],
    get_recent_payouts_100: [],
    imperial_get_duel_rooms: [
      { room_id: "r1", title: "BTC ROUND 1", spectators: 234, ends_at: new Date(Date.now() + 60000).toISOString() },
      { room_id: "r2", title: "ETH ROUND 2", spectators: 117, ends_at: new Date(Date.now() + 120000).toISOString() },
    ],
    is_duel_frozen: false,
    get_flywheel_snapshot: { volatility_tier: "warm", treasury_phon: 999999, last_burn: 1234 },
    imperial_can_participate: true,
    get_my_nft_collection: [],
    get_my_total_boost_pct: 0,
    get_my_max_leverage: 10,
    phon_hub_summary: { phon_balance: 15000, staked: 0, apy: 15 },
    get_payout_ops_stats_24h: { total: 9876543, count: 142, p50_minutes: 4, p95_minutes: 12 },
  };
  return map[name] ?? null;
}
