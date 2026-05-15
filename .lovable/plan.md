# Wizard / Dragon — 풀 테마 패키지 (심볼 + 카드 색조 + 사운드 + 배경 + 페이테이블)

## 전제 (현황 확인)
- **페이테이블/변동성/보너스 빈도**: 이미 DB 마이그레이션 `20260515071705_…`에서 슬롯별로 분리 완료 (Olympus mid/Wizard high MAX 2000×/Dragon low MAX 500×). **추가 마이그레이션 불필요**.
- **배경/로고**: `src/assets/slots/wizard|dragon/{bg.jpg,logo.png}` 이미 존재 — 슬롯에 결선만 연결되면 됨.
- **사운드**: 현재 `OlympusSlot.tsx`에 audio 코드 없음 → 신규 추가.

## 1. 프리미엄 심볼 6종 자체 제작 (×2 테마 = 12장, premium 티어, 1024² 투명 PNG)

### Wizard 2000 (딥 바이올렛 + 시안 + 골드)
| 인덱스 | 파일명 | 컨셉 |
|---|---|---|
| 5 | `sym_orb.png` | 시안 에너지 코어가 떠 있는 마법 수정구 |
| 6 | `sym_amulet.png` | 사파이어 펜타그램 아뮬렛 |
| 7 | `sym_sorceress.png` | 보랏빛 후드 여마법사 흉상 |
| 8 | `sym_archmage.png` | 별이 박힌 긴 수염의 대마법사 |
| 9 | `sym_wild.png` | 회전 룬이 박힌 마법구, "WILD" 룬 각인 |
| 10 | `sym_scatter.png` | 펼쳐진 마도서 + 별이 쏟아지는 페이지 |

### Dragon Empire (진홍 + 황금 + 옥)
| 인덱스 | 파일명 | 컨셉 |
|---|---|---|
| 5 | `sym_pearl.png` | 황금 구름에 감싸인 야명주 |
| 6 | `sym_jade.png` | 용이 새겨진 옥패 |
| 7 | `sym_phoenix.png` | 진홍/황금 봉황 흉상 |
| 8 | `sym_dragon_king.png` | 다섯 발톱 용왕 정면 두상 |
| 9 | `sym_wild.png` | 황금 용 발톱 인장 |
| 10 | `sym_scatter.png` | 진주를 문 양각 용머리 메달 |

## 2. 카드 5종(10/J/Q/K/A) 색조 재처리 — 런타임 CSS 필터 (재생성 X)
Olympus 카드 PNG를 그대로 재사용하되 `theme.cardFilter`(CSS `filter` 문자열)로 색조 변환.
- Olympus: `none`
- Wizard: `hue-rotate(255deg) saturate(1.15) brightness(1.05)` → 보라/시안 톤
- Dragon: `hue-rotate(330deg) saturate(1.4) brightness(0.95)` → 진홍/황금 톤

`Reel.tsx`에서 인덱스 0–4(`PREMIUM_INDICES`에 포함되지 않은 카드)에만 필터 적용. 프리미엄 6종은 원본 그대로.

## 3. 사운드 (테마별 3종 + 공통 1종)
공통 라이브러리 `src/lib/slotSound.ts` 신설:
- `spin` (릴 회전 시작)
- `stop` (릴 정지, 3개 릴 시차 재생)
- `win` (라인 적중)
- `bigwin` (×50 이상)

테마별 사운드 파일 (royalty-free, **outbound 다운로드 없이 Web Audio API로 절차 생성**):
- Olympus: 신탁 종 / 천둥 / 황금 팡파레
- Wizard: 마법진 차징 휘파람 / 룬 클릭 / 아르페지오 키라
- Dragon: 동양 북 / 징 / 화려한 트럼펫

> 절차 생성 방식 채택 사유: 외부 파일 의존 없음, 번들 크기 0 증가, 모바일 배터리 영향 최소. `AudioContext` 1회 초기화, 사용자 제스처 후 unlock.

`theme.soundPack: "olympus" | "wizard" | "dragon"`로 분기. 음소거 토글 + `localStorage` 저장.

## 4. 배경 적용
`OlympusSlot.tsx`의 하드코딩된 `bgOlympus` import → `theme.bgImage`/`theme.logoImage`로 교체. Wizard/Dragon은 이미 존재하는 자산 사용.

## 5. 코드 변경 요약

### `src/components/slots/symbolMap.ts` (리팩토링)
```ts
export type SymbolPack = "olympus" | "wizard" | "dragon";
export const SYMBOL_PACKS: Record<SymbolPack, string[]>;  // 인덱스 0-4 공유, 5-10 팩별
export function getSymbolImages(pack: SymbolPack): string[];
```

### `src/components/slots/themes.ts` (확장)
각 테마에 추가 필드:
- `symbolPack: SymbolPack`
- `cardFilter: string` (CSS filter)
- `soundPack: "olympus" | "wizard" | "dragon"`
- `bgImage: string`, `logoImage: string`

### `src/components/slots/OlympusSlot.tsx`
- `theme.bgImage`, `theme.logoImage` 사용
- `getSymbolImages(theme.symbolPack)` → `images` 메모이즈
- `useSlotSound(theme.soundPack)` 훅 호출
- spin / 결과 콜백 지점에서 sound trigger

### `src/components/slots/reels/Reel.tsx`
- `images: string[]`, `cardFilter: string` props 추가
- `<img>` 렌더 시 인덱스가 카드(0–4)면 `style={{ filter: cardFilter }}`

### 신규 파일
- `src/lib/slotSound.ts` — Web Audio 절차 사운드 엔진
- `src/assets/slots/wizard/sym_*.png` × 6
- `src/assets/slots/dragon/sym_*.png` × 6

## QA 체크리스트
1. `/casino/olympus-1000` 회귀 — 시각/사운드 동일
2. `/casino/wizard-2000` — 보라+시안 카드, 신규 마법 심볼, 마법 사운드
3. `/casino/dragon-empire` — 진홍 카드, 신규 용 심볼, 동양 사운드
4. 음소거 토글 동작 + 모바일 사일런트 모드 충돌 없음
5. Demo↔Real 전환 시 이미지/사운드 누수 없음

## 비포함 (다음 라운드)
- 페이테이블 추가 변경 (이미 차별화됨)
- 슬롯 프레임 SVG 자체 제작 (Olympus 프레임 공유 유지)
- 보너스 라운드 전용 사운드 트랙
