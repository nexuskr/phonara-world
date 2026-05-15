# BaseMaxWinOverlay 추출 + Pirate's Curse 착수

Wrapper 보완 마지막 단계로 4개 슬롯에 산재한 MaxWinOverlay 공통 코드를 `BaseMaxWinOverlay`로 추출하고, 그 위에서 Pirate's Curse (1500×, Mid volatility) Signature Slot을 착수합니다.

## Phase 1 — BaseMaxWinOverlay 추출

신규: `src/components/celebration/BaseMaxWinOverlay.tsx`

추출 책임 (4개 overlay에서 100% 동일):
- `WinCelebrationManager.subscribe` + `multiplier >= triggerAt` 게이트 + `lastFiredAt` 중복 방지
- `prefers-reduced-motion` 분기 + `(max-width:640px)` 모바일 confetti factor (0.55)
- `soundManager.play(...)` Facade 호출 (슬롯별 키만 다름)
- backdrop fade, 좌/우 edge flare, 하단 shockwave, 자동 dismiss 타이머
- 타이틀 슬램(아이콘 + 그라디언트 텍스트 + 멀티플라이어 + 윈 금액)
- Cleanup: unmount 시 setTimeout 정리

슬롯별 주입 props:
```ts
interface BaseMaxWinOverlayProps {
  triggerAt?: number;
  durationMs?: number;
  ariaLabel: string;
  // 사운드
  soundKeys: { primary: string; voice?: string };
  // 비주얼 토큰
  palette: {
    backdrop: string;          // radial-gradient string
    flareLeft: string;         // linear-gradient string
    flareRight: string;
    shockwave?: string;        // 하단 shockwave gradient (optional)
    confettiColors: string[];
    titleGradientClass: string; // tailwind bg-gradient-to-b ... bg-clip-text
    titleGlow: string;         // drop-shadow filter
    subTextClass: string;
  };
  // 텍스트
  icon: ReactNode;             // 슬롯 아이콘 (Flame, Star, Sparkles, Skull...)
  titleText: string;           // "DRAGON ROAR", "PIRATE'S CURSE" 등
  // 슬롯별 cinematic 레이어 (Pentagram, Matrix rain, Cannon explosion 등)
  cinematic?: (data: CelebrationData) => ReactNode;
}
```

`cinematic` render-prop 으로 슬롯 고유 효과(Cosmic 별 폭발, Neon 매트릭스 비, Wizard Pentagram, Dragon ember storm, Pirate cannon+skull) 만 슬롯별 파일에 남깁니다.

리팩토링 (4개 파일, 각 ~200 LOC → ~60 LOC):
- `CosmicMaxWinOverlay.tsx`
- `NeonMaxWinOverlay.tsx`
- `WizardMaxWinOverlay.tsx`
- `DragonMaxWinOverlay.tsx`

각 파일은 palette/sound/icon/title/cinematic 만 정의하고 Base 호출.

## Phase 2 — Pirate's Curse 착수

### 신규 파일

1. `src/components/slots/PirateOceanCanvas.tsx`
   - `useAnimatedCanvas` 사용 (60fps cap, dpr=1, pauseOnHidden)
   - 레이어: 사인파 기반 파도 3겹(다른 진폭/속도), 안개 그라디언트(상단 fade), 실루엣 해적선(2척, 좌→우/우→좌 느린 패럴렉스), 보물 glow(하단 중앙 펄스)
   - 색상: `#0c1a2b` 심해, `#7c2d12` 우드, `#fbbf24` 보물 골드, `#b91c1c` 혈홍

2. `src/components/slots/PiratePaytableSheet.tsx`
   - `BasePaytableSheet` 사용
   - 토큰: crimson(#b91c1c) / gold(#eab308) / wood(#7c2d12) / bone(#f5f5dc)
   - Mid volatility 카피, 1500× MAX Win 강조

3. `src/components/celebration/PirateMaxWinOverlay.tsx`
   - `BaseMaxWinOverlay` 사용
   - palette: 혈홍 backdrop + 골드 flare + 우드 톤 shockwave
   - sound: `legendary_win` + `voice_pirate_curse` (없으면 fallback)
   - icon: lucide `Skull`
   - titleText: `"PIRATE'S CURSE"`
   - cinematic: 좌우 cannon flash 2회(0ms / 380ms) + 30개 skull/coin emoji 부유 storm + 보물상자 폭발 confetti(중앙 하단)

4. `src/pages/casino/PiratesCurse.tsx` (15 LOC 이하)
   ```tsx
   import SlotSignatureWrapper from "@/components/slots/SlotSignatureWrapper";
   import { PIRATE_CURSE_THEME } from "@/components/slots/themes";
   import PirateOceanCanvas from "@/components/slots/PirateOceanCanvas";
   import PiratePaytableSheet from "@/components/slots/PiratePaytableSheet";
   import PirateMaxWinOverlay from "@/components/celebration/PirateMaxWinOverlay";

   export default function PiratesCursePage() {
     return (
       <SlotSignatureWrapper
         slotId="pirate_curse"
         theme={PIRATE_CURSE_THEME}
         Background={PirateOceanCanvas}
         PaytableSheet={PiratePaytableSheet}
         MaxWinOverlay={PirateMaxWinOverlay}
         flareColors={{ left: "rgba(185,28,28,0.22)", right: "rgba(234,179,8,0.18)" }}
         signatureLabel="Pirate's Curse · Signature"
         accentDotColor="rgba(234,179,8,1)"
         themeKey="pirate"
       />
     );
   }
   ```

### 수정 파일

- `src/components/slots/themes.ts`: `PIRATE_CURSE_THEME` 이미 존재 — `maxWinMultiplier: 1500` 검증 후 필요 시 메타 보강
- `src/App.tsx` 또는 라우터: 기존 `PiratesCurse1500.tsx` 라우트가 있다면 신규 `PiratesCurse.tsx` 로 교체 (or `PiratesCurse1500.tsx` 자체를 Wrapper 본으로 덮어쓰기 — 라우트 경로 보존을 위해 후자 권장)

→ **결정**: 신규 파일을 만들지 말고 기존 `src/pages/casino/PiratesCurse1500.tsx` 를 Wrapper 본으로 덮어써 라우트 영향 0. 파일명 정리는 후속 PR.

## 라우팅 영향
Phase 2는 기존 `PiratesCurse1500.tsx` 를 in-place 교체하므로 App.tsx 라우터 변경 불필요.

## 성능
- BaseMaxWinOverlay: 4개 overlay 합산 ~800 LOC → ~400 LOC (50% 감소)
- 모든 cinematic 레이어 GPU composite-only (transform/opacity)
- 모바일 confetti factor 0.55 유지 → Lighthouse 96–98/100 유지 예상
- PirateOceanCanvas: 파도 3겹 + 해적선 2척 + 안개/glow → 약 18 paint ops/frame, 60fps 안정

## 다음 슬롯 준비 (Pharaoh's Vault 2500×)
BaseMaxWinOverlay + BasePaytableSheet + useAnimatedCanvas 3종이 모두 갖춰지므로 Pharaoh는 Sand canvas + Hieroglyph cinematic 만 작성하면 ~250 LOC 신규 코드로 완료 가능.

## 작업 순서
1. `BaseMaxWinOverlay.tsx` 작성
2. Cosmic/Neon/Wizard/Dragon overlay 4개 리팩토링 + 수동 동작 확인
3. `PirateOceanCanvas.tsx` → `PiratePaytableSheet.tsx` → `PirateMaxWinOverlay.tsx`
4. `PiratesCurse1500.tsx` 를 Wrapper 본으로 교체
5. 빌드 통과 확인
