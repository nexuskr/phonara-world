# 계획

## 목표
슬롯 `SPIN` 버튼 클릭 시 발생하는 `spin_slot_demo 404`와 연쇄 `400` 오류를 한 번에 정리해, 최소한 데모 스핀과 관련 보조 RPC들이 정상 동작하도록 복구합니다.

## 확인된 실제 원인
- `spin_slot_demo` 함수는 DB에 존재하지만, 현재 REST RPC 노출/호출 상태가 깨져 있어 404가 발생하고 있습니다.
- `register_device`는 `anomaly_events.severity` 제약이 `low/medium/high/critical`만 허용하는데 함수가 `info`를 넣어서 400을 유발합니다.
- `get_top_emperor_24h`는 현재 `profiles.user_id`를 참조하고 있는데, 실제 `profiles` 테이블에는 `user_id` 컬럼이 없고 `id`만 있어 함수 내부 SQL이 깨져 있습니다.
- 같은 패턴으로 `get_live_activity_60s` 등 최근 추가된 일부 RPC도 현재 스키마와 불일치할 가능성이 높습니다.
- 여러 보조 RPC 오류가 동시에 터지면서 슬롯 화면에서 실패가 더 커 보이는 상태입니다.

## 구현 단계
1. **DB 함수 복구 마이그레이션 작성**
   - `spin_slot_demo`, `spin_slot_real`, `register_device`, `get_top_emperor_24h`, `get_live_activity_60s`를 현재 스키마 기준으로 재정의합니다.
   - `profiles.user_id` 같은 잘못된 참조를 `profiles.id` 기반으로 바로잡습니다.
   - `register_device`의 이상 이벤트 severity를 제약에 맞는 값으로 수정합니다.
   - 필요한 함수들의 실행 권한을 다시 명시적으로 부여해 RPC 호출 가능 상태를 복구합니다.
   - PostgREST schema cache가 새 정의를 인식하도록 안전하게 반영합니다.

2. **문제 보조 RPC 추가 점검 및 최소 복구**
   - `get_my_dashboard_state`, `check_achievements`, `get_recent_vip_arrivals`도 현재 스키마/권한과 맞는지 점검합니다.
   - 실제로 깨진 함수만 최소 범위로 함께 복구합니다.

3. **프론트 사용부 검증**
   - `OlympusSlot`, `slots-rpc`, auth/device 관련 훅에서 복구된 함수 시그니처와 호출 방식이 일치하는지 확인합니다.
   - 필요하면 실패 메시지 처리만 최소 수정하고, 기능 범위는 넓히지 않습니다.

4. **검증**
   - DB에서 함수 직접 호출로 `spin_slot_demo`와 보조 RPC 응답을 확인합니다.
   - 슬롯 화면에서 더 이상 `404 Not Found` / 연쇄 `400`이 나지 않는지 확인합니다.
   - 사용자 입장에서 `SPIN` 실패 시 잔액 UI가 복구되는 현재 방어 동작도 같이 확인합니다.

## 기술 메모
- 이번 건은 프론트 단독 문제가 아니라 **DB 함수 정의 + 권한 + 내부 SQL drift**가 겹친 장애입니다.
- 특히 `404`는 함수 부재가 아니라 RPC 레이어에서 현재 정의/캐시/권한 상태를 정상 인식하지 못할 때도 발생할 수 있어, 함수 재정의와 권한 재부여를 함께 처리하는 게 안전합니다.
- DB 변경이 필요하므로 먼저 마이그레이션을 만들고, 승인 후 코드/검증 단계로 진행합니다.

## 완료 기준
- `POST /rest/v1/rpc/spin_slot_demo`가 404 없이 응답한다.
- `register_device`가 `anomaly_events_severity_check` 오류 없이 동작하거나 최소한 앱을 깨지 않는다.
- `get_top_emperor_24h` / `get_live_activity_60s` 등 현재 화면에서 호출되는 보조 RPC가 400을 내지 않는다.
- 슬롯 화면에서 `SPIN` 클릭 시 정상 진행된다.