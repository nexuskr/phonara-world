# P1 Final Touch — Hero Copy + Crown Icon Strict 0

## 1. Hero Copy 교체 (`src/components/dashboard/v3/DashboardHeroV3.tsx`)
- Headline (line 88~99):
  - 변경 전: "폰을 켜는 순간, / 너는 이미 우주 황제다."
  - 변경 후: "오늘 사람들이 가장 많이 / 참여 중인 실시간 리워드 챌린지"
- Sub 추가: Hero stats 위에 1줄 `text-sm md:text-base text-muted-foreground` —
  "무료 예측 · 무료돈벌기 · 실시간 보상 · PHON 받기"

## 2. Crown lucide 아이콘 교체 (`src/components/collection/CollectionHubTabs.tsx`)
- `import { Trophy, Gem, Crown } from "lucide-react"` → `import { Trophy, Gem, Sparkles } from "lucide-react"`
- VIP 등급 탭 icon: `Crown` → `Sparkles`
- 결과: `check-no-crown-ui.mjs` strict 0건.

## 3. Publish & Export 안내 (코드 변경 없음)
- 사용자가 Publish 다이얼로그에서 "Update" 버튼 클릭 시 phonara.net 반영.
- Export 방법: Desktop Code Editor 좌측 하단 "Download codebase" 또는 GitHub 연결 후 clone.

## 절대 금지
- 머니플로 8경로 변경
- 백엔드/RPC 수정
- 그 외 컴포넌트 수정
