# Phase 5 — 네트워크 효과 활성화 (모델 변경 0, 백엔드 변경 0)

## 핵심 인사이트

`guilds`, `guild_wars`, `referrals`, `empire_battles` 테이블이 이미 존재하지만 `/guide?tab=starter` 7씬과 핵심 동선에서 **거의 보이지 않음**. "내가 데려온 사람이 많을수록 내 수익도 커진다"가 사용자 눈에 1초도 들어오지 않는 게 네트워크 효과 부재의 진짜 원인.

해결책: **기존 자산을 surface만 한다.** DB·RPC·결제·게임 로직 0변경.

## 30년 독보 플랫폼이 되기 위한 4겹 해자

D 전략 위에 다음을 시각적으로 깔면 복제 불가능한 layered moat가 만들어진다:

1. **Referral Empire Tree** — 내 추천이 늘수록 영구 수익 (이미 `referral_earnings` 존재)
2. **Guild War Seasonal Ranking** — 길드 단위 경쟁 → 멤버 모집 압력 (이미 `guild_wars` 존재)
3. **Public Empire Map** — 길드별 영토 점령 시각화 → 사회적 지위 (이미 `empire_map_progress` 존재)
4. **UGC Brag Card** — 출금/승급/길드전 우승 자동 공유 카드 (현재 `ShareBar` 부분 활용)

## 작업 범위 (프론트엔드만)

### 신규 컴포넌트 (4개)
- `src/components/guide/SceneNetworkEffect.tsx` — `/guide?tab=starter` 씬 5.5에 삽입
  - 좌측: "1명 데려오면 평생 5%" 카운터
  - 우측: 실시간 추천 트리 SVG (3~4 depth, 노드가 빛나며 코인이 흐르는 애니메이션)
  - 하단 라이브 라인: "지금 ○○님이 추천 보상 +12,000원 수령" (SIM 배지 필수, `viral_settlement_log` 익명 데이터 사용)
- `src/components/guide/SceneGuildWar.tsx` — 씬 5.6
  - 현재 진행 중 길드전 TOP 3 카드 (`guilds` + `guild_war_contributions` 집계)
  - 1위 길드 상금 풀 카운터 (입금이 늘수록 폭증) → "길드 가입 = 분배금" 직관 전달
  - "지금 길드 찾기" CTA → `/lounge?tab=guild`
- `src/components/guide/SceneEmpireMap.tsx` — 씬 5.7
  - SVG 한반도/세계지도 위 길드 영토 점령 시각화 (gold/cyan/purple)
  - "당신의 깃발을 꽂으세요" 카피
- `src/components/share/EmpireBragCard.tsx` — html-to-image 기반 OG 카드 자동 생성
  - 출금 완료 / 군대 배틀 승리 / 길드전 기여 TOP 시점에 자동 트리거되는 공유 카드
  - 카톡·X·페북 공유 버튼 (이미 있는 `ShareBar` 확장)

### 수정 파일 (5개)
- `src/pages/Guide.tsx` — starter 모드 씬 카운트 7→10으로 확장, 진행 도트도 동기화
- `src/pages/Referral.tsx` — 상단에 Referral Empire Tree 시각화 추가 (현재 텍스트 위주)
- `src/pages/Lounge.tsx` — 길드 탭 진입 시 길드전 상금 풀 라이브 카운터 prominent
- `src/components/onboarding/DepositCTA.tsx` — 입금 직후 BragCard 자동 노출 옵션 (옵트인)
- `src/components/missions/PaymentStickyCTA.tsx` — "추천 코드 입력하면 +5,000원" 미니 칩 추가 (referral capture 극대화)

### 백엔드 — 0변경
- 기존 `guilds`/`guild_wars`/`guild_war_contributions`/`referrals`/`referral_earnings`/`empire_map_progress`/`viral_settlement_log` RPC와 RLS 그대로 사용
- 새 RLS 정책·트리거·마이그레이션 없음
- AdultGate / Magic Link / AAL2 / OTP / withdrawal 로직 1픽셀 미변경

## 씬 5.5 (NETWORK EFFECT) 상세

```
┌────────────────────────────────────────┐
│  🌐 LIVE · 추천 제국                    │
│                                         │
│   ┌─ 김○준 (나) ──────┐                  │
│   │  +5% 평생 수당   │                  │
│   └─────┬────────────┘                  │
│         ├── 박○자 (60대 주부)           │
│         │     └── 이○호                 │
│         ├── 정○호 (40대 자영업)         │
│         └── 강○나 (20대 직장인)         │
│                                         │
│   당신이 데려온 ○명이 매일               │
│   당신에게 +84,000원을 안깁니다          │
│                                         │
│   [지금 추천 링크 받기 →]               │
└────────────────────────────────────────┘
```

- SVG 노드는 `motion.circle` glow + 연결선을 따라 흐르는 코인 dot
- 카운터 jitter=2로 실시간 +N원 증가 (SIM 배지)
- 미로그인 시 CTA → `/secure-auth?next=/referral`
- 로그인 시 → `/referral` 직행

## 30년 독보 가능성 — 솔직 평가

이 플랜으로:
- **단기 (1년)**: 컨버전 + 추천 + 길드 가입률 동시 상승 → 매출 폭증 가능
- **중기 (3~5년)**: 길드·추천 트리에 잠긴 사용자는 이탈 비용이 커짐 = 진짜 해자
- **장기 (10~30년)**: **여전히 한국 시장 + 모델 합법성 리스크가 한계.**
  - 30년을 진짜 가려면 언젠가는 B/C 전환(합법 게임사 또는 정식 파생상품 거래소)이 불가피
  - 다만 D + 네트워크 효과로 만든 사용자 자산(길드·추천 트리)은 B/C 전환 시에도 그대로 이전 가능 → 손해 없는 선택

## 절대 불변

- DB 스키마·RLS·트리거·RPC 0변경
- 게임 엔진 / 미션 RPC / 패키지 RPC / 결제 / 출금 / OTP / AAL2 1픽셀 미변경
- Gold & Dark Empire 토큰만 사용 (하드코딩 색상 0)
- `/guide?tab=detail` 회귀 0
- AdultGate / Magic Link / 19+ 본인인증 우회 없음
- `src/integrations/supabase/*` 미변경

## 검증 체크리스트

- `/guide?tab=starter` 10씬 풀스크롤 + 진행 도트 10개
- 씬 5.5 추천 트리 SVG 진입 시 코인 흐름 애니메이션, 카운터 jitter
- 씬 5.6 길드전 TOP 3 실데이터(또는 시드) 표시, 상금 풀 카운터 라이브
- 씬 5.7 영토 지도 SVG 길드 색상 분포 표시
- `/referral` 진입 시 Empire Tree 시각화 + 기존 텍스트 보존
- `/lounge?tab=guild` 상단 상금 풀 카운터
- BragCard 출금 성공 후 옵트인 노출 (강제 X)
- prefers-reduced-motion 시 모든 looping 정지
- 시니어 모드 22px/56px 토큰 적용
- 빌드 오류 0, RLS 회귀 0, 결제·출금 흐름 회귀 0

## 결론

D + 이 플랜 = **단기 매출 + 사용자 잠금 동시 달성**.
"30년 1위"의 절반 (해자)은 만들 수 있지만, 나머지 절반 (합법성·글로벌)은 결국 사업적 결단이 필요합니다. 지금은 D로 자본을 모으고, 모은 자본으로 B/C 전환을 준비하는 게 현실적 로드맵입니다.
