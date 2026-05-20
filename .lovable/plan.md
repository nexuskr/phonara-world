# PR-P1-C Slice 3 — 최종 폴리싱

Slice 1 (성능/모바일/잔액/등급/Admin IA) + Slice 2 (친구추천·패키지·잔액·컬렉션·실시간대결 인지성) 완료 후의 마지막 출시 폴리싱 단계.

## 범위 (안전, 추가 기능 없음)

### 1. 슬롯 로비 · 배당표 Stake.com 급 정리
- `/casino` 카드 hover/active 상태 일관성 (imperial-card-hover 통일)
- 슬롯 페이지 상단 RTP/배당표 1행 요약 칩 (RTP · 최대배율 · 최소 베팅) — 칩 컴포넌트 추가만, 게임 엔진 무변경
- "REAL vs DEMO" 모드 토글의 시각적 hierarchy 정리 (큰 라벨 + 컬러 차이)

### 2. 실시간 대결 인지성 강화 (Arena 페이지 본체)
- `/arena/imperial` (ImperialDuelArena.tsx) 상단에 Lobby와 동일한 "지금 N명 · 1분 결과 · 즉시 PHON 지급" 큰 카피 배너
- 베팅 슬립 위에 "이기면 → 지갑에 즉시 입금" 1줄 카피 (50~70대 인지)

### 3. 운영(Admin) IA 최종 폴리시
- `operations` 섹션 13개 → 3개 서브그룹으로 시각적 분리 (헬스/감사/엔진)
- ⌘K 팔레트에 한국어 검색어 동의어 추가 (출금=withdrawals, 충전=deposits 등)
- Pending 뱃지 0건일 때 회색 처리

### 4. 빈상태 · 로딩 · 토스트 final sweep
- 인라인 "내역 없음"/"불러오는 중" 잔재 검색 → `<EmptyState>` / `<LoadingList>` 로 일괄 치환
- `sonner` 직접 호출 잔재 → `@/lib/notify` 로 통일

### 5. SEO · 메타 마무리
- `/`, `/landing`, `/dashboard`, `/wallet`, `/casino`, `/arena`, `/referral`, `/packages` 8개 페이지 title/description/OG 최종 검수
- 누락된 페이지에 `<SEOHead>` 추가
- 단일 H1 보장

### 6. 출시 전 final 검증
- `npm run build` 통과 + bundle size budget 확인 (`reports/bundle.json`)
- `npx tsc --noEmit` 0 errors
- 머니플로 8경로 git diff = 0 검증 (`scripts/check-money-flow-freeze.sh` 또는 grep 베이스라인)
- `/admin` AAL2 보호 라우트 spot-check

## 절대 금지
- 머니플로 8경로 변경
- P0 인증/체결/슬롯 엔진/Crown 백엔드 수정
- 새 기능 추가

## 산출물
- Slice 3 완료 시 보고: 변경 파일 / 빌드·타입체크 결과 / bundle size 변화 / 남은 known issue 리스트
