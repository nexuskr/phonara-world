
# COSMIC EMPEROR V3 — NFT × PHON 수익엔진 (v3 FINAL: 행동 루프 완성)

## 한 줄 요약
입금 → NFT/PHON 폭발 → 즉시 베팅 → 결과 → 복구 또는 연승 → 반복.
서버는 "힘"의 진실, 클라는 "느낌"의 연출.

---

## 현재 상태
- PHON 인프라(`phon_balances`/`phon_transactions`/`get_phon_balance`)만 존재 → 레버리지 미연결
- NFT 0%, 입금 → 보상 훅 0%
- **이미 구현된 것 (재사용)**: `<RecoveryPrompt>`, `<StreakBadge>`, `use-win-streak`, `<CrownAura>`, `<EmpireBoosterTimer>`, `notify`, `<DashboardBetPanel ref={betRef}>`
- `profiles.phon_balance` 컬럼 추가 금지(가드 트리거 충돌)

---

## PR-NFT-1 · 백엔드 엔진

**테이블 `nft_collection`**
```text
id · user_id · type(crown/emperor/founder) · level(bronze/gold/diamond)
boost_pct int 0..50 · source(deposit/baron/founding/admin) · source_ref
unique(user_id, source, source_ref)   -- idempotent
```
RLS: `select_own` + `admin_all`. 변경은 SECURITY DEFINER RPC만.

**RPC (모두 SECURITY DEFINER, idempotent, baseline 등록)**
- `grant_nft_for_deposit(_user, _krw, _deposit_id, _is_first)` — 100k≥diamond+25, 50k≥gold+15, else bronze+5. `_is_first=true`면 boost_pct **+10** ("FIRST EMPEROR")
- `grant_phon_for_deposit(_user, _krw, _deposit_id)` — `floor(_krw*0.1)` 적립
- `get_my_nft_collection()` / `get_my_total_boost_pct()` (cap 100) / `get_my_max_leverage()`
- `get_next_nft_threshold()` → `{next_level, krw_needed}` (입금 유도 카피용)

**`credit_crypto_deposit` 패치 (응답 확장 — 폭발 UX의 연료)**
```sql
v_first := (SELECT count(*)=0 FROM phon_transactions
            WHERE user_id=_user AND kind='deposit_usdt');
PERFORM grant_phon_for_deposit(_user, _krw, _deposit_id);
SELECT * INTO v_nft FROM grant_nft_for_deposit(_user, _krw, _deposit_id, v_first);

RETURN jsonb_build_object(
  'phon_granted', v_phon, 'nft_level', v_nft.level, 'nft_type', v_nft.type,
  'boost_pct', v_nft.boost_pct, 'first_bonus', v_first,
  'max_leverage', get_my_max_leverage_for(_user)
);
```

---

## PR-NFT-2 · 레버리지 게이트

```text
base = phon ≥5000→100 | ≥1200→50 | ≥500→25 | else→10
final = floor(base * (1 + min(boost_pct,100)/100))
```
- **베팅 RPC 진입부 강제**: `if requested_lev > get_my_max_leverage() then raise 'leverage_exceeds_phon_tier'` — 클라 우회 차단
- 클라 미러: `src/lib/leverage.ts` + `src/hooks/use-my-power.ts` (`{phon, nfts, boostPct, maxLeverage, nextThreshold}` + realtime on `phon_balances`/`nft_collection`)
- `<DashboardBetPanel>` 슬라이더 max 클램프 + "5,000 PHON에서 100x 해금" 안내

---

## PR-NFT-3 · 폭발 UX (사용자 1차 추가 3종)

### ① 입금 직후 폭발 토스트 + FIRST EMPEROR 모달
```ts
notify.success(`💥 ${data.nft_level.toUpperCase()} CROWN 획득`, {
  description: `⚡ +${data.boost_pct}% · 🚀 ${data.max_leverage}x 해금`,
});
if (data.first_bonus) openFirstEmperorModal(data);
```
- `<FirstEmperorBurst>`: framer-motion scale-pop + Diamond CrownAura + 황금 파티클

### ② 첫 입금 +10% (서버 + 24h 헤더 배지)

### ③ `<PowerHeader>` 화면 우상단 항상 고정
- Layout `<EmpireBoosterTimer>` 옆 `fixed top-0 right-0 z-50`
- `👑 GOLD · 💰 1,240 PHON · ⚡ +85% / MAX 100% · 🚀 50x` (cap 항상 표시)
- 클릭 → `/empire/collection` (다음 티어까지 ₩20,000 남음 카드)
- realtime 변경 시 0.4s pulse + Crown Aura 반짝임

---

## PR-NFT-4 · 행동 루프 (사용자 2차 FINAL 3종 — 돈 도는 핵심)

### ④ 입금 후 즉시 베팅 강제 흐름 (이탈 30% 차단)
- `<FirstEmperorBurst>` CTA `[🚀 지금 베팅하기]`
- 클릭 → `closeModal()` → `betRef.current?.focusAmount()` + `scrollToBetPanel()` (Dashboard에서 `<DashboardBetPanel ref={betRef}>` 이미 존재)
- 입금이 아닌 일반 NFT 획득(승급·시즌 정산)에는 모달 띄우지 않음 — 폭발은 입금 모먼트에 집중

### ⑤ 베팅 실패 → 즉시 복구 루프 (`<RecoveryPrompt>` 강화)
- 이미 마운트됨. 조건 `lastTrade.pnl < 0 && within30s` 유지
- 보강:
  - 손실액 + "🔁 동일 금액 재도전" 1탭 버튼 → `betRef.current?.resubmit()`
  - 30초 카운트다운 바 (긴급감)
  - 3회 연속 손실 시 "잠시 쉬세요" 카피로 자동 전환 (책임 게이밍 — Trust v2 정책 일치)

### ⑥ 연승 중독 (`<StreakBadge>` 강화)
- 이미 헤더 우측 마운트. 시각 단계 추가:
  - `streak ≥ 3` 표시 시작
  - `≥ 5` glow 펄스
  - `≥ 10` `<CrownAura level={10}>` 적용 + `notify.success("🔥 10연승 — Crown Aura 발동")`
- "지금 멈추면 손해" 느낌은 **시각만으로** — 강제 베팅 트리거는 추가하지 않음 (책임 게이밍)

---

## 사용자 원안 대비 결정
| 원안 | 결정 | 사유 |
|---|---|---|
| `alter profiles add phon_balance` | 거절 | `phon_balances` + 가드 트리거 충돌 |
| 클라 직접 PHON/NFT INSERT | 거절 | RLS·idempotency·민감컬럼 가드 위반 |
| 클라만 leverage 검사 | 보강 | 서버 RPC 강제 |
| 첫 입금 +10% / 폭발 모달 / Header 고정 | 채택 (PR-3) | |
| 즉시 베팅 강제 / 복구 루프 / 연승 단계 | 채택 (PR-4) | |
| RecoveryPrompt 자동 재베팅(무인터랙션) | 거절 | 1탭 명시 클릭 유지 (책임 게이밍 + Trust v2 카피 일관성) |

---

## 산출물 체크리스트
- [ ] migration: `nft_collection` + RLS + 5 RPC + `credit_crypto_deposit` 응답 확장 + 베팅 RPC 가드 + `function_permissions_baseline` 등록
- [ ] `src/lib/leverage.ts`, `src/hooks/use-my-power.ts`
- [ ] `<PowerHeader>` (fixed top-right, cap 표시) · `<FirstEmperorBurst>` · `<NFTCard>` · `/empire/collection` (다음 티어 카드)
- [ ] `<DashboardBetPanel>`: `focusAmount()` 노출 + `useMyPower` 클램프
- [ ] 입금 confirm 흐름에 폭발 토스트 + first-bonus 모달 + scrollToBetPanel
- [ ] `<RecoveryPrompt>` 카운트다운 + 3연패 휴식 카피
- [ ] `<StreakBadge>` 5/10단계 glow + Aura
- [ ] 메모리 Core 추가: PHON 레버리지 공식, boost cap 100, 첫 입금 +10, 입금 후 베팅 강제 흐름
