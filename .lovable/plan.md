# Phase 3 — Active Governance & Detox (PR-I → PR-J → PR-K)

직렬 실행. 본 문서는 **PR-I 완전 설계 + PR-J 후속 플랜**까지 한 번에 담는다. PR-K는 PR-J 머지 이후 별도 plan으로 갱신.

절대 불변 원칙
- 모든 가시 텍스트 = `g('key')` (하드코딩 금지)
- `@pkg/*` alias만 사용
- money-flow 8경로 git diff = 0줄 — `cashLoop.ts` / `walletRefresh.ts` / `phonSpend.ts` / `useWithdrawQueue.ts` / `use-wallet.ts` / `request_withdrawal` 호출부 / `credit_crypto_deposit` 응답 핸들러 / `live_positions` 트리거 클라
- `killCategory`/`killAll` money_flow 이중·삼중 화이트리스트
- 44px+ 터치 타겟, Warm Gold + Hot Pink Neon + Deep Space Black, 5초 룰

---

# PR-I — Active Governor + Degrade Mode

## 1. 변경 파일 목록

**신규**
- `src/hooks/use-degrade-mode.ts`
- `src/components/system/DegradeModeBinder.tsx`
- `src/components/system/DegradeModeBanner.tsx`
- `supabase/migrations/<ts>_pr_i_degrade_mode.sql` (시드 1행 + 컬럼 0개 — 스키마 변경 없음, kill_switch row 추가용)
- `reports/governor.kill.2026-05-17.json`

**수정**
- `src/packages/runtime/runtime.governor.ts` — `killCategory`/`killAll` LIVE
- `src/packages/runtime/runtime.registry.ts` — `clearTrackedInterval(id)` export
- `src/hooks/use-kill-switches.ts` — `degrade_mode` 키 인식
- `src/App.tsx` — `<DegradeModeBinder />` + `<DegradeModeBanner />` 마운트
- `src/pages/admin/SelfHeal.tsx` (또는 현 패널) — Degrade 토글 카드
- `src/packages/core/i18n/glossary.ts` — `degrade.*` 키 7개
- `tailwind.config.ts` — `degrade:` variant 확인 (없으면 추가)

**불변(절대 미접근)**
- `src/lib/cashLoop.ts`, `src/lib/walletRefresh.ts`, `src/lib/phonSpend.ts`, `src/lib/withdrawal/useWithdrawQueue.ts`, `src/hooks/use-wallet.ts`, `supabase/functions/{credit_crypto_deposit,request_withdrawal}/**`, money-flow 12 raw `setInterval` 경로

## 2. 핵심 코드 변경 포인트

### 2-1. `runtime.governor.ts` — Phase 4 LIVE + 삼중 화이트리스트
```ts
const MONEY_FLOW_GUARD: ReadonlyArray<RuntimeCategory> = Object.freeze(["money_flow"]);
const KILLABLE: ReadonlyArray<RuntimeCategory> = Object.freeze(["cosmetic", "admin"]);

function isMoneyFlow(cat: RuntimeCategory): boolean {
  // 1차: 명시 화이트리스트
  if (MONEY_FLOW_GUARD.includes(cat)) return true;
  // 2차: KILLABLE 외 모든 카테고리 차단 (fail-closed)
  if (!KILLABLE.includes(cat)) return true;
  return false;
}

export function killCategory(cat: RuntimeCategory): number {
  if (isMoneyFlow(cat)) {
    console.warn(`[runtime.governor] killCategory blocked: ${cat} is immutable`);
    return 0;
  }
  const ids = listIdsByCategory(cat);
  let n = 0;
  for (const id of ids) {
    try { clearInterval(id); forgetInterval(id); n++; } catch {}
  }
  (window as any).__phonaraGovernor = { lastKill: { cat, n, at: Date.now() } };
  if (import.meta.env.DEV) console.warn(`[runtime.governor] killCategory(${cat}) → cleared ${n} ids`);
  return n;
}

export function killAll(): number {
  // 3차: KILLABLE만 순회 (money_flow 카테고리는 절대 호출 자체가 불가)
  return KILLABLE.reduce((s, c) => s + killCategory(c), 0);
}
```

### 2-2. DB — `platform_kill_switches`에 row 1개 추가
스키마 변경 없음. 기존 row 모델(`key`/`enabled`/`reason`) 그대로 사용.
마이그레이션 파일은 **DDL 0줄 + INSERT ON CONFLICT DO NOTHING 1줄**:
```sql
-- pr_i: register degrade_mode kill switch row (no schema change)
INSERT INTO public.platform_kill_switches (key, enabled, reason)
VALUES ('degrade_mode', false, null)
ON CONFLICT (key) DO NOTHING;
```

### 2-3. `use-kill-switches.ts` — 타입/파서 확장
```ts
export type KillSwitches = {
  trading_halt: boolean;
  withdrawals_halt: boolean;
  signup_halt: boolean;
  maintenance_mode: boolean;
  degrade_mode: boolean;          // ← 추가
  reasons: Partial<Record<Exclude<keyof KillSwitches, "reasons" | "loaded">, string>>;
  loaded: boolean;
};
const DEFAULT: KillSwitches = {
  trading_halt: false, withdrawals_halt: false, signup_halt: false,
  maintenance_mode: false, degrade_mode: false, reasons: {}, loaded: false,
};
```

### 2-4. `use-degrade-mode.ts`
```ts
import { useKillSwitches } from "@/hooks/use-kill-switches";
export function useDegradeMode() {
  const ks = useKillSwitches();
  return { degraded: ks.degrade_mode, reason: ks.reasons.degrade_mode ?? null, loaded: ks.loaded };
}
```

### 2-5. `DegradeModeBinder.tsx` — effect-only
```tsx
import { useEffect, useRef } from "react";
import { useDegradeMode } from "@/hooks/use-degrade-mode";
import { notify } from "@/lib/notify";
import { g } from "@pkg/core/i18n/glossary";

export function DegradeModeBinder() {
  const { degraded } = useDegradeMode();
  const prev = useRef(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (degraded) {
      document.body.dataset.degrade = "1";
      import("@pkg/runtime").then(m => {
        const n = m.killCategory("cosmetic");
        if (import.meta.env.DEV) console.warn(`[runtime.governor] degrade-on → cosmetic cleared ${n}`);
      });
      if (!prev.current) notify.important(g("degrade.banner.on"));
    } else {
      delete document.body.dataset.degrade;
      if (prev.current) notify.passive(g("degrade.banner.off"));
    }
    prev.current = degraded;
  }, [degraded]);
  return null;
}
```

### 2-6. `DegradeModeBanner.tsx` — 50-70대 친화 UX
- 화면 상단 고정 띠, 글자 18px+, 대비 WCAG AAA
- 배경 = `linear-gradient(90deg, hsl(var(--warm-gold)/.18), hsl(var(--neon-pink)/.18))`
- 좌측 큰 아이콘 (44px shield), 중앙 큰 글자 `g('degrade.banner.on')`, 우측 reason
- 닫기 버튼 없음 (관리자만 OFF 가능 — 안심 신호)

```tsx
export function DegradeModeBanner() {
  const { degraded, reason } = useDegradeMode();
  if (!degraded) return null;
  return (
    <div role="status" className="sticky top-0 z-[60] w-full bg-gradient-to-r from-warm-gold/20 to-neon-pink/20 border-b border-warm-gold/40 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 text-foreground">
        <Shield className="h-11 w-11 shrink-0 text-warm-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-tight md:text-xl">{g("degrade.banner.on")}</p>
          <p className="truncate text-sm text-muted-foreground md:text-base">{reason ?? g("degrade.banner.reason_default")}</p>
        </div>
      </div>
    </div>
  );
}
```

### 2-7. `App.tsx` (한 줄씩)
```tsx
<DegradeModeBanner />        {/* 가장 위 */}
<DegradeModeBinder />        {/* effect-only */}
```

### 2-8. Self-Heal 패널 카드 (Operator-only, AAL2)
- 카드 제목 `g('degrade.admin.title')` "🛡 비상 절전 모드"
- 현재 상태 칩(GREEN/AMBER) + reason textarea(필수) + 큰 토글
- ON 시 destructive `ConfirmDialog` (`g('degrade.confirm.on')`)
- 호출: `admin_set_kill_switch('degrade_mode', enabled, reason)`

### 2-9. Glossary 키 (Warm King 톤)
```ts
"degrade.banner.on": "지금 시스템 보호 모드입니다 — 안심하세요, 입출금은 정상입니다",
"degrade.banner.off": "정상 모드로 돌아왔습니다",
"degrade.banner.reason_default": "잠시 후 자동 복구됩니다",
"degrade.admin.title": "비상 절전 모드",
"degrade.admin.desc": "화면 효과를 모두 끄고 시스템을 가볍게 만듭니다. 입출금·베팅은 영향 없습니다.",
"degrade.confirm.on": "정말 비상 절전 모드를 켤까요? 화면 애니메이션이 꺼집니다",
"degrade.confirm.off": "정상 모드로 돌아갈까요?",
```

### 2-10. Tailwind `degrade:` variant
```ts
plugin(({ addVariant }) => {
  addVariant("degrade", '&:where([data-degrade="1"] *)');
  // low/mid/high는 기존 유지
});
```

## 3. 네이밍 규칙 준수

| 항목 | 값 |
|------|----|
| 패키지 alias | `@pkg/runtime` / `@pkg/core/i18n/glossary` |
| 훅 | `use-degrade-mode.ts` → `useDegradeMode` |
| 컴포넌트 | `DegradeModeBinder.tsx`, `DegradeModeBanner.tsx` |
| 카테고리 키 | `"cosmetic" / "admin" / "money_flow"` snake 고정 |
| Kill switch key | `degrade_mode` snake (`*_halt` / `*_mode` 규칙 통일) |
| Migration 파일 | `<YYYYMMDDHHMMSS>_pr_i_degrade_mode.sql` |
| 콘솔 prefix | `[runtime.governor]` 고정 |
| 리포트 | `reports/governor.kill.<YYYY-MM-DD>.json` |
| Tailwind variant | `degrade:` |

## 4. 검증 항목 (전부 PASS 필수)

1. **money-flow freeze**
   `node scripts/check-money-flow-freeze.mjs` → `[freeze] OK — 8 money-flow paths intact`
   PR diff에 `cashLoop|walletRefresh|phonSpend|useWithdrawQueue|use-wallet|credit_crypto_deposit|request_withdrawal` 0 hit.

2. **삼중 화이트리스트**
   DEV 콘솔
   ```
   (await import("@pkg/runtime")).killCategory("money_flow")  // → 0 + warn
   (await import("@pkg/runtime")).killCategory("admin")        // → N≥0
   (await import("@pkg/runtime")).killAll()                    // → cosmetic+admin만
   ```

3. **Degrade Mode E2E**
   `/admin/ops/self-heal` → Degrade ON → 사용자 브라우저
   - `body[data-degrade="1"]`
   - `<DegradeModeBanner />` 노출 (글자 18px+, 대비 OK)
   - `notify.important` 1회
   - `__phonaraSurface.runScenario()` cosmetic bucket = 0 hard
   - OFF → 배너 사라짐 + passive 토스트

4. **Build / Bundle**
   `bun run build` → entry chunk ±0.5KB gz 이내. `scripts/bundle-check.mjs` Layer 1 PASS.

5. **DB Linter**
   `supabase--linter` 신규 경고 0. `platform_kill_switches`에 `key='degrade_mode'` 1행.

6. **RLS 회귀**
   `vitest run src/test/db-permissions.test.ts` PASS.

7. **a11y / Warm King**
   배너 role="status", 글자 ≥18px, 대비 ≥7:1, 터치 타겟 ≥44px.

## 5. 예상 영향 범위

| 영역 | 영향 |
|------|------|
| Bundle | +0.6KB gz (binder + banner + hook). lib 신규 import 0. |
| money-flow | 0줄 diff. 삼중 화이트리스트로 절대 차단. |
| UX 50-70대 | Degrade ON 시 따뜻한 골드/핑크 배너 + 큰 글자로 "입출금은 정상" 안심 메시지. |
| 운영 | Self-Heal 1클릭 토글. 롤백 = OFF 토글 또는 `DELETE FROM platform_kill_switches WHERE key='degrade_mode'`. |
| Cron/Edge | 영향 없음. |

## 6. PR-I 종료 기준

- [ ] 7개 검증 항목 모두 PASS
- [ ] `reports/governor.kill.2026-05-17.json` 커밋 (kill 실측 1회)
- [ ] `mem://features/phase-3-active-governance` 신규 + `mem://index.md` Core 한 줄 추가:
  > Phase 3 Active Governor: `killCategory("cosmetic"|"admin")` LIVE — money_flow 삼중 화이트리스트. Degrade Mode = `platform_kill_switches.key='degrade_mode'` + `useDegradeMode()` + `<DegradeModeBinder/>` + `<DegradeModeBanner/>` + `body[data-degrade="1"]` + Tailwind `degrade:` variant.

**선언**: PR-I 완료 시 → "PR-I 완료. PR-J 준비됐습니다."

---

# PR-J — Realtime Partition 마이그레이션 (PR-I 머지 직후 시작)

## 목적
기존 `useRealtimeChannel` 직접 호출 + 일부 `supabase.channel(...)` 잔존 호출을 `@pkg/realtime` 4-partition 래퍼(`useWalletChannel`/`useGameChannel`/`useChatChannel`/`useMarketChannel`)로 일괄 이전. channel key prefix 강제로 누수/중복 구독 일소.

## 변경 파일
- `src/packages/realtime/index.ts` — 4-wrapper export 정리 + 내부에서 `useRealtimeChannel` 1회만 호출
- 호출부 일괄 (수십 개) — `rg "useRealtimeChannel\(" src` 인벤토리 후 분류
  - `wallet:*` → `useWalletChannel`
  - `game:*`(crown, slot, roulette, live_position) → `useGameChannel`
  - `chat:*` → `useChatChannel`
  - `market:*`(oracle, ticker) → `useMarketChannel`
  - admin은 `useGameChannel("admin:...")` 임시 수용
- `eslint.config.js` — `no-raw-channel` 강화: `useRealtimeChannel` / `supabase.channel` 직접 사용 금지, `@pkg/realtime/*`만 허용. legacy 그랜드파더 = [].
- `mem://realtime/unified-channel` 갱신

## Channel Key 규칙
`<partition>:<resource>[:<id>]` colon-separated, snake.
예: `wallet:balance`, `game:crown_war:42`, `chat:room:lounge`, `market:oracle:btcusdt`.

## 검증
1. `rg "from \"@/hooks/use-realtime-channel\"" src` → **0**
2. `rg "supabase\.channel\(" src` → **0** (libs 내부 wrapper 1곳 제외)
3. DevTools WS frames의 채널 key가 4 prefix 중 하나로만 시작
4. 스모크 회귀: 지갑 잔액 realtime / Crown war 알림 / 채팅 / 오라클 가격
5. `bun run build` + bundle 회귀 ±0.5KB gz

## 예상 영향
- Bundle: 미세 감소 (중복 구독 제거)
- money-flow: wallet partition은 read-only realtime이라 git diff 0줄 유지
- 운영: 채널 key 표준화로 장애 시 분류 즉시 가능

---

# PR-K 예고 (PR-J 머지 후 별도 plan 갱신)

Operator Isolation — `src/pages/admin/**` + `src/components/admin/**` → `src/packages/operator/**` 이전, Layer 1 entry에서 admin lazy 청크 격리, dependency-cruiser layer rule 강화. Layer 1 bundle 예산 ≥10KB 마진 회복.

---

# Phase 3 종료 기준 (PR-I/J/K 모두 머지)

- money-flow 8경로 누적 git diff = 0줄
- Layer 1 bundle 예산 마진 ≥ 10KB
- `__phonaraSurface.runScenario()` degrade ON 시 cosmetic bucket = 0 hard
- ESLint `no-raw-channel` 그랜드파더 = 빈 배열
- `mem://features/phase-3-active-governance` 생성 + index.md Core 갱신
- 각 PR 종료마다 `reports/` 스냅샷 1장씩

---

승인하면 PR-I 즉시 구현 진입.
