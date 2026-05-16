# PR-Hotfix: 슬롯 SPIN 오류 + 사이트 극심한 느림 긴급 수정

두 가지 별개 원인을 한 번에 처리합니다. money-flow 8경로는 건드리지 않습니다.

---

## 1. SPIN 버튼 오류 — `game_not_found` (P0001)

### 원인
`src/components/slots/themes.ts` 에는 12개 슬롯 테마가 정의돼 있지만, 실제 DB `slot_games` 테이블에는 **10개만 등록**돼 있습니다.

DB 누락 게임 코드:
- `olympus_legacy_5000` (Flagship)
- `sugar_fever_3000` (Signature)

`spin_slot_demo(_game_code)` RPC가 해당 row를 못 찾아 `game_not_found` 를 던지고, 프런트는 그대로 노출됩니다.

### 수정
**DB 마이그레이션 1건** — 두 게임을 `slot_games` 에 INSERT.
- `olympus_1000`(wheel/RTP 96 / max 1000×) 행을 템플릿으로 복제하되:
  - `olympus_legacy_5000`: `max_multiplier=5000`, `volatility_class='high'`, `bonus_kind='wheel'`, paytable/weights 동일
  - `sugar_fever_3000`: `max_multiplier=3000`, `volatility_class='high'`, `bonus_kind='cluster_tumble'`, paytable/weights는 `sugar` 계열에 어울리는 기존 게임(없으면 olympus 복제) 사용
- `active=true`, `min_bet_phon=10`, `max_bet_phon=5000`, `buy_bonus_multiplier=100`
- `ON CONFLICT (game_code) DO NOTHING` — 멱등

검증: 마이그레이션 후 `SELECT game_code FROM slot_games` 12개 확인 → 두 슬롯에서 DEMO SPIN 200 OK.

---

## 2. 사이트 “거북이” 수준 느림

콘솔/네트워크 로그에 따르면 단일 페이지에서 다음이 폭주합니다.

| 증상 | 원인 |
|---|---|
| `/sounds/common/sfx/*.mp3` `/sounds/sugar_fever/*` `/sounds/olympus_legacy/*` 전부 **404** | `public/sounds/` 디렉터리가 아예 없음. 모든 슬롯이 마운트될 때마다 SFX 프리로드 → 매번 404 + Audio 객체 재시도 |
| `check_achievements`, `get_my_dashboard_state`, `get_trending_videos` **400** 다수 | 호출은 살아있지만 인자 누락/포맷 미스로 매 폴링마다 실패 → 재시도 루프 |
| `platform_kill_switches` 등 공개 RPC 짧은 주기 폴링 | SWR/캐시 없이 매 5–15s GET |

### 수정 범위 (프런트만, money-flow 무관)

A. **사운드 404 종식**
- `src/lib/sounds/soundConfig.ts` + 로더에서 **HEAD 프로브 1회 → 404면 그 키를 영구 disable** (in-memory Set). 404 캐시는 sessionStorage 키 `phonara:audio:missing:v1`.
- `public/sw.js` 의 precache 목록에서 존재하지 않는 mp3 제거 (또는 try/catch 로 individual add 후 실패 무시) → SW install 실패 방지.
- 추가로 `<link rel="preload" as="audio">` 가 어디서든 자동 발생하지 않도록 확인.

B. **400 RPC 손보기**
- `use-achievement-watcher.ts`: `check_achievements({ _user_id })` 시 `user?.id` 가 없으면 호출 **스킵** (지금은 무조건 호출돼 비로그인/세션 복원 직전에 400).
- `use-imperial-state.ts`: 인증 안 됐을 때 `get_my_dashboard_state` 호출 스킵 + 에러 시 **백오프 2분** (현재 매 폴링마다 재시도).
- `PersonalizedFeedRail`: `get_trending_videos` 가 400이면 1회만 시도 후 **하루 disable** (sessionStorage).

C. **공개 RPC SWR 적용**
이미 PR-M에서 만들어둔 `@pkg/core/swr.ts` whitelist 활용:
- `get_whale_strikes_24h` (24h 갱신 충분) → `useSwr` 60s ttl / 5m swr
- `platform_kill_switches` GET → 30s ttl / 2m swr (이미 hook 있음 — 안에 swr 래퍼만 끼움)
- `conversion_events` view 이벤트는 그대로 두되, `WhaleStrikeRail` 의 60s 폴링은 SWR 캐시 hit 시 네트워크 생략.

D. **번들/리렌더는 손대지 않음** (PR-K/L에서 이미 처리됨, 회귀 방지)

---

## 검증

```
# 1. 슬롯
psql -c "SELECT game_code FROM slot_games" → 12개
preview → /casino/olympus-legacy-5000 → DEMO SPIN → 200 OK
         /casino/sugar-fever-3000 → DEMO SPIN → 200 OK

# 2. 성능
preview → /casino → DevTools Network → 1분 캡처
- 404 mp3 = 0 (최초 1회만)
- 400 RPC = 0 (인증 후), <3 (게스트)
- 공개 RPC 폴링 횟수 < 1/30s

# 3. 회귀
bun run scripts/check-money-flow-freeze.mjs → PASS (diff=0)
bun run scripts/check-operator-isolation.mjs → PASS
bun run bundle-budget → Δ < 1KB
```

---

## 기술 상세

### 파일 변경 예상
- `supabase/migrations/<ts>_add_missing_slot_games.sql` (신규)
- `src/lib/sounds/soundConfig.ts` (404 캐시)
- `src/lib/sounds/` 로더 (HEAD 프로브 가드 1줄)
- `public/sw.js` (precache 안전화)
- `src/hooks/use-achievement-watcher.ts` (가드)
- `src/hooks/use-imperial-state.ts` (가드 + 백오프)
- `src/components/feed/PersonalizedFeedRail.tsx` (가드)
- `src/components/whale/WhaleStrikeRail.tsx` 또는 데이터 훅 (SWR)
- `src/hooks/use-kill-switches.ts` (SWR)

### 영향 없음
- money-flow 8경로
- 결제/출금/오더북/오라클
- operator 청크
- 디자인 토큰
