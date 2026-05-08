# Phonara — 13개 요청 통합 실행 플랜

요청이 13개로 매우 광범위해, 의존성과 영향 범위에 따라 4단계로 묶어 진행합니다.
각 단계 끝에 동작 확인 후 다음 단계로 넘어갑니다.

---

## Phase 1 — 출금 트랙 (요청 #1~#5)

**범위:** Wallet 영역 강화. 비즈니스 로직 거의 변경 없음, UX/검증/실시간 안정화 위주.

1. **출금 이력 페이지** (`/wallet?tab=history` 보강)
   - `withdrawal_requests` 테이블 기반 전체 조회 — 상태/생성·승인·완료 시각/금액/tx code/거절 사유.
   - 상태 필터(전체·대기·진행·완료·반려), 페이지네이션 20건씩.

2. **알림 설정 패널** (Profile 하위 새 카드)
   - 마이그레이션: `notification_preferences` 테이블 (user_id, channel: push|email|sms, event: withdraw_pending|approved|completed|rejected, enabled).
   - UI: Profile에 토글 매트릭스 (4 이벤트 × 3 채널). 기본값: push=on, email=on, sms=off.
   - 실제 발송 훅은 기존 `notifications` + (있을 경우) email 큐에 연결. SMS는 채널 토글만 우선 — 발송 인프라가 없으면 "준비 중" 배지.

3. **출금 요청 폼 강화**
   - zod 스키마: 은행명·계좌(숫자/하이픈만, 10~20자)·금액(최소·최대·잔액 한도)·예금주.
   - 영수증/스크린샷 업로드 필수 (Storage `withdraw-receipts` 버킷, owner-only RLS, 5MB 제한).
   - 제출 직전 "예상 승인 시간" 카드 표시 — 큐 상태와 tier 기반(우선 큐 평균 시간 vs 일반 큐).

4. **타임라인 → 검수 상세 모달**
   - 본인용: 관리자가 검토하는 필드 그대로(은행/계좌/예금주/금액/스크린샷/AML 레벨/요청 시각) 모달 노출.
   - 관리자에게는 "Open in /admin" 딥링크.

5. **WithdrawQueueStatus 안정성**
   - Realtime channel 재연결 시 자동 재구독, `CHANNEL_ERROR`/`TIMED_OUT` 시 폴링 폴백(15초).
   - "실시간 연결 끊김" 인디케이터 + 수동 새로고침 버튼.

---

## Phase 2 — DM Composer 강화 (요청 #6~#10)

**범위:** Composer 품질·안전성·개인화·이벤트 로깅.

6. **발송량/응답률 저장 + Referral 대시보드 실시간 표시**
   - 마이그레이션: `dm_send_log` 테이블 (user_id, channel, variant_index, sent_at) + `dm_response_log` (user_id, channel, responded_at).
   - DMComposer 복사 시 `dm_send_log` insert. Referral 페이지 상단에 "오늘 DM 복사 N건 / 응답 M건 / 응답률 X%" 위젯 + Realtime 구독.
   - 응답 입력은 우선 수동(원클릭 +1 버튼) — 자동 추적은 Phase 3 캠페인에서.

7. **금지 표현·스팸 위험 점검 + 수정 제안**
   - 클라이언트 사전 점검: 키워드 블랙리스트(확정수익/원금보장/100%/MLM 단어) + 길이/이모지 비율.
   - 생성 후 점검: edge function `dm-composer`에 `audit` 모드 추가 — Lovable AI로 위험도(0~100) + 수정안 1줄 반환.
   - 위험 ≥ 60이면 빨간 경고 + "수정안 적용" 버튼.

8. **플랫폼별 미리보기**
   - 채널별 max length 가이드(카톡 1000자, IG DM 1000자, Threads 500자, 네이버 쪽지 800자, YT 댓글 200자).
   - 각 변형 옆에 "TikTok 화면 미리보기 / IG DM 미리보기" 토글 — 실제 SNS 말풍선 스타일 카드.
   - 길이 초과 시 빨간 카운터.

9. **Composer 입력값 프로필 저장**
   - 마이그레이션: `dm_composer_prefs` (user_id PK, channel, keywords, persona, tone, daily_safe_line, updated_at).
   - 첫 진입 시 자동 로드, 생성 버튼 누를 때 upsert.

10. **UGC 자동 이벤트 로깅**
    - DMComposer 복사 → `ugc_traffic_events`에 dm_sent +1 자동 누적(같은 날·채널 행 upsert).
    - AI Storyteller 실행 시점도 동일하게 기록(채널=etc, note=storyteller 호출).

---

## Phase 3 — UGC 캠페인 & 어드민 (요청 #11~#13)

11. **UGC 대시보드 CSV 내보내기**
    - 현재 필터(기간/채널) 기준 클라이언트에서 CSV 변환·다운로드.

12. **`/admin/ugc` 페이지**
    - 관리자 전용. 전 유저 ugc_traffic_events 합산 + 유저별 그룹·기간 필터·채널 필터·CSV.
    - HubTabs admin 영역에 탭 추가.

13. **UGC 캠페인 관리 UI**
    - 마이그레이션: `ugc_campaigns` (id, user_id, channel, slug unique, label, target_url, created_at, archived_at).
    - 공개 추적 edge function `ugc-track` (verify_jwt=false): `?c=<slug>` 진입 시 `ugc_traffic_events.clicks +1` 후 `target_url`로 302 리다이렉트.
    - UGC 페이지 새 섹션 "캠페인 관리" — 생성/복사/QR/아카이브, 캠페인별 누적 클릭/가입/전환 표시.
    - 추천 링크에도 동일 슬러그 부착 가능(예: `phonara.world/r/CODE?c=ig-reel-01`).

---

## Phase 4 — 회귀 검증

- 마이그레이션 후 linter 통과(0028/0029/0011은 accepted risk).
- 출금 폼 zod 시나리오 테스트.
- `dm-composer` audit 모드 curl 테스트.
- `/ugc`·`/admin/ugc` 시각 QA(390×844 + 1280px).

---

## Technical notes

- 새 테이블 RLS 패턴은 기존(`auth.uid() = user_id` + `has_role 'admin'`)과 동일.
- `update_updated_at_column()`이 없으므로 `tg_set_updated_at()` 재사용.
- Storage 버킷 `withdraw-receipts`는 비공개, owner SELECT/INSERT, admin SELECT.
- `ugc-track`은 봇 어뷰즈 방지를 위해 동일 IP+slug 5분 dedupe.
- `dm_composer_prefs`는 단일 행 upsert(user_id PK).
- 알림 발송은 기존 `notifications` 테이블에 push, email 큐에 email 행을 enqueue. SMS는 토글만 저장.

---

## 실행 순서 제안

승인되면 **Phase 1 → 동작 확인 → Phase 2 → 확인 → Phase 3 → Phase 4** 순으로 진행합니다.
혹은 더 빠르게 가고 싶으시면 "Phase 1+2 한 번에" 식으로 묶어 진행 가능합니다.
다른 우선순위가 있으면 알려주세요(예: 7번 안전 점검을 1번보다 먼저 등).
