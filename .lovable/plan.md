# Landing Page Final Visual & FOMO MAX Overhaul

랜딩 첫 화면 최종 마감. Hero 카피 / 서브 / CTA 영역만 손보고, 나머지 섹션과 인프라는 그대로 둡니다.

## 변경 범위

`src/pages/Landing.tsx` (Hero 함수 + AnimatedEarning 사용처) 한 파일만 수정. 다른 파일/머니플로/Operator/Bundle/Phase D·F 무관.

## 구체 작업

1. **메인 카피 정리 (기존 그대로 유지)**
   - `0원으로 시작해서 / 매일 돈을 버는 제국` (이미 있음) → 유지하되 글자 크기 한 단계 키우고 (`md:text-7xl lg:text-8xl`) drop-shadow 강화.

2. **서브 카피 교체 (강력 FOMO)**
   - 기존: `지금 가입하면 첫 입금 10,000 PHON 즉시 지급 + 실시간으로 전 세계 황제들의 승전보를 확인하세요`
   - 신규:
     - line1 (큼·강조): **"지금 이 순간에도 수만 명의 황제들이 실시간으로 수익을 창출하고 있습니다"**
     - line2 (서브): **"전 세계 황제들이 오늘도 평균 ₩347,000+ 수익 · 가입 즉시 10,000 PHON"**
   - 숫자(`₩347,000+`, `10,000 PHON`)는 Warm Gold + drop-shadow.

3. **"오늘 사용자 평균 수익 4,800원" 라인 제거**
   - 152번 라인 블록과 `AnimatedEarning` 컴포넌트 함께 제거.

4. **CTA 강화**
   - 버튼 높이 `h-16` → `h-[68px]`, 폰트 `text-lg md:text-xl`.
   - `pulse-halo` + `glow-imperial` 위에 외곽 `shadow-[0_0_0_1px_hsl(var(--gold)/.7)]` 골드 hairline 추가.
   - "+10,000 PHON" 칩 옆 펄싱 dot (Warm Gold) 추가.
   - 보조 라인 `가입 즉시 무료 PHON · 신용카드 필요 없음 · 30초 안에 시작` 유지.

5. **신뢰 라인 (실시간 출금 중 · 한국 1위...) 유지**, 단 폰트 weight `font-bold`로 한 단계 키워 가독성 향상.

6. **Imperial Live Wins Rail**
   - 위치(`<ImperialLiveWinsRail variant="full" />`)는 이미 Hero 직후에 마운트되어 있음 → 유지.
   - rail 자체의 jackpot glow/pulse/crown 효과는 Slice 직전 작업에서 이미 강화됨 → 추가 변경 없음.

## 절대 불변

- money-flow 8경로, Operator Isolation, Bundle Budget, Phase D (Avatar+Lobby), Phase F Push 0줄 변경.
- 디자인 토큰만 사용 (`hsl(var(--gold))`, `hsl(var(--pink))`, `font-imperial`, `glow-imperial`, `pulse-halo`).
- 다른 섹션(TabPreview/LiveBand/Why/FinalCTA/Footer) 변경 없음.

## 완료 후 보고

`✅ Landing Page Final Visual & FOMO MAX Overhaul 완료`
