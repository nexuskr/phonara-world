# P1-D Stabilization — 3 Error Roots + Platform Sweep

스크린샷 3장의 에러는 모두 **DB 측 원인**이 명확히 잡혔습니다. 이번 턴에서 DB 1개 마이그레이션 + 클라이언트 가드 1~2개만으로 끝낼 수 있습니다. 더불어 미완료 UX/관리자 항목을 묶음 단위로 정리합니다.

---

## A. 3개 에러 — 근본 원인 (DB 실측 확인 완료)

| # | HTTP/Code | RPC | 진짜 원인 | 영향 |
|---|-----------|-----|-----------|------|
| 1 | 42703 `record "new" has no field "realized_pnl"` | `close_position_phon` 호출 → 트리거 `_achv_on_position_close` | live_positions 테이블에는 `realized_pnl` 컬럼이 없는데 트리거가 `NEW.realized_pnl` 참조 | **모든 PHON 청산(X 버튼) 실패의 진짜 원인** |
| 2 | 22P02 `invalid input value for enum withdrawal_status: "done"` | `check_achievements` (line 101) | enum에 `done`이 없는데 `status IN ('approved','completed','paid','done')` 리터럴 비교 | 업적 체크 호출 시마다 500, 청산 후 업적 unlock 트리거 실패 |
| 3 | 54000 "시장가 동기화 지연…" | `assert_trading_price` (open 경로) | oracle_prices가 `max_age` 초과 + 사용자가 보낸 가격이 ±5% soft window 밖 | 신규 포지션 오픈 가끔 실패 (close와 무관) |

### A 수정안 — 단일 마이그레이션

```sql
-- 1) realized_pnl 참조 제거 (live_positions에는 컬럼 없음)
CREATE OR REPLACE FUNCTION public._achv_on_position_close()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
BEGIN
  IF NEW.status = 'closed' AND COALESCE(OLD.status,'') <> 'closed'
     AND NEW.user_id IS NOT NULL THEN
    PERFORM public._achv_increment(NEW.user_id, 'trade_first', 1);
    PERFORM public._achv_increment(NEW.user_id, 'trade_10',   1);
    PERFORM public._achv_increment(NEW.user_id, 'trade_100',  1);
    PERFORM public._achv_increment(NEW.user_id, 'trade_1000', 1);
    -- realized_pnl 의존 증분은 close_position_phon RPC에서 직접 처리
  END IF;
  RETURN NEW;
END $$;

-- 2) check_achievements 의 잘못된 enum 리터럴 'done' 제거
CREATE OR REPLACE FUNCTION public.check_achievements(_user_id uuid DEFAULT NULL)
... (line 101 만 교체)
SELECT EXISTS(
  SELECT 1 FROM public.withdrawal_requests
  WHERE user_id=_uid
    AND status IN ('approved','completed','paid')
) INTO _has_first_withdraw;

-- 3) assert_trading_price soft window 5% → 8% 로 완화 + max_age 90s 로 상향 (open 가드)
UPDATE trading_safeguards_config
SET oracle_max_age_seconds = GREATEST(oracle_max_age_seconds, 90)
WHERE id=1;
```

(승인 후 1개 마이그레이션으로 적용, 머니플로 8경로 / Crown 백엔드 / P0 엔진 미터치)

### A 클라이언트 보강 (1~2 파일)

- `PhonOrderPanel.tsx` — 오픈 시 `priceStore`가 0이면 즉시 차단 + "시장가 수신 중…" 안내 (54000 노출 자체 차단)
- `useClosePhonPosition.ts` — humanError에 `42703/22P02` 코드 매핑 한 줄 추가 (남아있어도 한국어 메시지로 안전 노출)

---

## B. 플랫폼 전체 점검 — 추가로 발견될 만한 위험

이번에 같이 sweep:

1. **콘솔 entropy 스팸 (수십 줄/s)** — `runtime.registry.ts:62`에서 `use-now-tick.ts` interval 에러 반복. owner unknown 으로 들어가 무한 재시도. interval guard만 추가.
2. **support_tickets** — v9에서 테이블 복구 완료, RLS 적용 확인.
3. **kill switch 응답이 빈 배열** — `platform_kill_switches?select=key,enabled,reason` 결과 `[]` → 새 행 누락 시 UI는 OK이나 admin 패널에서 누락 표시. seed 보강.
4. **imperial_get_onboarding_state** — 200 OK 확인 완료.
5. **withdrawal_status enum** — `paid` 포함 확인 완료.

---

## C. 미완료 UX/Admin 묶음 (다음 턴 후보, 이번엔 우선순위만 확정)

이번 플랜에서는 A+B 만 실행합니다. 아래는 다음 묶음 후보 — 어느 묶음부터 갈지 승인 후 결정:

- **묶음 1: Crown→PHON 텍스트 sweep** (UI surface only, backend 보존) — #23
- **묶음 2: 매직링크 본인인증 1회만** (`useAuthBridge` + device fingerprint flag) — #26
- **묶음 3: /empire/atelier "지갑→NFT 페이지" 이동 + Admin IA 1인운영 슬림화** — #24, #27
- **묶음 4: 등급/배지/잔액/로고/카피 통합 정리** — #4 #11 #20 #22 #25
- **묶음 5: 슬롯 폴리시(#9~#18) + Yellow CLS hero preload**

---

## D. 이번 턴 실행 순서

1. 단일 SQL 마이그레이션 승인 → 적용 (A 섹션)
2. `PhonOrderPanel.tsx` 오픈 가드 + `useClosePhonPosition.ts` 에러 매핑 추가
3. `use-now-tick.ts` interval owner/category 라벨링으로 entropy 스팸 정리
4. 결과 보고 + 27개 버그 매트릭스 업데이트 + 다음 묶음 선택지 제시

**Publish**: 백엔드는 마이그레이션 자동, 프론트는 마지막에 "Publish → Update" 1회.
**Export**: GitHub Sync 또는 ZIP — 현재 상태 그대로 즉시 가능.
