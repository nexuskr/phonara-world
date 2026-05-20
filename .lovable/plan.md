# P1-C Hyperion Final v9 — 27 Bug Sweep + 출시 직전 마무리

이전 v8에서 누락/미적용된 항목을 전부 재검증하고, 사용자가 새로 보고한 27개 이슈를 우선순위대로 묶어 한 번에 해결합니다. 머니플로 8경로 / Crown 백엔드 RPC·테이블·트리거 / P0 인증·체결·슬롯 엔진은 **무변경 원칙** 유지.

---

## 0. 즉시 검증 (v8 실제 적용 여부)

1. `withdrawal_status` enum 에 `paid` 정말 추가됐는지 DB 직접 확인 (스크린샷에 `invalid input value for enum withdrawal_status: "paid"` 가 여전히 뜸 → **미적용 확정**)
2. `imperial_get_onboarding_state` 401 — GRANT 실제로 anon/authenticated 부여됐는지 확인 (스크린샷에 401 여전)
3. `check_achievements` 400 Bad Request 원인 추적 (페이로드/서명 mismatch)
4. `support_tickets` 테이블/스키마 캐시 누락 (`Could not find the table 'public.support_tickets'`)
5. `close_position_phon` 400 — v8 PnL 보정 후에도 실패하는 케이스 로그 확인

→ 이 5건을 **단일 migration + 1회 캐시 reload** 로 일괄 처리.

## 1. Critical Blocker (사용자 27 중 즉시 차단)

- **#1 TOTP 6자리 입력 후 등록 안 됨** — `RecoverTotp` / Security 설정 페이지에서 `verify` 호출 후 state 미갱신 + 라우팅 누락 수정
- **#13 트레이딩 진입 실패 "PHON 베팅이 잠시 멈춰있어요"** — kill switch `phon_betting` 강제 OFF 확인 + `open_position_phon` 400 응답 humanError 매핑 + 실 RPC 호출 페이로드 정합
- **#21 PHON↔원화 스왑 AAL2 재요청** — TOTP 이미 보유 사용자는 `aal=aal2` 세션에서 재인증 skip, 클라이언트 가드 조기 종료
- **#10 트레이딩 상단 숫자 변동 시 화면 떨림** — 헤더 컨테이너 `min-h` 고정 + `tabular-nums` + `contain: layout` 추가, 숫자 wrapper 절대 reflow 금지
- **#5 출금 PIN 입력창 키패드 가려짐 (iPhone 11)** — `visualViewport` 기반 `scrollIntoView({block:'center'})` + bottom-sheet `pb-[env(keyboard-inset-height)]`

## 2. Trading 완전 복원 (#12, #14)

- 레버리지: 버튼 chip + **드래그 슬라이더** 동시 제공 (Bybit/Binance 스타일). 1x~Max 연속, 5/10/25/50/75/100 snap, haptic.
- **Isolated / Cross 모드 토글 복원**: 기존 `margin_mode` 컬럼 사용. UI 토글 + 모드별 청산가 재계산 + 경고 모달.
- 모바일에서 슬라이더 트랙 `touch-action: pan-x`, `min-h-11` 보장.

## 3. UX/Navigation 통합 (#2, #4, #11, #20, #25)

- **#2 친구추천 메뉴 독립**: Bottom Nav 옆 또는 "내 제국" 상단에 "친구초대로 ₩30,000" 카드 1개 + 전용 `/referral` 라우트 강화 (How-it-works 3step, 코드 복사 1탭, 카톡/LINE/X 공유 단일 row).
- **#4 배지/업적 단일화**: `/my/badges` 통합 페이지 — Empire Tier · Crown Aura · NFT · Achievements 4섹션 1스크롤.
- **#11 잔액 표시 통합**: 우상단 칩을 `<MultiCurrencyBalance />` 한 줄 (PHON · ₩ · USDT) 토글 회전 또는 펼침.
- **#20 Live 페이지 로고 누락**: `<PhonaraLogo />` 헤더 마운트.
- **#25 등급 통합**: VIP Pass / Empire Tier / Coin Master 3중 표시 → "Empire Tier" 단일 축, VIP는 부가 뱃지로만 노출.

## 4. Crown → PHON 통합 (#23)

- Crown 백엔드 RPC/테이블/트리거 **무변경** (메모리 원칙).
- UI 레이어에서만 Crown 노출 제거: `CrownAura`/`CrownEvent` 토스트 → "PHON 보너스 +N"로 카피 치환. 잔여 Crown 텍스트 일괄 검색 후 PHON 통일.

## 5. Content/Copy (#7, #8, #22)

- **#7 운영원칙 페이지** (`/legal/operating-principles`): Stake/Rollbit 스타일 — TOC 좌측, 카드형 8섹션 (공정성/RNG, 출금정책, 책임도박, KYC, AML, 분쟁해결, 보안, 연락처).
- **#8 1:1 상담 챗봇 기본응답**: FAQ intent matcher (출금/입금/베팅/계정/보안/기타) → 즉시 자동응답 + "상담사 연결" 폴백. `support_tickets` 테이블 복구 포함.
- **#22 "제국의 결혼식" → "NFT 합성 (Fusion)"** 카피 교체.

## 6. Slot/Game Polish (#9, #15, #16, #17, #18)

- **#9 대관전(VIP룸) 진입 카드**: Home/Casino 상단 50-70대 가독성 카드 1탭 진입.
- **#15 슬롯 첫 로드 지연/끊김**: 스프라이트 preload + `requestIdleCallback` 으로 사운드 lazy + spin 프레임 `transform: translateZ(0)`.
- **#16 볼륨/잔고 정리**: 슬롯 HUD 재배치 — 상단 잔고 1줄, 우하단 볼륨/세팅 단일 아이콘 그룹.
- **#17 배당표/룰**: spin 영역 하단 첫 화면에 paytable 칩 + 펼침 패널 (스크롤 강제 X).
- **#18 슬롯 로고/폰트**: Phonara 로고 + 디자인 토큰 typography 통일.

## 7. Empire/Atelier (#19, #24)

- **#19 패키지 중복 정리**: `/packages` 카드 dedupe — Tier별 1개씩만, 비교표 단일 행렬.
- **#24 Atelier "지갑으로 이동" → "내 NFT 컬렉션 보기"** → `/empire/collection`.

## 8. Admin 1인 운영 최적화 (#27)

- `/admin` 사이드바 재정렬: 핵심 5탭만 노출(현황/출금큐/유저/베팅/킬스위치), 나머지는 "고급" 접힘.
- AAL2 보호 유지, Stake/Rollbit급 1-page dashboard (KPI 8 + 펜딩 액션 inbox).

## 9. 기타 (#3, #6, #26)

- **#3 지문(WebAuthn) 인증**: `@simplewebauthn/browser` 등록/검증 플로우 추가 — Security 페이지 토글, 미지원 디바이스 graceful disable.
- **#6 라이브 피드 속도**: `LiveBetFeed` 1.8s + Empire 내부 동작 throttle 검증, 비활성 탭 시 polling 일시정지.
- **#26 매직링크 반복 본인인증**: `profiles.kyc_completed_at` 체크 후 이미 완료 시 `/welcome/identity` skip → 직행 `/dashboard`.

## 10. Yellow 폴리시

- `/secure-auth` hero `<img fetchpriority="high">` + 고정 aspect-ratio
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` Pretendard Regular/Bold 2종
- 27버그 회귀 매트릭스 자동 스크립트 `scripts/qa-matrix-v9.mjs` 생성 → 결과 `reports/qa-matrix-v9.json`

## 11. Publish & Export

- 백엔드(migration/edge)는 저장 즉시 자동 배포 — 보고
- 프론트는 사용자가 직접 **Publish → Update** 1클릭 필요 (대신 눌러줄 수 없음) → 안내
- Export: GitHub 양방향 sync 또는 코드 편집기 하단 "Download codebase" (Paid 워크스페이스)

---

## 기술 상세 (참고)

```text
migrations/
  v9_blockers.sql        -- enum paid 재확인, GRANT, support_tickets 복구, schema reload
src/
  components/trading/
    LeverageSlider.tsx   -- 신규 (드래그 + chip + haptic)
    MarginModeToggle.tsx -- 신규 (isolated/cross)
    PhonOrderPanel.tsx   -- 슬라이더/토글 마운트, 헤더 min-h 고정
  components/wallet/
    MultiCurrencyBalance.tsx -- 우상단 통합 잔액
  pages/
    Referral.tsx         -- 친구초대 단독 페이지 강화
    my/Badges.tsx        -- 배지 단일화
    legal/OperatingPrinciples.tsx
  hooks/
    useWebAuthn.ts       -- 지문/Face ID
    useStepUpGuard.ts    -- AAL2 이미 보유 시 skip
  lib/
    crownToPhon.ts       -- 카피 매퍼
scripts/
  qa-matrix-v9.mjs
reports/
  qa-matrix-v9.json
```

머니플로 8경로 (`open_position_phon`, `close_position_phon`, `swap_phon_krw`, `request_withdrawal`, `imperial_place_phon_bet`, `_settle`, `_apply_house_edge_split`, `apply_token_burn`) 본문 무변경 — `git diff = 0` 자동 검증 PASS 후에만 완료 보고.
