# Slice 7.5 Final Touch + Slice 8 Imperial Duel PVP

두 단계로 진행. **Slice 7.5 시각 폴리시 완료 → 보고 → Slice 8 PVP 시스템 구현.**

---

## Phase A — Slice 7.5 Final Visual Touch (Stake Crusher)

### 목표
Dashboard / Navigation / Landing / 글로벌 토큰을 World #1 Imperial Luxury로 끌어올린다. "와… 미쳤다" 첫인상.

### A1. 글로벌 토큰 강화 (`src/index.css`)
- `imperial-vignette` — radial vignette 강도 ↑ (중앙 투명도 1.0 → 가장자리 deep-black, gold tint 0.06 add).
- `text-shadow-imperial` / `-xl` — gold/pink 다층 drop-shadow에 hot-pink 0.45 외곽 1px hairline 추가.
- `glow-pink-xl` — box-shadow를 2-layer로 (inner gold hairline + outer pink 56px bloom).
- `imperial-card-hover` — `transition: transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms`, hover 시 `translateY(-3px)` + gold hairline + pink bloom 동시.
- `imperial-corner-shine` — 좌상 12% 사이즈 gold sweep, 4s ease-in-out infinite.
- `imperial-card-thin` — 1px gold 0.18 + bg `hsl(var(--background)/0.6)` backdrop-blur.
- `imperial-breathe-soft` — scale 1.000 → 1.006, 3.6s, prefers-reduced-motion guard.
- `--shadow-imperial-deep` 토큰 추가(전역 카드 표준 그림자).

### A2. Landing (`src/pages/Landing.tsx`, `src/components/empire/ImperialLiveWinsRail.tsx`)
- Hero에 SVG gold particle layer(20 dot, blur-md, opacity 0.18, slow drift CSS anim).
- H1 글자 자간 -0.02em, line-height 1.05, `text-shadow-imperial-xl` 유지 + `imperial-breathe-soft`.
- CTA 버튼: `glow-pink-xl` + hover scale 1.025 + active scale 0.985 + 내부 gold→pink gradient 회전 4s.
- Wins Rail jackpot 행: gold border 0.7→0.82, outer pink bloom 44→60px, crown ✨ 회전 + 텍스트 `text-shadow-imperial-xl`.

### A3. Dashboard (`src/pages/Dashboard.tsx` + 관련 카드)
- 산만함 정리: 최상단에 `<ImperialLivePulseRail/>` → `<ImperialLiveWinsRail variant="full"/>` 2단만 hero로. 그 외 위젯은 그리드 2단 아래 `섹션 헤더` + `imperial-card-hover` 단일 톤으로 묶음.
- KpiGridV3 카드: `imperial-card-hover imperial-corner-shine` 적용, 숫자에 `text-gradient-imperial` + `text-shadow-imperial`.
- 카지노/슬롯 진입 카드: `imperial-card-hover` + 우상단 `imperial-pulse-dot`.

### A4. Navigation (`src/components/nav/PhonaraNav.tsx` + FAB)
- Bottom nav 5탭: active indicator를 gold→pink 그라디언트 hairline + 상단 6px glow.
- 중앙 FAB(Half-Off Imperial): `glow-pink-xl` + `imperial-breathe-soft` + hover scale 1.06 + gold ring(2px) on hover, active 시 ring 펄스.
- 모바일 ≥48px 터치 타깃 보장.

### A5. 검증
- `bunx tsc --noEmit`
- `/`, `/dashboard` 시각 확인
- money-flow / Operator / Bundle / Phase D·F 0줄 변경

**Phase A 완료 보고**: "✅ Slice 7.5 Final Touch 완료" → 즉시 Phase B 진행.

---

## Phase B — Slice 8 Imperial Duel PVP

### 핵심
- **1:1 Duel / Royal Battle(4~6) / Emperor Throne(2~8)**
- 모드: **Trade / Slot / Crash**
- PHON 참가비 Lock → 자동 정산, **House Edge 12~15%**
- Realtime Room + Crown Point + 시즌 리더보드 + 연패 보호
- **money-flow 8경로 git diff 0** — 별도 `pvp_ledger` + 전용 RPC

### B1. 데이터 모델 (신규 테이블)
```text
pvp_duels(id, mode, format, capacity, entry_phon, status, seed, symbol,
          created_by, starts_at, ends_at, settled_at, metadata)
pvp_duel_participants(duel_id, user_id, joined_at, position, payout_phon, result)
pvp_ledger(id, user_id, duel_id, kind in (lock|refund|payout|fee), amount_phon, created_at)
pvp_season(id, name, starts_at, ends_at, prize_pool_phon, active)
pvp_season_stats(season_id, user_id, duels_played, wins, crown_points, net_phon, loss_streak)
platform_kill_switches: 'pvp_engine'
```
RLS:
- duels / participants SELECT = authenticated (공개 로비), 변경은 RPC만.
- pvp_ledger SELECT = 본인 + admin.
- season_stats SELECT = authenticated (리더보드), 변경은 RPC만.

### B2. RPC (SECURITY DEFINER, idempotent, kill-switch 가드)
- `pvp_create_duel(_mode,_format,_capacity,_entry,_symbol)`
- `pvp_join_duel(_id)` / `pvp_leave_duel(_id)` / `pvp_cancel_duel(_id)`
- `pvp_settle_duel(_id)` — 시드 기반 순위 산출 + payout/fee 적재 + season_stats upsert(Crown +20/+8/+3, 연패 보호 적용)
- `pvp_get_open_lobby(_limit)` / `pvp_get_my_active()` / `pvp_get_leaderboard(_season?,_limit)` (닉 마스킹)
- 관리자: `admin_pvp_force_settle(_id)`, `admin_pvp_get_metrics_24h()`
- 내부: `_pvp_lock_funds`, `_pvp_credit`, `_pvp_compute_result`

Realtime publication: `pvp_duels`, `pvp_duel_participants` 추가 (구독은 `useGameChannel`만).

### B3. UI (`src/pages/pvp/*`, `src/components/pvp/*`)
- `/pvp` Duel Lobby — 모드·포맷 필터 + 오픈 듀얼 카드 + "도전" CTA + 내 활성 듀얼 핀
- `<DuelCreatePanel/>` — 모드/포맷/capacity/entry PHON 슬라이더 + house edge 안내
- `/pvp/:id` `<DuelRoom/>` — 참가자 슬롯, 카운트다운, 실시간 입퇴장, 긴장 빌드업
- `<DuelResultOverlay/>` — 순위 / Crown Point 변화 / "다시 도전"
- `/pvp/hall` `<DuelLeaderboard/>` — 시즌 Top 50 + 마이 랭크
- `<DuelEntryFAB/>` — 전역(데스크탑 우하단, 모바일 nav 옆), 진행 중 듀얼 시 펄스
- 클라 래퍼: `src/lib/pvp.ts`
- 디자인: Slice 7.5 토큰 적극 활용 (gold 승리, hot-pink 도전)

### B4. 절대 불변
- money-flow 8경로 / Operator Isolation / Bundle Budget / Phase D / Phase F **0줄 변경**
- raw `supabase.channel(...)` 금지 — `useGameChannel`만
- 디자인 토큰만, sonner 직접 호출 금지(`@/lib/notify`)
- 신규 SECURITY DEFINER 함수는 `function_permissions_baseline` 등록

### B5. 작업 순서
1. Migration A — 테이블 + RLS + 인덱스 + kill switch 시드
2. Migration B — RPC + 내부 함수 + permission baseline
3. Realtime publication
4. 클라 라이브러리 + 컴포넌트 + 라우트 + FAB 마운트
5. 검증 — `bunx tsc --noEmit`, /pvp 수동 흐름, force_settle 확인, freeze CI

### B6. 체크리스트
- [ ] money-flow freeze 0 줄
- [ ] pvp_ledger SELECT 본인 전용
- [ ] pvp_settle_duel 중복 idempotent
- [ ] kill switch ON 시 create/join 차단
- [ ] 리더보드 닉 마스킹
- [ ] Bundle Budget 통과

**Phase B 완료 보고**: "✅ Slice 8 Imperial Duel PVP System 완료" + 주요 스크린샷.
