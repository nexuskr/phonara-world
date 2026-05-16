# 긴급 안정화 패치 — RPC drift + Sound 404 + UX 4종

사용자가 정리한 패치 계획 전체를 그대로 진행한다. 코드/DB 사전 점검으로 가정을 모두 검증했고, 누락된 보강 항목 5건을 추가했다.

## 가정 검증 결과 (모두 사실)

- `imperial_scores` 컬럼: `total_is/daily_is/weekly_is/season_is` (score/level 없음) — 확인
- `fomo_notifications` 컬럼: `id, user_id, kind, title, message, cta_label, cta_url, payload, priority, read_at, expires_at, dedupe_key, created_at` (level 없음) — 확인
- `get_slot_leaderboard` pg_proc에 미존재 — 확인 (호출처: `src/components/slots/SlotLeaderboard.tsx`)
- `try_jackpot_hit(_game_code, _spin_id, _bet_phon)` — 시그니처 정상, 400은 auth_required + 중복 호출
- `BaronPromotionDialog.tsx:88` `select("id, kind, level, payload, created_at")` — level 컬럼 참조 확인
- `public/sounds/` 디렉토리 자체가 repo에 없음 — 확인 (404 영구 가드 필요)
- `use-imperial-state.ts`는 이미 세션 가드 있음 → `check_achievements` 400은 cascade이므로 1.1 수정 후 자동 해소 (별도 코드 변경 불요, 회귀 검증만)

## 작업 항목 (사용자 계획 그대로 + 추가 보강)

### A. 백엔드 마이그레이션 (1회)
1. `get_my_dashboard_state` 재정의 — `_score.score → total_is`, `_score.level → floor(log10(greatest(total_is,1)))`, 반환 JSON 키 동일 유지
2. `get_slot_leaderboard(_window text, _game_code text, _metric text, _limit int)` 신규 — `slot_spins` 집계, SECURITY DEFINER STABLE, `mask_nickname` 적용, 프런트 Row 모양과 일치
3. cron 정리: `recompute_daily_whale_leaderboard`의 `pp.amount_krw → pp.amount`, `update_bot_ratio_phase`의 `p.last_seen_at` 참조 제거
4. **(추가)** `get_recent_roulette_spins(_limit int)` 신규 SECURITY DEFINER — JackpotEmpireBanner 시드용. 마스킹 nick + amount + prize_label 반환, 공개 RPC

### B. 프런트 수정
5. `BaronPromotionDialog.tsx` — select에서 `level` 제거, 필요 시 `payload->>level` 사용. Row 타입에서 `level` 필드 제거
6. `SlotSoundManager.ts` — fetch 실패 try/catch silent, `console.error → console.debug` 1회 한정 (영구 가드)
7. `JackpotBanner.tsx` + `Missions.tsx` — `useNavigate` + `setSearchParams({tab:"battle"})` + `scrollIntoView` + 1.5s 골드 펄스 ring. Missions에 `id="roulette-card"` 부여
8. `PracticeModeBanner.tsx` — setOn(false) 후 1s delay → `navigate("/wallet")`, 동일 경로면 reload, 토스트 문구 "이제 입출금/베팅이 활성화됐어요"
9. `PersonalizedFeedRail.tsx` — generate 8s timeout + `get_trending_videos`/최근 videos 폴백 시드, 새로고침 버튼은 항상 강제 재호출(3s 쿨다운) + `setAutoGenTried(false)`
10. `JackpotEmpireBanner.tsx` — 마운트 시 `get_recent_roulette_spins(20)` 시드, realtime INSERT는 마스킹 실유저로 표시, 봇 시드는 빈 상태에서만 "SIM" 칩, prize_label NULL/amount=0만 "꽝"
11. `OlympusSlot.tsx` — `try_jackpot_hit` 호출 `useRef` 가드로 spin.id 기준 1회 dedupe

### C. 메모리 / 회귀 방지 (추가 보강)
12. `mem://features/rpc-drift-fix-2026-05-16` 신규 메모 — fomo_notifications 컬럼셋, imperial_scores 컬럼셋, get_slot_leaderboard 시그니처, 신규 RPC 등록
13. **(추가)** mem index Core에 한 줄 추가: "PostgREST `.select()` 작성 시 mem 컬럼셋 메모 우선 확인. drift 의심 시 `\d <table>`로 실측 후 호출."
14. **(추가)** `.lovable/sim-report.md`에 4종 RPC 200/JSON 키 7개 + fomo GET 200 검증 로그 1줄

### 범위 외 (이번 패치 미포함)
- 실제 음원 파일 업로드 (Audio Director 작업)
- `/admin/perms` drift baseline 갱신
- BGM seamless loop 검증
- `check_achievements` 자체 변경 — 1.1 수정 후 cascade 자동 해소만 검증

## 검증 체크리스트
- `psql -c "select get_my_dashboard_state();"` 비로그인 `{}`, 로그인 시 키 7개
- 브라우저 콘솔: 4종 RPC 200, fomo GET 200, /sounds 404 0건 (silent)
- `/missions`: "지금 룰렛 돌리기" → scrollIntoView + 펄스 발동
- `/wallet`: Practice 자동 해제 + 입출금 활성
- FOR YOU 새로고침: 항상 카드 표기 (폴백 포함)
- 잭팟 배너: realtime 도착 시 봇 시드 자연 소실 + "실유저" 표기
- 슬롯 1회 스핀당 `try_jackpot_hit` 정확히 1회 호출 (network 탭 확인)

## 변경 파일 요약
```text
supabase migration (4 RPC: get_my_dashboard_state, get_slot_leaderboard, get_recent_roulette_spins, cron 2개 정리)
src/components/empire/BaronPromotionDialog.tsx
src/lib/sounds/SlotSoundManager.ts
src/components/JackpotBanner.tsx
src/pages/Missions.tsx
src/components/practice/PracticeModeBanner.tsx
src/components/feed/PersonalizedFeedRail.tsx
src/components/empire/JackpotEmpireBanner.tsx
src/components/slots/OlympusSlot.tsx
mem://features/rpc-drift-fix-2026-05-16  (신규)
mem://index.md                            (Core 1줄 추가)
.lovable/sim-report.md                    (검증 로그)
```
