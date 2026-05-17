# Phonara Naming Conventions

Apply to **new** code. Existing files are not renamed (diff hygiene).

| Kind | Style | Example |
|---|---|---|
| Component | `PascalCase` | `PhonSwapModal`, `DailyMissionCard` |
| Hook | `use` + `camelCase` | `usePhonSwap`, `useDailyMission` |
| Constant | `UPPER_SNAKE_CASE` | `PHON_TOKEN_ADDRESS`, `HOUSE_EDGE_DISCOUNT_RATE` |
| Route | `kebab-case` | `/daily-mission`, `/phon-swap` |
| Error code | `UPPER_SNAKE_CASE` | `INSUFFICIENT_PHON_BALANCE`, `ACCOUNT_FROZEN` |

## Warm King 메시지 톤

사용자에게 노출되는 모든 메시지는 따뜻하고 자연스러운 한국어로. 개발자 용어(RPC, enum, 400, payload 등) 노출 절대 금지.

좋은 예시:
- "잠시 후 다시 시도해 주세요. 폐하의 자산은 안전합니다."
- "지금은 출금이 잠시 멈춰 있어요. 곧 다시 열립니다."
- "축하합니다! 새로운 칭호를 획득하셨습니다."

나쁜 예시:
- "RPC 호출 실패 (status=400)"
- "withdrawal_status enum mismatch"
- "Network error: fetch aborted"
