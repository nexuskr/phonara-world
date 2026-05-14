## 변경 범위
**오직 1개 파일**: `src/components/admin/treasury/WithdrawQueueTable.tsx`

다른 파일(`useWithdrawQueue`, `useRealtimeChannel`, RPC 정의, 라우트)은 손대지 않습니다.

## 사용 RPC (DB에 존재 확인 완료)
- `admin_bulk_approve_withdrawals(_ids uuid[]) returns int`
- `admin_bulk_reject_withdrawals(_ids uuid[], _reason text) returns int`

단건 처리도 길이 1 배열로 동일 경로 사용.

## 구현 사양

1. **상태 추가**
   - `const [pending, setPending] = useState<null | "approve" | "reject">(null);`

2. **벌크 승인 핸들러** (`handleApprove`)
   - guard: `selected.size === 0 || pending` → return
   - `setPending("approve")` → try
   - `await supabase.rpc("admin_bulk_approve_withdrawals", { _ids: Array.from(selected) })` → error throw
   - 성공: `notify.success(\`${count}건 승인 완료\`)` → `setSelected(new Set())` → `await refetch()`
   - catch: `notify.fail("벌크 승인 실패", e)`
   - finally: `setPending(null)`

3. **벌크 거절 핸들러** (`handleReject`)
   - 라벨 "벌크 보류 (UI)" → "벌크 거절"
   - `const reason = window.prompt("거절 사유를 입력하세요");`
   - `if (reason === null || reason.trim() === "") return;`
   - 나머지 흐름은 승인과 동일, RPC만 `admin_bulk_reject_withdrawals` (`_reason: reason.trim()`)

4. **버튼 UI**
   - 두 버튼 모두 `disabled={selected.size === 0 || pending !== null}`
   - 진행 중인 버튼만 `<Loader2 className="w-3 h-3 mr-1 animate-spin" />` + 라벨 유지
   - `onClick`을 `console.log` 대신 핸들러로 교체

5. **import 추가**
   - `Loader2` from `lucide-react`
   - `supabase` from `@/integrations/supabase/client`
   - `notify` from `@/lib/notify`

## 금지 사항 준수
- optimistic update 없음 (refetch만으로 sync)
- `useRealtimeChannel`/`useWithdrawQueue` 미수정
- 새 추상화/유틸 추가 금지
- DB 직접 update 금지 — RPC만
- 기존 정렬·선택·행 렌더·통계 로직 그대로 유지

## 검증
- `rg "console.log" src/components/admin/treasury/WithdrawQueueTable.tsx` → 0
- 빌드 통과
