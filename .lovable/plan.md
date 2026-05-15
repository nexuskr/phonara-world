# Olympus 1000 — 트럼프×머스크급 완성 계획

## 목표
- 잔존 오류/렉 제거 (모바일 FCP 10.2s → 정상화)
- 자동 스핀(Auto Spin) 구현
- 잔액 실시간 반영 (스핀 직후 차감 → 당첨 시 카운트업, 손실/이득 모두)
- Pragmatic Play / Stake.com 스타일 **스캐터 트리거 연출 → 보너스 화면 전환**
- 게임 룰/페이테이블 인게임 패널
- 슬롯 회전 자체를 매끄럽게 재구성 (릴 단위 감속)

## 확인된 현재 상태
- 백엔드는 정상: `slot_games(olympus_1000)` 정상 등록, `spin_slot_demo` / `claim_demo_refill` 살아 있음
- 렉 1차 원인 = **에셋 과대**: logo.png 2.4MB / sym_helmet 1MB / sym_emperor 882KB / frame.png 905KB
- 회전 미숙 = 통그리드 일괄 교체식, 릴별 감속 없음
- 자동스핀/룰/스캐터 연출/보너스 전환/실시간 잔액 카운트업 모두 미구현
- `/casino` 경로에서도 전역 위젯이 일부 잔존해 슬롯 집중도가 깨짐

## 구현 계획

### 1) 렉/오류 즉시 제거
- 슬롯 에셋 전면 재최적화 (logo/frame/심볼 11종) — 모바일 픽셀 기준 리사이즈 + 압축
- `/casino` 계열은 `CasinoLayout`만 마운트, 전역 오버레이/프리패치/세션성 호출 차단 강화
- `slots-rpc` 에러 매핑 보강 (`auth_required` / `bet_invalid` / `account_frozen` / `trading_halted` 분기 명확화)

### 2) 슬롯 회전 매끄럽게 재구성
- 릴 단위 컴포넌트로 분리, 각 릴이 **순차 감속(0.6s → 0.9s → 1.2s → 1.5s → 1.8s)** 후 정착
- CSS `transform: translateY` + `cubic-bezier(.15,.85,.35,1)` 감속 곡선
- 멈추는 순간 **bounce + 셰이크** + 살짝의 블러 → 클리어
- 셀/릴 메모이제이션, prefers-reduced-motion 존중

### 3) 자동 스핀 (Auto Spin)
- 회수 옵션: **10 / 25 / 50 / 100 / ∞**
- 정지 조건 토글
  - 잔액 ≤ X일 때
  - 단일 승리 ≥ Y배일 때
  - **보너스 트리거 시 즉시 정지** (Pragmatic 표준)
- 진행 중 SPIN 버튼이 STOP으로 전환 + 라운드 카운터 표시
- 연속 실패 자동 정지 (`useAutoBet` 패턴 재사용)

### 4) 실시간 잔액 연출
- 스핀 직후 즉시 베팅액 **차감 애니메이션** (잔액 빨간 펄스)
- 결과 도착 시 승리액을 잔액에 **카운트업 합산** (RAF 기반, ~600ms)
- 패배는 차감 상태 그대로 유지 + 잔액 텍스트 미세 셰이크
- 상단 잔액과 마지막 결과 패널이 동일 소스에서 동기화
- REAL 모드는 `phon_balances` realtime 채널 구독으로 다른 화면 변경분도 즉시 반영

### 5) Pragmatic / Stake 스타일 스캐터 → 보너스 전환 ★핵심
- **스캐터 등장 단계**:
  1. 스캐터 심볼이 멈출 때마다 카운트업 사운드 + 골드 글로우 펄스
  2. 3개 도달 순간 **화면 전체 골드 플래시 + 진동(haptic) + “SCATTER!” 빅 텍스트 줌인**
  3. 스캐터 심볼들이 화면 중앙으로 모이는 **마그넷 애니메이션** (framer-motion layoutId)
- **보너스 인트로 오버레이** (전체 화면, ~3s):
  - 검은 페이드 → 골드 빛줄기 스윕 → "FREE SPINS / BONUS UNLOCKED"
  - 기둥/번개/Zeus 모티프 백드롭 (이미 있는 frame/bg 자산 재활용)
  - 카운트다운 후 보너스 화면으로 슬라이드 전환
- **보너스 화면** = 8세그먼트 **Bonus Wheel**
  - 세그먼트: 2× / 3× / 5× / 10× / 20× / 50× / 100× / **1000× (희귀)**
  - 휠 회전 → 감속 → 포인터 락 → 당첨 칸 펄스 → 승리액 카운트업
  - 결과는 서버 `bonus_multiplier`에 정확히 정착하도록 회전각 계산
- **종료 후**: Epic Win 오버레이로 매끄럽게 이어짐 → 잔액 카운트업

### 6) 승리 강도별 연출 단계
- Win < 10× : 간단한 글로우 + 라인 트레이스
- 10× ~ 50× : **BIG WIN** 골드 카운트업
- 50× ~ 200× : **MEGA WIN** + 코인 파티클
- 200× 이상 : **EPIC WIN** + 화면 진동 + 풀스크린 골드 폭발

### 7) 게임 룰 / 페이테이블 패널
- 슬롯 우상단 ⓘ 아이콘 → 풀스크린 시트
- 탭 구성:
  - **규칙**: 5×3 / 20라인 / Wild / Scatter / Buy Bonus 100× / RTP 96%
  - **심볼 배당표**: 11종 심볼 × 3/4/5매치 배수 (서버 payouts 배열 그대로 노출)
  - **보너스 휠**: 8세그먼트 확률·배수표
  - **Practice vs Real**: DEMO 무료 / REAL은 PHON / NFT 부스트 +0.5% RTP

### 8) 구조 정리 (계획 일치화)
- `OlympusSlot.tsx` 분해
  - `SlotHeader` / `ReelBoard` (릴별) / `SlotControls` / `AutoSpinControls`
  - `WinOverlay` (Big/Mega/Epic) / `ScatterTriggerOverlay` / `BonusIntroOverlay` / `BonusWheel`
  - `BalanceTicker` (카운트업 잔액) / `GameInfoSheet`
- 훅: `useSlotEngine`, `useAutoSpin`, `useBalanceCountUp`, `useScatterChoreography`

## 기술 상세
- 핵심 파일
  - `src/components/slots/OlympusSlot.tsx` (분해)
  - `src/components/slots/reels/*` (Reel, Cell)
  - `src/components/slots/overlays/*` (Scatter/BonusIntro/Wheel/WinOverlay)
  - `src/components/slots/BalanceTicker.tsx`
  - `src/components/slots/GameInfoSheet.tsx`
  - `src/hooks/use-slot-engine.ts`, `use-auto-spin.ts`, `use-balance-countup.ts`
  - `src/lib/slots-rpc.ts` (에러 매핑 강화)
  - `src/components/casino/CasinoLayout.tsx` (전역 위젯 차단 강화)
  - 슬롯 에셋 12종 재압축
- 잔액 동기화
  - DEMO: RPC 응답의 `balance_chips` 즉시 반영 + 카운트업
  - REAL: RPC 응답 + `phon_balances` realtime 구독으로 이중 보장
- 스캐터/보너스 결정성
  - 회전 결과는 항상 서버 `bonus_multiplier`에 정확히 락 — 휠 각도 = `(targetIndex × 45°) + (회전수 × 360°)` 계산 후 정착
- 사운드/햅틱
  - 스캐터 진입·휠 정지·Epic Win에 짧은 SFX + `navigator.vibrate` (모바일)

## 완료 기준
- 슬롯 진입 FCP 정상화, 회전 60fps 체감
- 스핀 시 잔액이 즉시 차감 → 승리 시 카운트업으로 합산되는 게 한 화면에서 보임
- 스캐터 3개 등장 시 Pragmatic 스타일 풀스크린 인트로 → 보너스 휠 → 결과 정착 → Epic Win이 끊김 없이 이어짐
- 자동 스핀이 보너스 트리거 시 자동 정지
- 룰/배당표/보너스 확률이 인게임에서 확인 가능
- 승인된 MVP 구조와 코드 분해가 일치