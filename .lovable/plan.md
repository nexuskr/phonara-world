# 긴급 안정화 패치 — RPC 400/404, 사운드 404, UX 4종

콘솔 에러 폭주(400/404 수십 건)와 사용자 보고 4건의 UX 결함을 한 번에 정리한다. 모든 수정은 **이미 존재하는 메모리 약속**(displayCurrency, notify, EmptyState, RPC 가드 등)을 지킨다.

---

## 0. 진단 (postgres 로그 기준 실측 근거)

| 증상 (콘솔) | 실측 원인 |
|---|---|
| `get_my_dashboard_state` 400 | RPC 내부 `record "_score" has no field "score"`. `imperial_scores` 컬럼은 `total_is/daily_is/weekly_is/season_is`이고 `score/level` 없음. |
| `get_slot_leaderboard` 404 | DB에 해당 함수가 존재하지 않음. `SlotLeaderboard.tsx`만 잘못된 시그니처(`_window/_metric/_game_code/_limit`)로 호출. |
| `try_jackpot_hit` 400 | 함수는 정상. 400은 `auth_required` raise — 비로그인/세션 만료 사용자가 호출. 단, 동일 회차에 4~5회 연속 호출되는 중복 호출 문제 별도. |
| `check_achievements` 400 | 비로그인 또는 enum mismatch 캐스케이드. `get_my_dashboard_state` 실패와 동일 세션에서 폭주. |
| `fomo_notifications?select=…,level,…` 400 | 컬럼 `level` 존재하지 않음 (`id, user_id, kind, title, message, cta_*, payload, priority, read_at, expires_at, dedupe_key, created_at`). `BaronPromotionDialog` select 절 오류. |
| `/sounds/{slot}/bgm/main.mp3` 404 | `public/sounds/` 디렉토리 자체가 repo에 없음. SlotSoundManager가 404를 console.error로 노출. |
| 부수적 cron 에러 | `recompute_daily_whale_leaderboard`에 `pp.amount_krw` 컬럼 없음(`package_purchases.amount` 사용해야 함). `update_bot_ratio_phase`에 `p.last_seen_at` 없음. 사용자 체감엔 없지만 로그 오염. |

---

## 1. 백엔드 마이그레이션 (1회)

### 1.1 `get_my_dashboard_state` 재정의
- `imperial_scores._score.score` → `total_is`
- `_score.level` → `floor(log10(greatest(total_is,1)))` 또는 0
- 반환 JSON 동일 키 유지 (`imperial_score`, `level`, …) — 프런트 무수정.

### 1.2 `get_slot_leaderboard(_window text, _game_code text, _metric text, _limit int)` 신규
- `slot_spins` 집계 (24h/7d), 컬럼: rank, masked_name, game_code, total_bet, total_payout, net, spin_count, max_multiplier, max_payout — 프런트가 기대하는 Row 모양.
- SECURITY DEFINER, STABLE, 마스킹은 `mask_nickname` 또는 인라인 LEFT 3자 + ****.

### 1.3 cron 오염 정리
- `recompute_daily_whale_leaderboard`: `pp.amount_krw` → `pp.amount`.
- `update_bot_ratio_phase`: `p.last_seen_at` 참조 제거(또는 `auth.users.last_sign_in_at` 사용).

---

## 2. 프런트 수정

### 2.1 `src/components/empire/BaronPromotionDialog.tsx`
- `.select("id, kind, level, payload, created_at")` → `.select("id, kind, payload, created_at")`
- `payload.level`이 필요하면 payload jsonb에서 읽도록 변경.

### 2.2 `src/lib/sounds/SlotSoundManager.ts` (또는 호출 지점)
- `loadSlotSounds()` BGM/SFX fetch 실패를 try/catch → silent skip. `console.error` 대신 한 번만 `console.debug`. 404가 사용자/제3자 모니터링에 노출되지 않게.
- 정책: `public/sounds/**`는 음원 업로드 전까지 빈 상태가 정상이므로 silent fallback이 영구 운영 가드.

### 2.3 `src/components/JackpotBanner.tsx` — "지금 룰렛 돌리기"
- 현재 `<Link to="/roulette">` → `/missions?tab=battle`로 리다이렉트. 이미 같은 페이지면 시각적 반응 0.
- 변경: `useNavigate()` + 클릭 시 **항상**
  1. `setSearchParams({ tab: "battle" })`
  2. 페이지 내 룰렛 카드 id(`#roulette-card`)로 `scrollIntoView({ behavior:"smooth", block:"start" })`
  3. 카드에 1.5초 골드 펄스 ring (CSS) 강조.
- `Missions.tsx`의 룰렛 섹션에 `id="roulette-card"` 부여.

### 2.4 `src/components/practice/PracticeModeBanner.tsx` — "실거래 모드 전환"
- 버그: 클릭 시 `setOn(false)` 후 토스트만. 일부 라우트(/wallet, /packages)는 `<PracticeModeGate>`로 막혀있었기 때문에 사용자 입장에선 "전환 후 어디로 가야 하는지" 단서 부재 → "반응 없음"으로 체감.
- 변경:
  1. 클릭 시 `setOn(false)` + 토스트.
  2. 1초 후 `navigate("/wallet")` (실거래 첫 단계). 현재 경로가 이미 `/wallet`이면 강제 reload.
  3. PracticeModeGate 통과를 토스트에 "이제 입출금/베팅이 활성화됐어요"로 명시.

### 2.5 `src/components/feed/PersonalizedFeedRail.tsx` — FOR YOU 새로고침 무반응
- 현재 흐름: load → empty → 자동 generate 1회 → 실패 시 영구 empty.
- 변경:
  1. `generate` 실패/타임아웃(8s) 시 fallback으로 `get_trending_videos`(이미 존재) 또는 최근 20개 `videos` SELECT로 시드.
  2. 새로고침 버튼은 항상 generate를 강제 재호출(쿨다운 3s), 빈 결과면 폴백 시드를 즉시 표기.
  3. autoGen 한 번 실패해도 사용자가 새로고침 누르면 다시 시도(`setAutoGenTried(false)` after click).

### 2.6 `src/components/empire/JackpotEmpireBanner.tsx` — 실시간 스피너
- 현재 가짜 봇 닉/금액 + 가끔 `roulette_spins` INSERT 추가.
- 변경:
  1. 마운트 시 `roulette_spins` 최근 20개 SELECT로 초기 시드 (RLS가 공개 SELECT 막혀있으면 신규 RPC `get_recent_roulette_spins(_limit)` SECURITY DEFINER로 마스킹된 nick+amount+prize 반환).
  2. INSERT realtime 시 마스킹된 실유저 닉(`mask_nickname`) + 실제 amount/prize_label 표기.
  3. 봇 시드는 실데이터가 비어있을 때만 보조 표기하고 "SIM" 칩을 명시. 실데이터가 들어오면 봇은 자연 소실.
  4. "다음 기회에" 문구: `prize_label`이 NULL이거나 `amount=0`인 행만 "꽝"으로 표기. 실제 당첨 행은 amount/prize_label 그대로.
  5. 슬롯 `OlympusSlot.tsx`의 `try_jackpot_hit` 호출은 **per spin 1회**로 dedupe(이미 `latestSpin.id` 기반이지만 React strict-mode/이펙트 중복 가능 → useRef 가드 추가).

---

## 3. 메모리 / 회귀 방지
- mem 새 메모 "RPC drift fixed (2026-05-16)": fomo_notifications 컬럼 셋, imperial_scores 컬럼 셋, get_slot_leaderboard 시그니처. 향후 PostgREST 호출 시 컬럼 셋 검증 필수.

---

## 4. 범위 외(이번 패치에서 다루지 않음)
- 실제 음원 파일 업로드 (별도 Audio Director 작업)
- /admin/perms drift baseline 갱신
- 음원 BGM seamless loop 검증

---

## 기술 노트 (개발자용)

```text
변경 파일
  supabase migration (3 fns)
  src/components/empire/BaronPromotionDialog.tsx
  src/lib/sounds/SlotSoundManager.ts
  src/components/JackpotBanner.tsx
  src/pages/Missions.tsx                    (id 추가)
  src/components/practice/PracticeModeBanner.tsx
  src/components/feed/PersonalizedFeedRail.tsx
  src/components/empire/JackpotEmpireBanner.tsx
  src/components/slots/OlympusSlot.tsx      (try_jackpot_hit dedupe)
  mem://features/rpc-drift-fix-2026-05-16   (신규 메모)
```

검증
- `code--exec` `psql -c "select get_my_dashboard_state();"` 비로그인은 `{}`, 로그인 RPC는 jsonb 키 7개.
- 브라우저 콘솔에서 4종 RPC 모두 200, fomo GET 200.
- /missions: "지금 룰렛 돌리기" 클릭 시 카드로 스크롤 + 펄스.
- /wallet 진입 시 Practice 모드 자동 해제 + 입출금 가용.
- FOR YOU: 새로고침 → 항상 카드 표기(폴백 포함).
- 잭팟 배너: 실데이터 들어오면 봇 시드 사라지고 "실유저" 마킹.
