# @pkg/operator — Operator Mode (LOCKED v3.0 §13-3)

운영자 코드 격리 패키지. **user app(@pkg/web 영역)에서 import 절대 금지.**

## 점진 이전 (Week 1~4)

1. **Week 1** — 이 폴더 신설 + admin 컴포넌트 점진 이전 (route는 일단 `/admin/*` 유지).
2. **Week 2** — `vite.operator.config.ts` 별도 빌드 타깃, 별도 entry.
3. **Week 3** — `ops.phonara.world` 서브도메인 라우팅 + AAL2 게이트.
4. **Week 4** — user 번들에서 operator 코드 0bytes 확인 (`source-map-explorer`).

## 강제 규칙

- AAL2 강제 (TOTP 미등록 admin은 등록 강제 — 이미 `AdminAal2Gate`로 구현).
- Realtime 채널은 `admin:*` 만 허용.
- user 영역(`@pkg/wallet`/`@pkg/live`/`@pkg/earn` 등)에서 `@pkg/operator/*` import 금지.
  ESLint `no-restricted-imports` 룰 추가 예정.

## 이전 대상

- `src/pages/admin/*`
- `src/pages/Cockpit*`
- `src/pages/security/*`
- `src/components/admin/*`
