# Imperial Duel — 중앙 FAB 롱프레스 분기

## 원인 (확정)

`src/components/nav/PhonaraNav.tsx` 의 모바일 하단 중앙 FAB(왕관/PHON)은 단일 `<NavLink to="/phon">`으로 하드코딩되어 있어, 길게 눌러도 PvP(`/duel`)로 진입할 경로가 코드 자체에 없음. Imperial Duel 진입점은 현재 `Home.tsx` 카드 한 곳뿐. → "버튼을 눌러도 안 들어간다"는 정확히는 "그 버튼은 PHON 전용으로 만들어져 있어 PvP 진입선이 없다".

## 해결 — 중앙 FAB 듀얼 액션 (Short = PHON / Long-press = Duel)

기존 시각/그라디언트/라벨 1픽셀도 건드리지 않고, 동작만 분기한다.

### 1) 새 훅 `src/hooks/use-long-press.ts`

- API: `useLongPress({ onShort, onLong, ms = 600 })` → `{ bind: { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, onContextMenu } }`
- pointer down → `setTimeout(ms)` 시작 → 만료 시 `onLong()` + `haptics.success()` + `firedRef=true`
- pointer up → 타이머 살아있고 firedRef=false면 `onShort()` (haptics.select), 아니면 무시
- leave/cancel/contextmenu → 타이머 클리어, fire 안 함
- `onContextMenu` preventDefault (모바일 long-press 컨텍스트 메뉴 차단)
- 5KB 미만, framer-motion 없음 (60fps 안전)

### 2) `PhonaraNav.tsx` 중앙 슬롯 변환

- `<NavLink to="/phon">` → `<button type="button">` (+ `useNavigate`)
- `bind` 스프레드, 클래스/그라디언트/펄스/라벨 동일 유지
- Short = `navigate("/phon")`
- Long = `navigate("/duel")` + `notify.success("⚔️ 황제의 대관전")`(@/lib/notify, 0.8s)
- Long-press 진행 중일 때 `pressing` state → 컴포넌트 내 absolute `<Swords/>` 2개(왼/오 -translate, opacity 0→1, scale 0.6→1, transform-only)가 왕관 양옆에 잠깐 나타남
- `aria-label`: "PHON 허브 — 길게 누르면 황제의 대관전(/duel)"
- `aria-describedby` 힌트 SR-only 텍스트 추가
- prefers-reduced-motion: Sword overlay 생략, 동작은 동일

### 3) Discovery 힌트 (1회)

- localStorage `phonara:duel-longpress-hint:v1` 미설정 시, /home 첫 방문 후 4초 뒤 nav FAB 위쪽에 작은 칩 "꾹 눌러 PvP 입장" 2.5s 표시 후 자동 소멸 + 클릭 시 `/duel`
- 칩은 PhonaraNav 안에 같은 grid의 중앙 슬롯 absolute top으로 그려 추가 layout shift 0
- 이미 사용한 적 있으면 표시 안 함

## 변경 파일

- 생성: `src/hooks/use-long-press.ts`
- 수정: `src/components/nav/PhonaraNav.tsx` (중앙 슬롯만)

money-flow / 라우터 / 결제 / Supabase 무관. Bundle 영향 < 1KB br. index 청크 영향 0.

## QA

- 모바일 short tap → `/phon` 진입
- 모바일 long press(0.6s+) → 햅틱 + Imperial 토스트 + `/duel` 진입
- 데스크탑 마우스 long-press 동일 동작 (pointer 이벤트)
- 우클릭 컨텍스트 메뉴 차단 확인
- prefers-reduced-motion ON 시 Sword overlay 없음, 동작 동일
- console 0, build pass
