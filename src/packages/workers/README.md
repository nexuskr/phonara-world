# `@pkg/workers` — Imperial Cosmetic Workers

Phase 4 Sprint 2.

## Files

| 파일 | 역할 |
|---|---|
| `imperial_cosmetic_worker.ts` | 순수 Web Worker. **순수 시각 계산만**. 머니플로/RPC/DB 접근 절대 금지. |
| `cosmetic.ts` | 메인 스레드 API + Graceful Degradation. |

## 사용

```ts
import { calcNearMiss, calcMultiplierFrames, calcParticles, calcFortuneScore } from "@/packages/workers/cosmetic";

const score = await calcNearMiss([1, 1, 2, 1]); // 0..1
const frames = await calcMultiplierFrames(1.0, 8.5, 60); // Float32Array
const { xy, vel } = await calcParticles(300);
```

## Graceful Degradation 계층

1. Web Worker (default)
2. `localStorage["phonara:cosmetic_worker:v1"] === "0"` → 비활성화 강제
3. `navigator.deviceMemory < 2` 또는 `hardwareConcurrency < 2` → Main thread fallback
4. Worker 생성/통신 실패 → Main thread fallback (1.5s timeout)
5. Main thread 도 throw → 안전 기본값 (0, 빈 Float32Array)

## 절대 원칙

- 결과는 항상 "표시용 숫자/좌표". 슬롯 결정/배당/잔액 계산에 사용 금지.
- `imperial_*` RPC, `live_position_*`, 머니플로 8경로 본문 변경 0바이트.
- Operator 청크 0바이트 (이 모듈은 일반 사용자 청크).

## Kill Switch

```ts
import { disableCosmeticWorker } from "@/packages/workers/cosmetic";
disableCosmeticWorker(); // 즉시 fallback 으로 전환 (localStorage persist)
```
