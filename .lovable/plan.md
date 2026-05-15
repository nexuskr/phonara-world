# 슬롯 배경 강화 — 릴 내부 테마 패턴 + 강한 오버레이

## 사용자 선택

- 릴 안쪽에 테마 패턴(용비늘/룬/구름) 깔기
- 배경 가시성: **5/5 (가장 진하게)**

## 변경

### 1. `theme.bgImage`를 슬롯 컨테이너 전체에 거의 그대로 노출

`OlympusSlot.tsx` 배경 div의 오버레이를 **하단 가독성 영역만 가리는 부드러운 비네트**로 약화:

```
linear-gradient(180deg,
  hsl(var(--background) / 0.10) 0%,
  transparent 30%,
  transparent 60%,
  hsl(var(--background) / 0.75) 100%)
```

배경 사진이 상·중단에서 거의 100% 그대로 보임.

### 2. 릴 프레임을 반투명으로 — 테마 패턴 위에

`themes.ts`의 `reelFrameClass`를 수정:

- **Olympus**: `bg-gradient-to-b from-amber-950/25 to-stone-950/40` + 황금 보더
- **Wizard**: `bg-gradient-to-b from-violet-950/25 to-indigo-950/40` + 바이올렛 보더
- **Dragon**: `bg-gradient-to-b from-red-950/25 to-stone-950/40` + 진홍 보더

(현재는 `/40 → /60`으로 거의 불투명. `/25 → /40`으로 낮춰 배경이 비치게.)

### 3. 릴 내부에 테마 패턴 레이어 추가

`SlotTheme`에 새 필드:

```ts
reelPattern?: string;  // CSS background (gradient/SVG data-uri 반복) — 릴 안쪽에 깔림
```

각 테마용 절차적 SVG data URI 패턴 (외부 파일 0):

- **Dragon**: 황금 비늘 — 반투명 황금 원호 반복 `repeating-radial-gradient`
- **Wizard**: 룬 별자리 — 작은 시안 별점 + 보라 빛망울 `radial-gradient` 다중
- **Olympus**: 그리스 메안더 키 패턴 — 황금 직선 반복

`OlympusSlot.tsx`의 릴 프레임 안쪽에 `absolute inset-0 opacity-30 mix-blend-overlay` div로 패턴 표시 (심볼은 z-10 위로).

### 4. 헤더/하단 텍스트 가독성 보존

- 헤더(로고/타이틀) 영역은 그대로 (drop-shadow가 이미 충분)
- 베팅 칩/SPIN 버튼 영역 뒤에 살짝 어두운 그라디언트(이미 step 1 비네트로 처리됨)

## 변경 파일

- `src/components/slots/OlympusSlot.tsx` — 배경 오버레이 약화, 릴 프레임 안쪽 패턴 div 추가
- `src/components/slots/themes.ts` — `reelFrameClass` 투명도 ↓, `reelPattern` 3종 추가

## QA

1. `/casino/dragon-empire` — 진홍 궁전 배경이 또렷, 릴 안쪽에 황금 비늘 패턴
2. `/casino/wizard-2000` — 마법서/룬 배경 또렷, 릴 안쪽 별자리
3. `/casino/olympus-1000` — 신전 배경 또렷, 릴 안쪽 메안더 키
4. 심볼·숫자(베팅 칩 10/50/100…) 가독성 유지
5. 모바일 작은 화면에서 패턴이 너무 시끄럽지 않은지