# P5-B — Community Layer (Drand-stamped Chat · Squad · Tournament)

한국인 락인(lock-in)을 극대화하는 3축 커뮤니티: 검증가능한 채팅(Drand 스탬프), 3인 스쿼드 + 미러 베팅, 토너먼트 브래킷(Apocalypse Cup 준비). 머니플로 8경로 git diff = 0 유지 — mirror_bet 도 `apex_place_bet_v2` 재사용.

## DB 마이그레이션 (5 tables + 4 RPC)

```text
apex_chat_rooms        id, name, type(global|squad|tournament),
                       host_user_id, is_public, drand_round, created_at
apex_chat_messages     id, room_id, user_id, message(<=500),
                       drand_round, drand_signature, created_at
apex_squad_rooms       id, host_user_id, member_ids jsonb (≤3 uuids),
                       status(open|locked|done), current_bet_mirror jsonb
apex_squad_mirrors     id, squad_id, source_roll_id, mirror_user_id,
                       amount_phon, idem_key (unique), created_at
apex_tournaments       id, season_id, name, prize_pool_phon, start_at,
                       end_at, bracket jsonb, status(scheduled|live|done)
```

RLS:
- `apex_chat_rooms`: public read if `is_public=true`, write room owner / admin
- `apex_chat_messages`: read = 같은 room 멤버 또는 public room, write = 인증 + 본인 user_id
- `apex_squad_rooms`/`apex_squad_mirrors`: read/write = `member_ids @> auth.uid()`
- `apex_tournaments`: public read, admin write

RPCs (SECURITY DEFINER):
- `apex_send_chat_message(_room_id, _message)` — 500자 캡 + 3s/유저 throttle + Drand round/signature 자동 첨부
- `apex_create_squad()` → squad_id (host = auth.uid())
- `apex_join_squad(_squad_id)` — 최대 3명, 중복 거부
- `apex_mirror_bet(_squad_id, _source_roll_id, _amount_phon, _idem_key)` — 내부에서 `apex_place_bet_v2` 호출 → 머니플로 8경로 무변경

## Edge Functions (apex-* 만)

- `supabase/functions/apex-chat-stamp/index.ts` — 메시지 send 직후 호출, 최신 Drand round + signature를 메시지 row에 패치. JWT 검증 + zod 입력 검증.
- `supabase/functions/apex-squad-mirror-tick/index.ts` — 1분 cron. 활성 스쿼드의 `current_bet_mirror`를 스캔하여 미반영 멤버에 대해 `apex_mirror_bet` 호출 (idem_key = `${squad}:${roll}:${user}`).

cron 등록: `pg_cron` + `pg_net` insert (project-specific URL/key — insert tool 사용).

## Frontend (모두 `@pkg/apex/community/*`)

신규:
```text
src/packages/apex/community/
  ChatRoom.tsx            # 메시지 리스트 + Drand 스탬프 chip + 입력
  ChatMessage.tsx         # Drand round/sig 검증 hover popover
  SquadRoom.tsx           # 3슬롯 멤버 + Mirror Toggle + 활성 베팅 카드
  SquadCreatePanel.tsx    # 호스트 생성 / 초대 링크
  MirrorToggle.tsx        # 1-click follow (한 번 누르면 자동 미러)
  TournamentBracket.tsx   # SVG 브래킷 (Apocalypse Cup 준비)
  TournamentLeaderboard.tsx
  hooks/useChatChannel.ts # @pkg/realtime/chat 래퍼 (chat: prefix)
  hooks/useSquadChannel.ts# @pkg/realtime/game 래퍼 (game:squad: prefix)
  lib/drandVerify.ts      # 클라이언트 검증 (Ed25519 — 기존 apex-vrf 재사용)
src/pages/apex/community/
  Chat.tsx                # /apex/community/chat (lazy)
  Squad.tsx               # /apex/community/squad (lazy)
  Tournament.tsx          # /apex/community/tournament (lazy)
```

수정:
- `src/App.tsx` — 3 lazy import + 3 Route 추가
- `src/packages/apex/landing/` 또는 ApexShell — Community 진입 카드 3개 (CSS gradient)

## 라우팅
```text
/apex/community/chat
/apex/community/squad
/apex/community/tournament
```

## 가드레일

- 머니플로 git diff = 0: `apex_play_mock_game` / `apex_place_bet_v2` / `phon_balances` / `apex_game_rolls` 본문/스키마 무변경. `apex_mirror_bet` 는 wrapper만.
- realtime: `useChatChannel('chat:room:<id>')`, `useSquadChannel('game:squad:<id>')` — raw `supabase.channel` 0건.
- notify: `@/lib/notify` 4-tier만.
- chunk: 각 community 페이지 lazy ≤ 25KB gz, Layer 1 영향 0.
- 모든 신규 코드 `@pkg/apex/community/*` + `supabase/functions/apex-*`.
- operator 격리 무변경.
- RLS: 모든 신규 테이블 enable + 멤버십 기반 정책 + admin-only `apex_tournaments` write.
- 스로틀: chat 3s/유저, squad join 1s/유저 — RPC 내부 가드.

## 검증

- `node scripts/check-money-flow-freeze.mjs` → 8/8 PASS
- chat latency p50 < 200ms (Drand stamp 비동기)
- 3-user squad mirror round-trip < 1.5s
- Tournament bracket render ≤ 16ms (no layout thrash)

## 다음 슬라이스 (P5-C Apocalypse Cup) Seed

- `apex_cup_seasons(id, name, prize_pool_phon, start/end_at, status)`
- `apex_cup_brackets(season_id, round, slot_a, slot_b, winner_id, settled_at)`
- `apex-cup-settler` cron (5m) — Drand round 기반 결정적 매치 결과
- $1M PHON 풀, 1% slippage 보호, treasury 분배
- `@pkg/apex/events/CupBracket.tsx` (P5-B `TournamentBracket` 재사용 + 시드/실시간 진행)
- `CupLeaderboard.tsx`, `CupPrizePool.tsx`
- 머니플로 8경로 git diff = 0, Layer 1 영향 0
