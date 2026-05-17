# 트레이딩 페이지 완전 강화 + PHON 베팅 실제 연동 (Pass 2 Final)

## 목표

Pass 2 에서 만든 `open_position_phon` / `close_position_phon` RPC, `get_my_phon_leverage_bonus`, `phon_bet_audit` 를 트레이딩 페이지에 실제로 연결하고, Stake.com 수준의 모바일-우선 UX 마감 + Warm King FOMO 레이어를 입힌다. 단, **money-flow 8경로**(특히 `MegaOrderPanel.tsx`)는 단 1바이트도 변경하지 않는다 — PHON 전용 컴포넌트를 **사이드카(sibling)** 로 추가한다.

## 절대 불변

- FREEZE 8경로 git diff = 0줄 (`MegaOrderPanel.tsx`, `useDeposit*`, `bybit-feed.ts`, `useCrashRound`, `use-kill-switches`, `use-auto-bet`)
- Operator Isolation / Bundle Budget / Realtime Partition / Active Governor 무손상
- 신규 컴포넌트는 모두 `React.lazy` + `src/components/trading/v3/` 아래에만 추가
- realtime 은 `@pkg/realtime` 의 `useMarketChannel` / `useWalletChannel` 만 사용

## 작업 범위

### 1. PHON 베팅 사이드카 (실연동) — `PhonOrderPanel`

- 신규: `src/components/trading/v3/PhonOrderPanel.tsx` (lazy 로드)
  - LONG/SHORT 토글, 레버리지 선택 (1·5·10·25·50·100x, 보유 PHON 한도 자동 클램프)
  - 베팅 PHON 금액 입력 + 25/50/75/MAX 버튼
  - 실시간 예상 청산가 + "수수료 20% 자동 할인" 시각적 강조 (할인 전/후 가격 비교 라인)
  - 제출: `useOpenPhonPosition()` 훅 호출
- 신규: `src/hooks/use-open-phon-position.ts` — `open_position_phon` 래퍼 (idem_key 자동 생성, Warm King 에러 메시지)
- 신규: `src/hooks/use-close-phon-position.ts` — `close_position_phon` 래퍼
- 신규: `src/components/trading/v3/PhonOrderConfirmSheet.tsx` — 모바일 Bottom Sheet 주문 확인 (Thumb Zone 56px 버튼)
- `TradingArenaBybit.tsx` 변경: 기존 `MegaOrderPanel` 영역은 **그대로**, 위/아래로 PHON 사이드카만 추가
  - 데스크탑: 사이드 컬럼에 KRW 패널 위에 탭 토글 ("원화 | PHON(-20%)") 으로 PHON 패널 노출
  - 모바일: 기존 KRW Bottom Sheet 아래 별도 골드 그라디언트 "PHON 으로 진입" CTA 추가

### 2. VIP Room — PHON 레버리지 보너스 실표시

- `VipTradingRoom.tsx`: 상단에 `useMyPhonLeverageBonus()` 결과 라인 추가
  - 활성 시: "폐하의 레버리지 보너스 +{bonus_pct}% · 최종 한도 {effective}x"
  - 비활성 시: "PHON 스테이킹 시 레버리지 +50% 보너스" CTA → `/phon`

### 3. PHON 라이브 FOMO 레이어

- 신규: `src/components/trading/v3/PhonLiveSocialProof.tsx`
  - 공개 RPC `get_phon_traders_24h()` (신규) — 최근 24h PHON 베팅 고유 사용자 수
  - 공개 RPC `get_recent_phon_wins(_limit int)` (신규) — `phon_bet_audit` 에서 action='close', pnl_phon>0 최근 N건, 마스킹 닉네임 + PHON 수익
  - 30초 마키 + 60초 폴링
  - 메시지: "지금 {N}명의 폐하가 PHON 으로 트레이딩 중", "👑 폐X폐 님이 +{X} PHON 수익 실현"
- `TradingArenaBybit.tsx` `PhonBettingNudge` 바로 아래에 lazy 마운트

### 4. 트레이딩 페이지 UI 마감

- `BigPnLHeader`: PHON 포지션이 있으면 KRW PnL 옆에 `PHON PnL` 칩 추가 (`useMyPhonOpenPositions` 신규 훅, `live_positions` realtime → wallet 채널 reuse)
- `LeveragePresetRail`: PHON 보유 시 상단에 "스테이킹 시 +50% 해금" 마이크로카피 추가
- 헤더 아래 상태 칩 줄: "PHON {잔액} · 보너스 +{X}% · 오늘 스왑 한도 잔여 ₩{Y}" — 한 줄 글래스 카드

### 5. Warm King 문구 (전부 한국어, 개발자 용어 0)

- 베팅 성공: "폐하의 PHON 포지션이 열렸어요 — 수수료 {원화환산} 만큼 자동으로 깎였습니다"
- 청산 성공 수익: "축하드려요 폐하 · +{X} PHON 이 다시 손에 들어왔습니다"
- step_up_required: "보안을 위해 2단계 인증이 필요해요. 잠시 후 다시 시도해 주세요."
- feature_disabled: "PHON 베팅이 잠시 멈춰 있어요. 곧 다시 열립니다."
- leverage_exceeds_phon_tier: "이 레버리지는 PHON 을 조금 더 모으셔야 열립니다."
- insufficient_phon: "보유한 PHON 이 부족해요. 지금 충전하시면 즉시 가능해요."

### 6. DB / 엣지 (가벼움 — 표시용 공개 RPC 2개만 추가)

- 신규 migration:
  - `get_phon_traders_24h()` returns int — `SELECT count(distinct user_id) FROM phon_bet_audit WHERE action='open' AND created_at > now()-'24 hours'`
  - `get_recent_phon_wins(_limit int default 8)` returns table(masked_nick text, pnl_phon numeric, closed_at timestamptz) — 마스킹은 `profiles.display_name` 첫 글자 + "X폐" 패턴 reuse
  - 둘 다 SECURITY DEFINER, authenticated 에 GRANT EXECUTE
- `function_permissions_baseline` 두 RPC 추가 (read-only public)

## 변경 파일 목록

**신규 (10개, 전부 lazy/순수표시):**
- `src/components/trading/v3/PhonOrderPanel.tsx`
- `src/components/trading/v3/PhonOrderConfirmSheet.tsx`
- `src/components/trading/v3/PhonLiveSocialProof.tsx`
- `src/components/trading/v3/PhonPositionsList.tsx`
- `src/hooks/use-open-phon-position.ts`
- `src/hooks/use-close-phon-position.ts`
- `src/hooks/use-my-phon-open-positions.ts`
- `src/hooks/use-phon-traders-24h.ts`
- `src/hooks/use-recent-phon-wins.ts`
- `supabase/migrations/<ts>_phon_public_stats.sql`

**수정 (FREEZE 외):**
- `src/pages/TradingArenaBybit.tsx` — lazy import + 사이드카 마운트 (MegaOrderPanel 호출부는 한 글자도 안 바꿈)
- `src/components/trading/v3/VipTradingRoom.tsx` — 레버리지 보너스 라인 추가
- `src/components/trading/v3/PhonBettingNudge.tsx` — 문구 활성화(예정 → 자동 적용)
- `src/components/trading/v3/BigPnLHeader.tsx` — PHON PnL 칩 옵션

**0줄 (FREEZE):**
- `src/components/trading/MegaOrderPanel.tsx`, `src/lib/paper-trading/bybit-feed.ts`, `src/packages/wallet/hooks/useDeposit*.ts`, `src/components/crash/hooks/useCrashRound.ts`, `src/hooks/use-kill-switches.ts`, `src/hooks/use-auto-bet.ts`

## 검증

```
node scripts/check-money-flow-freeze.mjs   # PASS, 8 paths intact
node scripts/check-operator-isolation.mjs  # PASS
npm run size:check                         # PASS (전 추가물 lazy)
```

수동 E2E: KRW 입금 → /phon 스왑 → /arena/trade PHON 탭 → LONG 10x 진입(20% 할인 확인) → 청산 → `phon_bet_audit` 2행 + `phon_balances` 차감/증가 확인.

## 롤아웃

- `platform_kill_switches.phon_betting` 이미 존재 — 문제 시 즉시 OFF.
- PhonHub / Trading 양쪽에 "베타" 칩 유지.
