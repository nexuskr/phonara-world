# Sugar Fever 3000 — 캔디 테마 완전 정리 + 전용 심볼 세트

Olympus 잔재를 모두 제거하고 파스텔 캔디 럭셔리 룩으로 재정렬합니다. 또한 슬롯 릴에 사용되는 심볼 전부를 캔디 테마 전용 PNG 세트로 새로 제작해 교체합니다. OlympusSlot 엔진/다른 슬롯은 건드리지 않습니다.

## 변경 파일

1. **src/components/slots/SugarFeverCanvas.tsx** — 완전 재작성
   - 배경: 크림 핑크 → 라벤더 → 민트 베이지 3-stop 라디얼 그라데이션
   - 2-layer 패럴랙스: 상단 파스텔 슈가 클라우드, 하단 마카롱/케이크 실루엣
   - 상단 초콜릿 드립 리본, 떠다니는 wrapped candy / 롤리팝 / 스프링클
   - Olympus 마블/번개/골드빔 잔재 grep 후 0건 확인
   - 단일 RAF, DPR cap=2, `prefers-reduced-motion` 정적 폴백

2. **src/components/celebration/SugarFeverMaxWinOverlay.tsx** — 재구현
   - 중앙 거대 회전 롤리팝 스월(SVG conic) + 캔디 크라운
   - 초콜릿 스플래시 아크, 파스텔 컨페티(핑크/민트/골드/라벤더) 250+
   - 모바일 `hardwareConcurrency` 파티클 throttle, GPU transform only
   - "3000x SUGAR RUSH" 카피 + slow-mo + 스크린 셰이크

3. **src/components/slots/themes.ts** — `SUGAR_FEVER_THEME` 전면 갱신
   - `reelFrameClass`: 크림 핑크-골드 더블 보더 + soft shadow
   - `spinStreakClass`: 파스텔 핑크 글로우
   - `cardFilter`/`reelPattern`: 캔디 도트 격자 + hue/saturation 조정
   - `symbolPack: "sugar_fever"`로 전환 (기존 `"olympus"` placeholder 제거)
   - Olympus 색상 토큰 참조 0건

4. **src/components/slots/SugarFeverPaytableSheet.tsx** — 시각 일관성
   - 새 심볼 이미지로 칩 미리보기 교체
   - Rainbow Swirl / Mint Macaron / Strawberry Heart / Chocolate Drop / Golden Lollipop(scatter) / Multiplier Bomb 톤 정리
   - 헤더/구분선 핑크-골드 팔레트

## 신규 심볼 세트 (캔디 테마 전용)

`src/assets/slots/sugar-fever/` 에 9종 PNG를 imagegen(premium, transparent_background)으로 생성. 모두 정사각 512×512, 솔리드 흰 배경 명시 + 후처리 투명화, 가장자리 그림자/광택 일관, 사이즈 균형 통일.

- `rainbow-swirl.png` — 무지개 스월 막대사탕 (와일드)
- `golden-lollipop.png` — 황금 별 모양 롤리팝 (스캐터)
- `multiplier-bomb.png` — 알록달록 폭탄형 멀티플라이어 캔디
- `mint-macaron.png` — 민트 마카롱
- `strawberry-heart.png` — 딸기 하트 젤리
- `chocolate-drop.png` — 광택 초콜릿 드롭
- `gummy-bear.png` — 핑크 구미베어
- `caramel-cube.png` — 캐러멜 큐브
- `blueberry-bonbon.png` — 블루베리 본봉

생성 후:
- **src/components/slots/symbolPacks.ts** (또는 동등한 매핑 파일)을 확인하고 `sugar_fever` 팩 항목 추가. 파일이 없으면 기존 `olympus` 매핑이 정의된 위치를 찾아 동일 패턴으로 캔디 매핑을 등록 (코드 위치는 탐색 후 결정).
- 9개 import는 트리쉐이커 친화적으로 정적 ES6 import.

## 기술 노트

- 색상은 컴포넌트 내 inline `hsl()` 리터럴 (캔디 팔레트 전용, 전역 토큰 영향 없음)
- 기존 8개 슬롯, OlympusSlot 엔진, SlotSignatureWrapper 무수정
- 새 DB/사운드 추가 없음 (사운드 팩은 placeholder 유지)
- 변경 후 `OlympusLegacyCanvas` 및 다른 슬롯 페이지 영향 0건 확인
