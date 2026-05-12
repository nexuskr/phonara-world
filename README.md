# Phonara

신뢰 가능한 운영 지표를 공개하는 미션·정산 플랫폼.

## 공개 페이지
- `/trust` — 누적 정산·가동률·정책 단언·이상치 등 신뢰 지표
- `/status` — 운영/저하/장애 배지(1분 자동 갱신)

## Public Status API

```
GET https://<project>.supabase.co/functions/v1/public-status
GET https://<project>.supabase.co/functions/v1/public-status?format=shield
```

### 응답 예시 (JSON, 기본)
```json
{
  "status": "operational",
  "uptime_24h": 99.92,
  "uptime_7d": 99.87,
  "p95_ms": 412,
  "last_check": "2026-05-08T01:55:00Z",
  "last_ok": true,
  "generated_at": "2026-05-08T02:00:00Z"
}
```

`status` 값
- `operational` — 정상 (success_rate ≥ 99%)
- `degraded` — 성능 저하 (95% ≤ rate < 99%)
- `outage` — 장애 (rate < 95% 또는 최근 핑 실패)

### Shields.io 배지
```
![status](https://img.shields.io/endpoint?url=https%3A%2F%2F<project>.supabase.co%2Ffunctions%2Fv1%2Fpublic-status%3Fformat%3Dshield)
```

CORS 허용·apikey 헤더만 있으면 누구나 호출 가능합니다.

---

## 독립 운영 (Lovable 비의존 로드맵)

이 repository는 Lovable 없이도 단독으로 빌드/배포할 수 있는 표준 Vite + React + Supabase 스택입니다.

- **Phase 1 (완료)** — 코드 GitHub 독립. 양방향 동기화 활성.
- **Phase 2** — 백엔드(Supabase) 자체 계정으로 이전. 가이드: [`docs/independence/PHASE_2_SUPABASE_MIGRATION.md`](docs/independence/PHASE_2_SUPABASE_MIGRATION.md)
- **Phase 3** — 도메인(phonara.net / phonara.world) 외부 레지스트라 이전 (구매 60일 이후 가능).

### 로컬 개발
```bash
cp .env.example .env   # 값 채우기
bun install
bun run dev
```

### 자체 빌드 / 배포
```bash
bun run build          # dist/ 생성 — 정적 호스팅 어디든 배포 가능 (Vercel / Cloudflare Pages / Netlify)
```
