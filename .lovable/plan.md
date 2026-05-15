# Phonara Slot MVP — "Olympus 1000 by Phonara"

Stake.com 스타일 체험판/실제 토글이 붙은 5릴 비디오 슬롯 1개를 자체 테마로 구현합니다. 그래픽은 AI 생성, 수학 모델은 자체 설계, RNG는 서버 검증.

> **법적 안전 원칙**: Uppercut Gaming의 Zeus 1000을 픽셀 단위로 카피하지 않습니다. UI 레이아웃과 게임 흐름의 "느낌"만 차용하고, 모든 심볼/배경/사운드는 자체 제작합니다.

---

## 1. 게임 사양 — "Olympus 1000 by Phonara"

- **레이아웃**: **5릴 × 3행** (MVP) — `ROWS` 상수화로 Phase 1.5에서 5×4 즉시 전환
- **20 고정 페이라인**
- **심볼 9종** (모두 imagegen 자체 생성):
  - Premium 4종: 황제(Phonara crown), 여신, 황금 반지, 헬멧
  - Low 5종: A · K · Q · J · 10 (자체 폰트)
  - Wild: "PHONARA W" 로고
  - Scatter/Bonus: 신전 아이콘
- **테마**: 그리스 신전 + 오로라 배경, 황금 기둥 프레임
- **수학 모델**:
  - RTP 96.0% (Cosmic Emperor NFT 보유 시 +0.5%)
  - 변동성 Medium-High
  - 최대 배수 1,000×
  - **Bonus Wheel 8 세그먼트**: 2× / 3× / 5× / 10× / 20× / 50× / 100× / **1000×** (극소 확률, FOMO 코어)
  - **Buy Bonus**: MVP는 ×100 고정. 버튼 라벨은 `Buy Bonus {multiplier}×` 동적 — Phase 1.5에서 80×/100×/150× 옵션 활성화 시 코드 수정 불필요

---

## 2. 두 가지 모드 (Stake.com 방식)

| 모드 | 베팅 통화 | 결과 저장 | 배지 |
|------|----------|----------|------|
| **체험판 플레이** | 가상 칩 (10,000 무료, 1일 1회 충전) | `slot_demo_balances` | 회색 "DEMO" |
| **실제 플레이** | PHON 토큰 (`phon_balances`) | DB `slot_spins` 전수 감사 | 골드 "REAL" |

상단 우측 토글로 즉시 전환. 실제 모드에서 PHON 0이면 자동 잠금 + "충전" CTA.

---

## 3. 화면 구성

```text
┌─────────────────────────────────────────────────┐
│ 시간 · Olympus 1000              PHONARA GAMING │
├─────────────────────────────────────────────────┤
│  ╔══════[황금 신전 프레임]══════╗                │
│  ║                              ║                │
│ LOGO  [ 5×3 릴 그리드 + 심볼 ]  ║   배경          │
│  ║                              ║                │
│  ╚══════════════════════════════╝                │
├─────────────────────────────────────────────────┤
│ [Buy     [ ⓘ 잔액      [베팅       [SPIN]       │
│  Bonus    $1,866.50 ]   $5.00 ▲▼]   ⚡          │
│  100×]                                           │
├─────────────────────────────────────────────────┤
│ ⛶ ▢ 📈 ↗     오직 Phonara에서   [체험판][실제]  │
└─────────────────────────────────────────────────┘
   Phonara Gaming · {N} 플레이 중       ♡ 팔로우
   Olympus 1000 [VIP 2배]               🏆 1,000.00×
```

- "플레이 중 N": MVP는 **200~300 랜덤 시드**(`useMemo` + 30s마다 ±2 드리프트). Phase 2에서 Realtime presence 채널로 교체.

---

## 4. 기술 스택

- **렌더링**: PixiJS v8 (Canvas + WebGL, 모바일 60fps)
- **애니메이션**: `requestAnimationFrame` + `document.hidden` 가드, blur/backdrop-filter 절대 금지, idle 시 `ticker.stop()`
- **사운드**: Howler.js (옵션, 기본 OFF)
- **상태**: zustand (`useSlotGame`)
- **라우트**: `/casino` (로비) + `/casino/olympus-1000`

---

## 5. 백엔드 (Lovable Cloud)

### 새 테이블
- `slot_games` — 메타 (코드, 이름, RTP, 최대배수, 활성)
- `slot_spins` — 실제 플레이 전수 감사 (user_id, game_code, bet_phon, payout_phon, symbols jsonb, mode, server_seed_hash, server_seed_revealed, client_seed, nonce, created_at)
- `slot_demo_balances` — 데모 칩 잔액 + 마지막 충전 시각

### 새 RPC (SECURITY DEFINER, internal `auth.uid()` 가드, permission baseline 등록)
- `spin_slot_real(_game_code, _bet_phon, _client_seed)` — PHON 차감 → 서버 RNG → payout 지급 → 감사 기록 → seed reveal
  - 가드: `is_account_frozen()`, kill switch `trading_halt`, 베팅 한도, Cosmic Emperor RTP +0.5%
- `spin_slot_demo(_game_code, _bet_chips, _client_seed)` — 동일 RNG, 데모 칩만 차감, DB 미기록
- `claim_demo_refill()` — 잔액 < 5,000이면 10,000 충전 (1일 1회)

### Provably-Fair RNG
- 서버 Mulberry32 + crypto-secure seed
- 스핀 전 `server_seed_hash` 공개 → 스핀 후 `server_seed` reveal → 사용자 검증 가능

---

## 6. UI 컴포넌트 (모두 신규)

```
src/pages/casino/
  CasinoLobby.tsx          — 게임 목록 (현재 1개)
  OlympusSlot.tsx          — 메인 게임 페이지
src/components/casino/
  SlotCanvas.tsx           — PixiJS 마운트 + ROWS 상수
  SlotControls.tsx         — Buy Bonus / 잔액 / 베팅 / Spin
  SlotHeader.tsx           — 시간 + 게임명 + 스튜디오
  SlotFooter.tsx           — 줌·차트 아이콘 + 모드 토글
  SlotGameInfo.tsx         — Phonara Gaming · 플레이중 · 팔로우
  ModeToggle.tsx           — 체험판/실제
  WinOverlay.tsx           — Epic Win만 (MVP), Big/Mega는 Phase 1.5
  FreeSpinWheel.tsx        — 8 세그먼트 휠 (1000× 포함)
  BuyBonusButton.tsx       — `Buy Bonus {multiplier}×` 동적 라벨
src/lib/slot/
  reels.ts                 — 릴 strip + ROWS 상수
  paytable.ts              — 페이라인 + 배당표
  rng.ts                   — 서버 시드 검증
src/hooks/
  useSlotGame.ts           — zustand
  useFakePlayerCount.ts    — 200~300 드리프트 (Phase 2에서 realtime 교체)
```

---

## 7. 자산 생성 (imagegen)

**1단계 (MVP)**: 12장 모두 **standard** 생성
- 배경 1: "그리스 신전 + 워터폴 + 오로라, 시네마틱, 가로"
- 황금 프레임 1: 투명 PNG, 페디먼트 + 양 기둥
- 심볼 9: 정사각 256×256, 통일된 광택
- 로고 1: **"OLYMPUS 1000 by Phonara"** 황금 엠블럼

**2단계 (QA 후)**: 마음에 안 드는 3~4개만 **premium** 재생성

---

## 8. Empire / NFT 시너지 (MVP)

- Cosmic Emperor NFT 보유 → 실제 모드 RTP +0.5% (`spin_slot_real`이 `get_my_total_boost_pct()` 참조)
- Phase 1.5: Bonus 트리거 +X%, Buy Bonus 가격 -10% 등 강한 부스트로 확장

---

## 9. 모바일 성능 가드

- `backdrop-filter` 일체 금지
- 무한 blur/glow 금지 — 정적 그라디언트만
- PixiJS `resolution: Math.min(devicePixelRatio, 2)` 캡
- 탭 비활성/모달 오픈 시 `ticker.stop()`
- 릴 회전 중에만 rAF, idle 시 캔버스 freeze
- 텍스처 스프라이트시트 1장으로 합쳐 드로우콜 최소화

---

## 10. 진입 경로

`/dashboard`에 **"카지노" 카드** 추가 → `/casino` 로비 → `Olympus 1000` 카드 → 게임 진입

---

## 11. MVP에서 안 하는 것

- ❌ Uppercut 에셋/사운드 직접 사용
- ❌ 라이선스 받지 않은 슬롯 엔진
- ❌ 5×4 업그레이드 (Phase 1.5)
- ❌ Buy Bonus 다중 가격 노출 (Phase 1.5, UI prop은 준비)
- ❌ Big Win / Mega Win 연출 (Phase 1.5, Epic Win만 MVP)
- ❌ 실시간 플레이어 수 (Phase 2, MVP는 가짜 드리프트)
- ❌ 2번째 게임 (Phase 2)
- ❌ 실제 카지노 라이선스 (사업 결정)

---

## 12. 작업 순서

1. DB 마이그레이션 (3 테이블 + 3 RPC + RLS + permission baseline 등록)
2. PixiJS / Howler 설치
3. imagegen 12개 자산 생성 (standard, ~3분)
4. SlotCanvas 엔진 + 컨트롤 UI
5. Practice/Real 토글 + Buy Bonus + Free Spin Wheel + Epic Win 오버레이
6. `/casino` + `/casino/olympus-1000` 라우트 + Dashboard 카드
7. 모바일 60fps QA (릴 / Epic Win / 모드 전환 / 휠)
8. QA 후 자산 3~4개 premium 재생성