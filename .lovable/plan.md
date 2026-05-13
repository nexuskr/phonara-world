# Phonara Admin — Mission Control (PR-1 ~ PR-10)

> "보는 도구"에서 "돈과 리스크를 2클릭 안에 움직이는 콘솔"로 전환된 어드민 IA + Layout + Cleanup 통합 플랜의 실행 결과 및 다음 단계.

## 🏗️ 아키텍처 개요

```
/admin/*  ──▶  <AdminRoutes>  ──▶  <AdminLayout>
                                   ├─ <AdminSidebar pending={…} />     # 6 섹션 IA
                                   ├─ Sticky Header
                                   │   ├─ <SidebarTrigger>
                                   │   ├─ Breadcrumb + 활성 페이지 pending pill
                                   │   ├─ <AdminCommandTrigger>        # ⌘K (cmdk)
                                   │   ├─ <AdminAal2Chip>              # MFA 상태
                                   │   └─ <AdminPendingBell>           # 큐 팝오버 + 사이렌
                                   └─ <Outlet />
                                        └─ AAL2 섹션이면 <AdminAal2Gate>로 감싸짐
```

## 📁 핵심 파일

| 영역 | 파일 |
|---|---|
| IA / nav config | `src/pages/admin/_nav.ts` |
| Layout shell | `src/pages/admin/_AdminLayout.tsx` |
| Sidebar | `src/pages/admin/_AdminSidebar.tsx` |
| Routes | `src/pages/admin/_AdminRoutes.tsx` |
| ⌘K palette | `src/pages/admin/_AdminCommandTrigger.tsx` |
| Pending bell + 사이렌 | `src/pages/admin/_AdminPendingBell.tsx` |
| AAL2 chip | `src/pages/admin/_AdminAal2Chip.tsx` |
| Cockpit V2 | `src/pages/admin/CockpitV2.tsx` |
| 실시간 카운터 훅 | `src/hooks/use-admin-pending.ts` |
| 사이렌 훅 | `src/hooks/use-admin-siren.ts` |
| 딥링크 하이라이트 훅 | `src/hooks/use-deep-link-highlight.ts` |
| ActionTable 재사용 | `src/components/admin/ActionTable.tsx` |
| Route prefetch 레지스트리 | `src/lib/route-prefetch.ts` (admin 28개 추가) |

## 🗂️ IA — 6 섹션 Sidebar

| 섹션 | AAL2 | 페이지 |
|---|---|---|
| 🎯 COMMAND | — | Cockpit · Funnel · Revenue & Cohorts |
| 💰 TREASURY | ✔ | Deposits · Withdrawals · Packages · Coin · Accounting · Insurance · Phonara Pay |
| 🛡️ COMPLIANCE | ✔ | AML · Trust v2 · Payout Audit · Viral Forensics · Permissions |
| ⚙️ OPERATIONS | ✔ | Observability · Errors · Security · Cron · Daily AI Report |
| 🚀 GROWTH LAB | — | A/B · Bots · EV Health · UGC · Referrals · Whales |
| 👥 PRODUCT | — | Users · Support · Missions · Founding · Beta |

## 🔌 데이터 흐름

- **`useAdminPending(isAdmin)`** — 단일 `admin:pending` 채널 → `deposit_requests`, `withdrawal_requests`, `anomaly_events`, `refund_requests` 4테이블 INSERT/UPDATE 구독, 800ms debounce, `Partial<Record<AdminBadgeSource, number>>` 반환.
- **`useAdminSiren(true)`** — `anomaly_events` INSERT severity=critical|high → WebAudio 2-tone 사이렌. 음소거는 `localStorage.admin_siren_muted_v1`.
- **Document title** — `(N) {활성페이지} · Phonara Admin` 자동 동기화.

## ⚡ 성능

- 단일 `/admin/*` 라우트 → `<AdminRoutes>` 1 lazy chunk.
- 28개 admin 페이지 `route-prefetch.ts` 등록 → Sidebar `NavLink`가 hover/focus/touchstart 시 청크 prefetch.
- Cockpit 진입 시 idle prefetch: deposits / withdrawals / aml / errors.
- Sidebar/Bell/CommandTrigger 모두 `memo()`.

## 🔐 보안

- `AAL2_SECTIONS` (treasury / compliance / operations) → `<AdminAal2Gate>` 하드 차단.
- `useRequireAdmin()` 게이트 통과 후에만 layout 렌더.
- `permission_change_log` realtime → `/admin/compliance/perms` 탭.

## 🔁 레거시 호환

`ADMIN_LEGACY_REDIRECTS` map으로 `/admin/cockpit` → `/admin`, `/admin/kpi` → `/admin/funnel`, `/admin/ops-report` → `/admin/ops/report`, `/admin/support` → `/admin/product/support` 자동 redirect. 단일페이지 레거시 admin은 `/admin/legacy`로 escape hatch.

## ✅ 완료 PR

1. **PR-1 IA + Sidebar config** — `_nav.ts`, `_AdminSidebar.tsx`
2. **PR-2 Layout + Header + Bell + AAL2 chip + ⌘K stub**
3. **PR-3 Cockpit V2** — ActionTiles 5종 + 고위험 출금 TOP8 + 이상 이벤트 8개 + 45초 자동 갱신
4. **PR-4 Routing + 레거시 redirect + Admin.tsx 슬림화**
5. **PR-5 ⌘K Command Palette (cmdk 정식)**
6. **PR-6 ActionTable 재사용 컴포넌트**
7. **PR-7 ?id 딥링크 하이라이트** — Deposits / Withdrawals
8. **PR-8 Sidebar 섹션 합계 카운터 + Breadcrumb pending pill + Tab title sync**
9. **PR-9 Route prefetch 레지스트리에 admin 28개 추가 + idle prefetch**
10. **PR-10 Pending Bell 업그레이드 + critical anomaly 사이렌 (mute 토글)**

## 🎯 다음 후보

- **PR-11**: ActionTable을 신규 Refund/Anomaly 큐에 적용 (bulk 승인 / 일괄 ack)
- **PR-12**: Phonara Pay (TRC20) 콘솔 실데이터 통합
- **PR-13**: ⌘K palette를 user/거래/액션 검색까지 확장 (RPC `admin_search_*`)
- **PR-14**: Cockpit V2 Action Tiles 임계치를 `admin_settings`로 동적화
- **PR-15**: 자동 처리 룰 엔진 (소액 자동승인 80% / 중간 보류 15% / 고위험 사람 5%)
