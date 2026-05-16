# ADR 0001 — `src/packages/*` alias 골격 (v14.0 Sprint 0)

- **상태**: Accepted (2026-05-16)
- **결정자**: PhonarA World Architect
- **컨텍스트**: v14.0 마스터 플랜은 6개월 후 슬롯·트레이딩·Earn·Live 팀의 독립 개발을 목표로 한다. 동시에 Sprint 0 ~ 4 (12주) 동안은 단일 Vite + React 앱으로 빠르게 출시해야 한다.

## 결정

Sprint 0 에서 **물리적 모노레포 분리(Turborepo)를 하지 않고**, 대신 `src/packages/*` 아래 10개 도메인 폴더를 만들고 TypeScript path alias `@pkg/*` 를 부여한다.

- 폴더: `core / ui / wallet / earn / game-engine / trade / live / avatar-nft / referral / analytics`
- 각 폴더는 `index.ts` 하나로 안정적인 public API 만 노출.
- 기존 `src/components/*`, `src/lib/*` 코드는 **그대로 둠**. 신규 코드만 `@pkg/*` 로 작성.

## 이유

1. **Reversible**: alias 만 깔아두면 코드 이동 없이 의도(도메인 경계)를 표현 가능.
2. **Zero-risk**: 기존 import 경로 변경 없음 → 회귀 0건.
3. **Future-proof**: Sprint 4 종료 후 폴더만 떼서 Turborepo workspace 로 옮기면 됨 (`packages/core` 등). 이때도 import 경로는 `@pkg/*` → `@phonara/*` 정도의 패키지명 치환만 필요.

## 사용 규칙

- **DO**: 신규 도메인 코드(Earn 미션 RPC 래퍼, 환전 로직, Live ticker 등)는 `@pkg/<domain>` 에 작성.
- **DO**: 사용자 가시 텍스트는 `@pkg/core/i18n/glossary` 의 `g(key)` 로만 노출.
- **DON'T**: `@pkg/*` 끼리 순환 import. 일방향(`ui → core`, `earn → core/wallet` 등) 유지.
- **DON'T**: DB 컬럼·RPC 명을 단어 정화 대상으로 보지 말 것. glossary 는 UI 텍스트 전용.

## Sprint 1 이후 계획

- Sprint 1: `@pkg/earn` 에 실제 RPC 래퍼(streak/missions/referral/share/play-to-earn) 채움.
- Sprint 3: `@pkg/wallet` 에 듀얼지갑 + 환전 모듈 분리.
- Sprint 4 종료: 폴더를 `packages/*` workspace 로 물리 분리, `apps/web` 에서만 import.
