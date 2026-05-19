# AETHER → Phonara 게임 이식 플랜 (Top-Tier 작업 규약)

원본: `AETHER: Golden Glow` (https://aetherbet.lovable.app)
대상: `Phonara` (현 프로젝트)

## 1. 가치 평가 — 가져올 것 / 버릴 것

원본에서 Phonara에 **없는 게임**만 가져옵니다. 슬롯 12종은 이미 Phonara에 있으므로 제외.

| 카테고리 | AETHER 자산 | Phonara에 있음? | 가져옴? |
|---|---|---|---|
| Crash | `Crash.tsx` + `lib/crash/{engine,particles,sound}` + `crash/*` 컴포넌트 7종 | ❌ (Imperial Duel은 다른 메커니즘) | ✅ |
| Plinko | `Plinko.tsx` + `originals/PlinkoCanvas` + `lib/originals/plinko` | ❌ | ✅ |
| Roulette | `Roulette.tsx` + `tables/RouletteWheel` + `ChipBar` | ❌ | ✅ |
| Baccarat | `Baccarat.tsx` + `lib/tables/{baccaratRoads,deck}` | ❌ | ✅ |
| Blackjack | `Blackjack.tsx` + `lib/tables/deck` | ❌ | ✅ |
| Powerball | `Powerball.tsx` + `powerball/PowerballStage` | ❌ | ✅ |
| Live Show (Wheel of Fortune) | `Live.tsx` + `liveshow/{Dealer,WheelCanvas,BonusGames}` + `lib/liveshow/engine` | ❌ | ✅ |
| Gold Slot | `gold_slot/GoldSlot.tsx` + 심볼/페이테이블 | △ (12개 슬롯 이미 있음) | ⚠️ 보류 |
| Provably Fair | `lib/originals/{provablyFair,usePF}` + `PFModal` | ❌ (Phonara `/fairness`는 다른 구조) | ✅ |
| Originals 허브 | `Originals.tsx` | — (Phonara `/games` 있음) | ❌ 통합 |
| Slot/Login/Signup/Profile/Wallet/Promotions/MyHistory/Leaderboard/Vip/Admin/Index | Phonara에 전부 존재 + 더 강력 | ✅ | ❌ |

**순 신규 자산 = 7개 게임 + 1 PF 모듈**

## 2. 절대 지켜야 할 Phonara 규약

원본 코드는 **그대로 못 씁니다**. 다음 항목을 강제 적용 후 머지:

### A. 머니플로 격리 (가장 중요)
- 원본의 `useWallet` / 직접 잔액 변경 코드는 **전부 제거**.
- 모든 베팅·정산은 Phonara 서버 RPC로만:
  - 베팅 인텐트 → `imperial_place_phon_bet` 패턴을 게임별로 신규 RPC 추가 (`crash_place_bet`, `plinko_place_bet`, `roulette_place_bet`, …)
  - 정산 → `_apply_house_edge_split(total, ref_id)` 45/35/15/5 단일 tx 재사용 (Treasury Flywheel 그대로 흡수)
  - 트리거 가드 → `imperial_kill_switches.betting` BEFORE INSERT 체크
- 클라이언트는 잔액을 **표시만** 하고 절대 직접 수정 금지 (`useMyPower`/`useWallet` 읽기 전용)

### B. 디자인 토큰 강제 변환
- 원본 색 (gold/black 하드코딩) → Phonara `imperial-card`, `gradient-gold`, `text-gradient-gold`, `pulse-halo`, `glow-gold`로 1:1 치환
- 직접 `bg-yellow-*`, `text-white`, `#FFD700` 같은 값 **금지** — ESLint 통과 안 됨
- 카드 = `<div className="imperial-card imperial-card-hover">` 패턴

### C. 패키지/Alias 규약
- 신규 코드는 `@pkg/game-engine/` 또는 `@pkg/games/<game>/` 하위에만 배치
- 페이지는 `src/pages/games/<Game>.tsx` (이미 `Casino.tsx` 룩업 패턴 존재)
- 라우트는 `Casino.tsx` lazy prefetch와 동일 패턴

### D. Realtime/사운드/햅틱
- `supabase.channel(...)` 직접 호출 금지 → `useGameChannel(...)` 만 사용
- 사운드 = `useSlotSound()` / `useImperialThunderWithReverb` 재사용 (원본 `crash/sound.ts` 폐기 또는 어댑터화)
- `sonner` 직접 호출 금지 → `@/lib/notify` 만

### E. Provably Fair
- 원본의 `provablyFair.ts` SHA-256 시드 로직은 **서버 RPC로 이전**: `pf_commit(server_seed_hash)` → `pf_reveal(round_id)` 패턴
- 클라이언트 시드 검증 UI만 유지 (`PFModal` → `<FairnessVerifierModal>`)
- Phonara `/fairness` 페이지에 신규 검증 카드 추가

### F. 권한/Kill Switch/AAL
- 신규 RPC는 전부 `function_permissions_baseline`에 등록 (CI drift 통과)
- `imperial_kill_switches`에 `crash`/`plinko`/`roulette`/`baccarat`/`blackjack`/`powerball`/`liveshow_wheel` 7종 default OFF 추가
- 관리자 패널 (`/admin/duel` 옆에 `/admin/originals` 신설) — AAL2 보호

### G. Bundle Budget (PR-L)
- 신규 게임 청크 = `manualChunks` 에 `games-crash`, `games-plinko`, … 별도 분리
- 각 50KB 이하 (size-limit.config.json 라인 추가)
- 메인 entry preload 차단 패턴은 슬롯과 동일

## 3. 작업 순서 (Phase 단위, 머지 가능 단위)

각 Phase 끝 = 머지·배포 가능 + 테스트 + 머니플로 git diff=0 검증.

```text
Phase 0  스캐폴드        (PR-AETHER-00)  1일
Phase 1  Provably Fair v2 (PR-AETHER-01)  1일   ← 모든 게임의 전제
Phase 2  Crash           (PR-AETHER-02)  2일
Phase 3  Plinko          (PR-AETHER-03)  1일
Phase 4  Roulette        (PR-AETHER-04)  2일
Phase 5  Blackjack       (PR-AETHER-05)  2일
Phase 6  Baccarat        (PR-AETHER-06)  1.5일
Phase 7  Powerball       (PR-AETHER-07)  1일
Phase 8  Live Show Wheel (PR-AETHER-08)  2일
Phase 9  통합 Originals 허브 + /admin/originals + Kill Switch UI  1일
```

### Phase 0 — 스캐폴드
- `src/packages/games/{crash,plinko,roulette,blackjack,baccarat,powerball,wheel}/` 디렉토리 + 빈 `index.ts`
- `@pkg/games/*` alias 추가 (vite.config + tsconfig)
- `supabase/migrations/` : 7개 kill_switch row INSERT
- `function_permissions_baseline` placeholder 14 row (game×bet/settle)
- size-limit, dependency-cruiser 룰 추가

### Phase 1 — Provably Fair v2 (공용 전제)
- 마이그레이션:
  - `pf_server_seeds(round_id, game, server_seed, server_seed_hash, revealed_at)`
  - RPC: `pf_commit(game, round_id)` / `pf_reveal(round_id)` / `pf_verify(seed, hash, nonce)`
- 클라: `@pkg/games/core/pf.ts` + `<FairnessVerifierModal>`
- Phonara `/fairness` 페이지에 카드 1개 추가

### Phase 2~8 — 각 게임 공통 작업 항목
1. **RPC 2종 작성** (`<game>_place_bet`, `<game>_settle`) — `_apply_house_edge_split` 재사용
2. **kill switch 가드 트리거**
3. **클라 페이지** = AETHER 원본 → Phonara 토큰/realtime/notify로 리팩토링
4. **베팅 위젯** = `<RealBetSlip>` 패턴 복제 (frozen 가드, leverage cap)
5. **사운드/햅틱** = Phonara 훅 재사용
6. **사진/캔버스** = AETHER 원본 거의 그대로 (시각 자산)
7. **테스트** = `src/__tests__/games/<game>/` — house edge 시뮬 1000 spin PASS
8. **size-limit 검증** + **money-flow freeze 검증**

### Phase 9 — 통합 UI
- `src/pages/games/Originals.tsx` (Phonara 톤) — 7개 게임 카드
- `/admin/originals` AAL2 — 7개 게임 KPI + Kill Switch row + 24h 손익
- 홈 `/dashboard`에 신규 게임 마키 한 줄 추가

## 4. 네이밍 규칙 (초고수 기준)

| 항목 | 규칙 | 예 |
|---|---|---|
| 페이지 | `src/pages/games/<Pascal>.tsx` | `src/pages/games/Crash.tsx` |
| 게임 패키지 | `@pkg/games/<kebab>/` | `@pkg/games/crash/` |
| 컴포넌트 | `<Pascal><Domain>.tsx` | `CrashCanvas.tsx`, `RouletteWheel.tsx` |
| 훅 | `use-<kebab>.ts` → `use<Pascal>` export | `use-crash-round.ts` |
| RPC | `<game>_<action>` snake_case | `crash_place_bet`, `roulette_settle` |
| Kill Switch key | `<game>` 단일 단어 | `crash`, `wheel` |
| 마이그레이션 파일 | `YYYYMMDD_aether_<game>_v1.sql` | `20260520_aether_crash_v1.sql` |
| 테이블 | `<game>_rounds`, `<game>_bets` | `crash_rounds`, `crash_bets` |
| 청크 | `games-<game>` | `games-crash` |
| 메모 | `mem://features/aether-<game>-import` | `mem://features/aether-crash-import` |

## 5. 머지 게이트 (각 PR 통과 필수)

- [ ] money-flow-freeze 8경로 git diff = 0
- [ ] dependency-cruiser PASS (`@pkg/games` → operator 차단)
- [ ] size-limit PASS (game 청크 ≤ 50KB)
- [ ] ESLint PASS (sonner 직접 호출 0, raw channel 0, 하드코딩 색상 0)
- [ ] `check_permission_drift()` 0건
- [ ] house edge 시뮬 1000-spin 결과 ±0.5% 이내
- [ ] kill switch ON 시 베팅 RPC 즉시 실패 (e2e)
- [ ] Bundle Budget PR 코멘트 회색/녹색만

## 6. 즉시 작성될 첫 파일 (Phase 0 산출물 미리보기)

```text
src/packages/games/core/pf.ts
src/packages/games/core/houseEdge.ts
src/packages/games/{crash,plinko,roulette,blackjack,baccarat,powerball,wheel}/index.ts
supabase/migrations/20260520_aether_phase0_killswitches.sql
vite.config.ts (manualChunks: games-* 7종)
size-limit.config.json (+7 entries)
.dependency-cruiser.cjs (games 레이어 추가)
mem://features/aether-import-plan
```

## 7. 비기술 팀장 요약 (1문단)

다른 프로젝트 AETHER에 만들어둔 7개 게임(크래시·플링코·룰렛·블랙잭·바카라·파워볼·라이브휠)을 Phonara에 옮겨옵니다. 슬롯은 이미 있어서 안 옮깁니다. 그냥 복붙하지 않고, Phonara의 돈 흐름(베팅·정산·금고 분배)·디자인·관리자 차단 스위치·공정성 검증 규칙에 전부 맞춰서 다시 짭니다. 한 게임씩 따로 PR을 올려 1~2일 단위로 점진 배포하고, 매 PR마다 자동 검사 8종을 통과해야 머지됩니다. Phase 0(준비) → Phase 1(공정성 공용 모듈) → 게임별 7 Phase → Phase 9(허브/관리자)로 총 9단계, 약 13.5일.
