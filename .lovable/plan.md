# Phase E — Final Slice Closure (1-Line)

ArenaHeader의 하드코딩된 "실전 아레나" 문구를 `FOMO.tradeEyebrow` 토큰으로 교체. 단 1파일, 2줄 변경.

## 변경

**`src/components/arena/ArenaHeader.tsx`**
- L1 아래에 import 추가: `import { FOMO } from "@/lib/glossary";`
- L20: `<div className="eyebrow-imperial">실전 아레나</div>` → `<div className="eyebrow-imperial">{FOMO.tradeEyebrow}</div>`

## 비범위

- money-flow 8경로 (FREEZE) — 0줄
- operator isolation / three3d / Phase D Avatar+Lobby — 무손상
- 기타 모든 파일 — 무변경

## 검증

- `node scripts/check-money-flow-freeze.mjs` PASS
- `node scripts/check-operator-isolation.mjs` PASS
- `npm run size:check` — index 청크 delta ≈ 0
- /arena 헤더에 "실전 아레나" 정상 렌더 (토큰 값 동일)

## 완료 선언

"✅ Phase E — Final Slice 완전 종료. ArenaHeader도 Imperial FOMO 토큰으로 통합되었습니다. money-flow 8경로, Operator Isolation, Bundle Budget 모두 무손상. Phase F (Push Notification + Re-engagement) 준비됐습니다."
