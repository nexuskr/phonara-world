# Balance System - Single Source of Truth & Role Separation

**Status**: In Progress  
**Date**: 2026-05-22  
**Deciders**: Grok + 팀장  

## Context

PHONARA의 Balance 시스템은 현재 두 개의 주요 테이블이 혼재되어 있습니다:

- `wallet_balances`
- `phon_balances`

초기에는 `wallet_balances`를 단일 Source of Truth로 통합하는 방향을 검토했으나, 조사 결과 `phon_balances`가 PHON 토큰 경제(Duel, staking, betting, mission rewards 등)에서 여전히 광범위하게 사용되고 있음이 확인되었습니다.

## Decision

**`wallet_balances`와 `phon_balances`를 역할에 따라 명확히 분리하여 관리한다.**

### 1. `wallet_balances` (Primary Wallet)
- **역할**: 사용자의 일반 지갑 잔고 관리
- **주요 필드**: `total_balance`, `available_balance`, `locked_balance`, `pending_balance`, `profit_share_balance` 등
- **사용 목적**: 출금, 입금, 일반 자산 관리, Trading 포지션의 locked/available 분리
- **Single Source of Truth**: 일반 지갑 잔고에 대한 기준 테이블로 정함

### 2. `phon_balances` (PHON Token Economy)
- **역할**: PHON 토큰 전용 경제 활동 관리
- **사용 목적**: PHON 스테이킹, Duel 베팅, 미션/보상, PHON 관련 베팅/게임 정산
- **특징**: PHON 토큰의 순환과 경제 활동에 특화됨

## Rationale

- `phon_balances`는 PHON 토큰 경제의 핵심으로, 많은 기존 로직과 마이그레이션에서 깊이 사용되고 있음
- `wallet_balances`는 더 포괄적인 지갑 개념(`available`, `locked`, `pending`)을 잘 표현하고 있음
- 두 테이블을 무리하게 통합하려고 하면 기존 PHON 경제 로직에 큰 영향이 발생할 수 있음
- 역할 분리가 더 명확하고 유지보수하기 쉬운 구조

## Rules (사용 규칙)

| 상황 | 사용 테이블 | 비고 |
|------|-------------|------|
| 일반 지갑 조회 / 출금 / 입금 | `wallet_balances` | Primary |
| Trading 포지션 locked balance | `wallet_balances` | locked_balance 필드 활용 |
| PHON 스테이킹 / unstaking | `phon_balances` | - |
| Duel 베팅 / 정산 | `phon_balances` | 기존 로직 유지 |
| 미션/보상 (PHON) | `phon_balances` 또는 RPC | 상황에 따라 |
| Trading PNL 정산 | `wallet_balances` 우선 검토 | Atomic RPC 권장 |

## Next Actions

### Phase 1 (현재)
- [x] `wallet_balances`를 일반 지갑의 기준으로 선언
- [ ] `phon_balances` 역할 명확화 및 문서화
- [ ] 두 테이블 간 관계 및 동기화 규칙 정의
- [ ] 주요 훅(`use-wallet.ts`, `use-my-power.ts` 등)에 역할 주석 추가

### Phase 2
- Trading 정산 로직이 `wallet_balances`의 `available_balance` / `locked_balance`를 올바르게 다루도록 개선
- PHON 경제 관련 로직은 `phon_balances`를 중심으로 유지하면서 일관성 확보

## Notes

이 결정은 "완벽한 단일 테이블"이 아니라, **현재 코드베이스 현실을 반영한 실용적인 역할 분리**입니다.

장기적으로는 두 테이블 간의 명확한 경계와 동기화 전략을 더 정교하게 다듬을 예정입니다.