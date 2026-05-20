# PR-P1-A — Crown UI 완전 제거 + PHON 리브랜딩 + 5탭 Bottom Navigation

P1+P2 통합 작업의 **첫 번째 PR**. 머니플로 git diff=0, 백엔드(award_crown / crown_events / empire_levels) 무변경, UI 레이어만 손댐.

## 목표

1. **Crown 단어/이모지/뱃지/카드/토스트/위젯/카피를 사용자 화면에서 100% 제거**
2. **PHON을 보상의 단일 브랜드로 통일** (단어 매핑 규칙 적용)
3. **5탭 Bottom Navigation을 모바일 OS 기준으로 재구축** (홈 / 무료돈벌기 / 실시간대결 / 실시간예측 / 내PHON)

## 단어 매핑 (사용자 노출 전부)

| Before | After |
|---|---|
| Crown / 👑 | PHON Bonus / PHON Reward |
| Crown Level | VIP Level |
| Crown Point | PHON Point |
| Crown Multiplier · Empire Crown Booster | PHON Booster · VIP Boost |
| Crown War / Crown Aura | PHON War / PHON Glow |
| "크라운 폭발" 등 한글 카피 | "PHON 폭발" / "PHON 잭팟" |

## 새로 만들 파일

- `src/lib/rewards/rewardAdapter.ts`
  - `grantPhonReward(amount, meta)` / `grantVipReward(...)` / `formatRewardLabel(kind)` 제공.
  - 내부적으로 기존 `award_crown` RPC를 호출하지만, 클라 노출 텍스트·이모지는 PHON으로만 변환.
  - 토스트 prefix 통일: `💎 PHON` / `👑VIP`(VIP Pass만 유지).
- `src/lib/branding/crownGlossary.ts`
  - 정적 매핑 테이블 + `phonize(text)` 헬퍼 (i18n 후처리, 기존 카피 우회).
- `src/components/nav/BottomNav5.tsx`
  - 5탭 thumb-zone 네이티브 탭바. `safe-area-inset-bottom` 대응, 48dp+ tap target, `touch-action: manipulation`, haptic glow.
  - 탭: 홈(`/`), 무료돈벌기(`/earn`), 실시간대결(`/duel`), 실시간예측(`/trade`), 내PHON(`/phon`).
  - 활성 탭 = PHON 골드 인디케이터 + Imperial pulse-halo (기존 토큰 재사용).
- `eslint-rules/no-crown-in-ui.js` (또는 간단 grep 스크립트 `scripts/check-no-crown-ui.mjs`)
  - `src/components/**`, `src/pages/**` 내 `Crown`·`👑`·`크라운` 노출 패턴 차단 (admin/operator 청크 + `src/lib/rewards/*` 화이트리스트).

## 편집할 파일

- **Nav 교체**
  - `src/components/Layout.tsx` · `src/components/layout/SlimShell.tsx` · `src/components/nav/MobileShell.tsx` → 기존 `PhonaraNav` / `MobileBottomNav` 대신 `BottomNav5` 마운트.
  - `src/components/nav/PhonaraNav.tsx` · `src/components/nav/MobileBottomNav.tsx` · `src/packages/ui/nav/MainTabs.tsx` → deprecated 표시 후 BottomNav5로 redirect (다음 PR에서 삭제).
- **Crown UI 제거 / PHON 치환**
  - `src/components/empire/WhaleStrikeRail.tsx`, `WhaleStrikeRailV3.tsx`, `CrownAura.tsx`, `EmpireLevelBadge.tsx`, `BaronPromotionDialog.tsx`, `EmpireBoosterTimer.tsx`, `EmpirePopulationPulse.tsx`, `VipArrivalAnnouncer.tsx`, `VipPassBadge.tsx`
  - `src/lib/crown.ts` → 내부 유지하되 export를 `rewardAdapter`로 wrap. 토스트 문구만 PHON으로.
  - `src/components/FloatingChat.tsx` · `src/components/ui/floating-dock.tsx` · `src/lib/ui/floating-slots.ts` → 아이콘/문구 PHON 토큰화.
- **카피·라벨 일괄 치환**
  - `src/i18n/locales/ko/*.json` (및 en/ja 있으면), `@pkg/core/i18n/glossary`, `src/lib/glossary.ts` — Crown 문자열 grep → PHON 매핑.
  - `Index.tsx` 헤더/Hero에 남은 `Crown` import 제거 (lucide `Crown` 아이콘 → `Gem`/`Sparkles`).
- **Admin/Operator 화면도 라벨만 PHON으로** (백엔드 데이터·컬럼명은 그대로).
  - `src/pages/admin/**` Crown War / Crown Funnel 등 탭 제목 → "PHON War" / "PHON Funnel".

## 가드레일

- **머니플로 8경로 git diff = 0**: `imperial_place_phon_bet/_settle/_apply_house_edge_split`, `request_withdrawal`, `credit_crypto_deposit`, `subscribe_vip_pass_phon`, `award_crown`, `claim_daily_attendance_v2`. SQL/Edge 절대 미수정.
- **백엔드 컬럼·RPC명 무변경**: `crown_events`, `empire_levels`, `award_crown` 그대로. 클라 표시만 변환.
- **Operator 청크 격리 유지**: `BottomNav5`는 user chunk only, admin route 무관.
- **Layer 1 gz 영향 최소**: BottomNav5는 단일 컴포넌트 (~3KB), 기존 nav 2~3개 제거로 net 감소 예상.
- **회귀 방지**: `scripts/check-no-crown-ui.mjs` CI 추가, 신규 PR에서 Crown 단어 노출 시 fail.

## 검증

1. `git diff` 머니플로 8경로 = 0 라인.
2. `scripts/check-no-crown-ui.mjs` 통과 (user-facing 컴포넌트에 Crown 0건).
3. 모바일 뷰포트(375×812)에서 BottomNav5 5탭 탭 가능, safe-area 정상.
4. Dashboard / Wallet / Slot / Duel / Trade 페이지에서 "👑", "Crown", "크라운" 표기 0건 (시각 확인).
5. `/admin/ops/imperial-command` 정상 동작 (백엔드 무변경 확인).

## 산출 보고 형식

PR-P1-A 완료 시 다음 형식으로 보고:

```
✅ PR-P1-A 완료
- 삭제/대체된 컴포넌트: ...
- PHON 치환 라벨 수: N개
- 새 BottomNav 5탭 매핑: ...
- 머니플로 git diff: 0
다음: PR-P1-B (Hero + Home + Flow State Engine)
```

PR-P1-B / PR-P1-C는 본 PR 머지 후 별도 plan으로 제출.
