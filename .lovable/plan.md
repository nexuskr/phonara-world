# Phase F — VAPID 키 안전 교체 + Web Push 페이로드 강화

## 목표
노출된 이전 VAPID 키 쌍을 폐기하고, 새 Public Key 적용 + Private Key/Subject를 Edge Function Secret으로 안전 등록. send-push 페이로드를 화이트리스트로 강제해 민감정보 누출 차단.

## 변경 파일 (최소 변경 / money-flow 무관)

1. `src/lib/push.ts`
   - `VAPID_PUBLIC_KEY` 상수만 새 키로 교체
     `BMfwLBG20DrJp7DxWWb4yV__c1aESDE08XG1AZkWUEQH8u7ACixP15nibjRe8HJAw-Jk4bDRYYZdHT8UY3NRtqA`
   - 나머지 로직(`subscribePush`/`unsubscribePush`/`isPushActive`) 무변경

2. `supabase/functions/send-push/index.ts`
   - 기존 `VAPID_PUBLIC_KEY` env 값을 새 키와 일치시키도록 Secret 갱신만 필요 — 코드 변경은 `createSecurePayload(...)` 화이트리스트 도입 한 곳:
     - 허용 필드: `title`, `body`, `icon`, `data.url`, `data.type`
     - 그 외 필드는 모두 제거 (특히 `amount`, `balance`, `phon`, `kr_won`, 사용자 PII 등)
   - 호출부에서 이 함수로 payload 생성 후 `webpush.sendNotification`에 전달
   - VAPID 설정은 기존 `webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)` 유지

3. `public/sw.js` / `public/sw-push.js`
   - Public Key는 SW에 하드코딩되어 있지 않음(서버 응답으로 동작) → **수정 불필요**. 확인만.

## Secret 등록 (사용자 액션 + secrets 도구)

Edge Function Runtime Secret 3개:
- `VAPID_PUBLIC_KEY` = `BMfwLBG20DrJp7Dx...tqA` (위 새 키)
- `VAPID_PRIVATE_KEY` = 사용자가 secrets 폼에 직접 입력 (채팅/코드에 노출 금지)
- `VAPID_SUBJECT` = `mailto:team@phonara.world`

기존 노출된 키 쌍(이전 채팅에 평문 노출된 `VhJQ...8Qg`)은 **사용해서는 안 됨** — 이미 폐기 처리된 것으로 간주. 새 키 쌍을 사용자가 로컬 `npx web-push generate-vapid-keys`로 생성한 결과를 입력.

## 절대 불변 (검증)
- money-flow 8경로 PRJ_FREEZE diff = 0
- `scripts/check-operator-isolation.mjs` PASS
- `npm run size:check` index delta ≈ 0 (push.ts 단일 문자열 교체)
- 새 키로 브라우저 구독 → 테스트 푸시 성공

## 보안 핵심
- Private Key는 **오직** Edge Function Secret에만 존재 — repo/클라이언트 0
- 페이로드 화이트리스트로 잔액/금액 등 송신 차단
- 새 키 적용 후 기존 `push_subscriptions` 행은 그대로 유효 (구독 endpoint는 브라우저 측이고, VAPID는 발신자 신원만 검증)

## 단계
1. 사용자: `npx web-push generate-vapid-keys`로 새 키 쌍 로컬 생성 (이미 Public 제공됨, Private만 준비)
2. agent: secrets 도구로 `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` 입력 폼 표시
3. agent: `src/lib/push.ts` Public Key 1줄 교체
4. agent: `supabase/functions/send-push/index.ts`에 `createSecurePayload` 화이트리스트 추가 + 호출부 적용
5. 검증 스크립트 3종 실행 + 브라우저 구독/푸시 스모크 테스트
