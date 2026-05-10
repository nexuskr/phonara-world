
# 운영 마무리 — Cron 정리 + Webhook Dispatcher 버그 수정

승인 시 두 작업을 한 번에 처리한 뒤 E2E 테스트 가이드를 출력합니다.

## 변경 사항

### 1. `liquidation-watcher-30s` cron 잡 완전 삭제
- DB 마이그레이션으로 `cron.unschedule('liquidation-watcher-30s')` 실행
- 잔여 403/500 노이즈 제거, `enforce-position-triggers-1m` 단일 잡으로 일원화
- 엣지 함수 `liquidation-watcher` 자체는 다른 코드가 참조하는지 확인 후 안전하게 제거 (참조 없으면 함께 deploy 삭제)

### 2. `webhook-dispatcher`의 `getClaims` 에러 수정
파일: `supabase/functions/webhook-dispatcher/index.ts` (line 44~53)

**현재 (실패):**
```ts
const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
  global: { headers: { Authorization: authHeader } },
});
const { data: claims } = await userClient.auth.getClaims(token);
const uid = claims?.claims?.sub as string | undefined;
```

**수정 (supabase-js 2.45.0 호환):**
```ts
const { data: userData, error: userErr } = await sb.auth.getUser(token);
const uid = userData?.user?.id;
if (userErr || !uid) {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```
- `sb.auth.getUser(jwt)`는 service-role 클라이언트에서도 정상 동작하며 토큰을 서버 측에서 검증합니다.
- 별도 `userClient` 생성 불필요 → 코드도 더 깔끔.

### 3. `enforce-position-triggers-1m` 유지
- 변경 없음. 매분 실행, Cross MMR 검사 + 절대가 SL/TP/Trailing 모두 처리.

## 처리 절차
1. DB 마이그레이션 실행 (`cron.unschedule`)
2. `webhook-dispatcher/index.ts` 코드 수정 → 자동 재배포
3. 30초 후 `net._http_response`로 403 사라졌는지 확인
4. **"단계 1·3 완료. E2E 테스트 가이드 출력"** 메시지 + 아래 가이드 출력

## E2E 테스트 가이드 (작업 완료 후 출력될 내용)

### A. Isolated + Cross 동시 오픈 테스트
1. `/global-intelligence` 진입, REAL 모드 전환
2. **포지션 1**: BTCUSDT, Isolated, LONG 5×, 50,000 KRW
3. **포지션 2**: ETHUSDT, Cross, SHORT 10×, 30,000 KRW
4. 확인 항목:
   - Open Positions 행 헤더에 `Iso · 50000u` / `Cross` 배지
   - Total PnL 헤더 하단에 Equity / Maint. Margin% 라인 (Cross 보유 시에만)
   - MegaOrderPanel 상단 토글이 Iso/Cross 즉시 반영

### B. 절대가 SL/TP 서버 청산 테스트 (탭 닫기)
1. 새 LONG 포지션 오픈, **TP는 Price 모드**로 현재가 +0.3% 입력
2. 브라우저 탭 완전 종료
3. 1~2분 대기 → 가격이 TP 도달 시 자동 청산
4. 다시 접속 후 Trade History에 `reason='tp'` 확인
5. (선택) `position_trigger_audit` 테이블에 `source='cron'`, `trigger_kind='tp'` 기록 확인

### C. 모바일 Safe Area 실기기 확인
- iPhone 14 Pro Max Safari: Dynamic Island가 콘텐츠 가리지 않음, Bottom Nav가 홈 인디케이터 위에 위치
- Galaxy Z Fold 5 (펼침): Foldable hinge 영역 콘텐츠 정상, 좌우 safe-x 적용
- iPad: 데스크탑 사이드바 정상 표시

### D. Cross 유지증거금 토스트 (선택)
- Cross 포지션 보유 + 가격 급락 시 "Cross 유지증거금 임박" 토스트 1회 표시되는지 확인 (1% 미만 ratio)

---

이 플랜을 승인하시면 즉시 1·2·3을 처리하고 위 E2E 가이드를 출력합니다.
