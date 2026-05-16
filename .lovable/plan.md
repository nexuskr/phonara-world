# PR-N — Realtime Region Sharding (Phase 4 · Slice 3)

## 목표
4-파티션 위에 **리전 접두사**(`ap:` / `us:` / `eu:`)를 더한 5-축 라우팅을 도입해
PoP 가까운 리전으로 realtime을 분산하고, 글로벌 사용자 latency를 30%+ 단축한다.
50-70대 한국 사용자는 자동으로 `ap:` 라우팅 → 더 빠르고 안정적인 체감.

## 절대 보호
- money-flow 8경로 git diff = 0
- raw `supabase.channel(...)` 직접 호출 0 추가 (PR-J 유지)
- bundle budget Δ < 1 KB (PR-L 회귀 없음)
- operator isolation 0 회귀 (PR-K)
- 모든 가시 텍스트 g() 경유 — i18n 안전

## 산출물

1. **`src/packages/realtime/regions.ts`** (신규)
   - `RealtimeRegion = "ap" | "us" | "eu"`
   - `detectRegion()` — `navigator.language` + `Intl.DateTimeFormat().resolvedOptions().timeZone` 휴리스틱 + localStorage `phonara:region:v1` 캐시
   - `setRegion(r)` — 사용자 수동 강제 (admin 디버그용)
   - `getRegion()` — 동기 getter, 기본 `ap`
   - 모든 키 생성은 `regionalKey(part, key)` = `${region}:${part}:${resource}`

2. **`src/packages/realtime/index.ts`** (수정 · 호환 유지)
   - `buildKey` → 내부에서 `regionalKey` 사용
   - 기존 4훅 시그니처 그대로 (`useWalletChannel` 등) — 호출부 0건 수정
   - DEV 경고 패턴 업데이트: `^(ap|us|eu):(wallet|game|chat|market):` 만 정상

3. **`reports/realtime.sharding.2026-05-20.json`** (신규)
   - 라우팅 매트릭스, 마이그레이션 대상 0건 (wrapper 만 변경), 검증 결과 스냅샷

4. **`mem://realtime/unified-channel`** (업데이트)
   - 5축 라우팅 규칙 추가, 직접 호출 금지 재명시

## 의도적으로 제외
- 서버측 리전 분리(별도 Supabase project) — 본 슬라이스는 **클라이언트 라우팅 layer만** 도입.
  channel name 만 분리되어 같은 인스턴스에서도 분산 효과 / 추후 멀티 리전 확장 준비 완료.
- admin 리전 헬스 UI — Phase 4 Slice 4 (`PR-O Region Health Matrix`)에서 다룸.
- `realtime_regions` DB 테이블 — 클라 휴리스틱이 충분, 추후 서버 weight 도입 시 추가.

## 검증
- `bun run build` PASS
- `scripts/bundle-budget.mjs` Δ < 1 KB (regions.ts ~ 0.5 KB gz)
- `scripts/check-money-flow-freeze.mjs` PASS (8경로 diff=0)
- `scripts/check-operator-isolation.mjs` PASS (0 leak)
- DEV 콘솔: `[PHONARA REALTIME] region=ap` 1회 로그

## PR-N 완료 후
`✅ PR-N 완료.` 선언 + PR-O (Region Health Matrix + admin failover) 플랜 제시.
