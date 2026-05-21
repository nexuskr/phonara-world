# Balance System - Single Source of Truth Decision

**Status**: Proposed / In Progress  
**Date**: 2026-05-22  
**Deciders**: Grok (AI-assisted) + 팀장  
**Related**: `wallet_balances`, `phon_balances`, `use-wallet.ts`, Trading Engine

## Context

PHONARA의 Balance 시스템은 현재 여러 테이블과 로직이 혼재되어 있습니다.

- `wallet_balances`: `fetchWallet()`, `useWallet` 훅에서 주로 사용
- `phon_balances`: Duel 관련 문서 및 일부 RPC에서 언급됨
- 여러 게임/트레이딩 컴포넌트에서 balance를 직접 참조

이 상태는 데이터 불일치, Race Condition, 유지보수 어려움의 원인이 될 수 있습니다.

## Decision

**`wallet_balances` 테이블을 PHONARA Balance의 공식적인 Single Source of Truth로 정한다.**

모든 사용자 잔고 조회, 업데이트, 실시간 구독은 원칙적으로 `wallet_balances`를 기준으로 한다.

## Rationale

- `use-wallet.ts`와 `fetchWallet()`에서 이미 `wallet_balances`를 중심으로 동작하고 있음
- Realtime 구독도 `wallet_balances` UPDATE를 기준으로 구현되어 있음
- `WalletBalance` 타입이 `total_balance`, `available_balance`, `locked_balance`, `pending_balance` 등을 명확히 정의하고 있음
- 장기적인 확장성과 명확성을 위해 단일 진실 공급원이 필요함

## Consequences

### Positive
- Balance 관련 로직의 일관성 확보
- Frontend에서 balance를 다루는 방식을 통일할 수 있음
- 향후 Trading 정산, 출금, 보상 지급 등의 로직을 명확한 기준으로 개발 가능

### Negative / Risks
- `phon_balances`를 사용하는 기존 로직(특히 Duel)이 있을 경우 마이그레이션 필요
- 기존 코드에서 `phon_balances`를 직접 참조하는 부분이 있을 수 있음

## Action Items

### Immediate (Phase 1)
- [ ] `phon_balances` 테이블의 실제 사용 범위 정밀 조사
- [ ] `wallet_balances`를 Single Source of Truth로 선언하는 문서화 완료
- [ ] 관련 훅/컴포넌트가 `useWallet`을 통해 일관되게 balance를 사용하도록 가이드

### Short-term (Phase 2)
- [ ] Trading 정산 로직이 `wallet_balances`를 기준으로 Atomic하게 업데이트되도록 개선
- [ ] `locked_balance` 처리 로직 명확화

## Notes

이 결정은 "완벽한" 아키텍처가 아니라, 현재 코드베이스 상태에서 가장 현실적이고 유지보수하기 좋은 방향으로 선택한 것입니다.

추후 `phon_balances` 사용 실태를 확인한 후, 필요하다면 별도의 마이그레이션 계획을 수립할 예정입니다.