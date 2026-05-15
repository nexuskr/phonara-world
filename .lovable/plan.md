# /secure-auth 정밀 정비 플랜

## 1. 메인/서브 타이틀 교체 (SecureAuth.tsx Hero)
- "지금, 당신이 합류할 때 / 제국은 완성됩니다" → 한 줄 메인:
  - **메인 타이틀**: "폰 하나로 시작하는 새로운 수익 경험"
  - **서브 타이틀**: "오늘도 전세계 사람들이 잔고를 축적하고 있습니다"
- 메인은 `font-imperial text-gradient-gold`, 서브는 `text-foreground/85`. 모바일 28→데스크톱 56px 스케일 유지.

## 2. 회원가입(Email+Password) 활성화 + 추가정보 입력 화면
**Entry 카드 안에 탭 전환 추가**: `Magic Link` / `이메일 회원가입` / `로그인`.
- Magic Link: 기존 그대로 (`signInWithOtp`).
- 회원가입: `email + password(8자+) + confirm` → `supabase.auth.signUp({ email, password, options:{ emailRedirectTo:`${origin}/complete-profile` } })`. 성공 시 안내 토스트(이메일 확인 메일 발송).
- 로그인: `signInWithPassword`.
- 소셜 3개(Google/Apple/Kakao) 버튼 그리드는 그대로 유지.
- **추가 정보 화면**: `src/pages/CompleteProfile.tsx` 가 이미 존재 → 그곳을 회원가입 후 진입 지점으로 사용. 라우팅은 이미 `/complete-profile` 로 redirect 중. 부족한 필드(닉네임/추천인코드/국가/마케팅 동의)가 빠져 있으면 보강. (CompleteProfile 현재 내용 먼저 확인 후 보강)

## 3. LIVE FEED 국기 이미지가 안 보이는 문제
원인: 일부 OS(특히 Windows Chromium DevTools 기기 에뮬레이션)에선 emoji 국기(`🇰🇷` 등)가 폰트가 없어 빈칸/박스로 렌더링됨. 해결:
- `flag` 출력부를 **emoji + SVG fallback** 으로 변경.
- `src/lib/countryFlag.ts` 신설: `flagSvgUrl(cc)` → `https://flagcdn.com/w40/{cc.toLowerCase()}.png` (캐시 가능, 외부 의존 1곳).
- LIVE FEED / TOP5 / Map pulse 라벨에서 `<img src={flagSvgUrl(cc)} width=14 height=10 loading="lazy" decoding="async" alt="" />` 사용.
- 기존 emoji 필드는 유지(접근성 fallback) 하지만 화면에는 SVG `<img>` 우선.

## 4. GLOBAL EMPIRE MAP 빈 화면 문제
원인: 현재 맵은 "feed 가 새로 들어올 때만" pulse 1개를 짧게 그려서, 첫 로드 시 거의 비어 보임. 또한 실제 세계지도가 없어 도트 패턴만 깜박임.
수정:
- `public/world-dots.svg`(또는 inline SVG) 형식의 **실제 세계지도 도트 실루엣**을 배경으로 깔기. (간단한 점 매트릭스 SVG를 컴포넌트 내 인라인 생성 — 외부 자산 없이 ~150 도트로 대륙 윤곽).
- 초기 마운트 시 feed 상위 6개에 대해 즉시 pulse 6개 시드 → 빈 화면 제거.
- pulse 동시 표시 6개 유지(이미 cap), 1.6s ease-out CSS keyframe 그대로.
- pulse 옆에 `flagSvgUrl(cc)` 미니 칩 표시(국기 + 닉 첫 6자) → 시각적 풍부함 + "어느 나라가 들어왔는가" 명확.

## 5. 성능/렉 제거 (모바일 발열 0)
현재 측정: Main thread 458ms, Scripting 648ms, 5종 setInterval(2.5s/4s/5s/30s/60s) + realtime 1ch + count-up 다중. 모바일에서 하단 카드들 끊김의 원인은 (a) 보이지 않을 때도 setInterval 이 setState 를 계속 트리거 → 전체 트리 리렌더, (b) `useCountUp` 가 카드마다 rAF 돌림.
수정:
- **document.hidden 가드 강화**: 이미 있음 → 유지.
- **IntersectionObserver 가드 추가**: `useAuthLiveData()` 가 마운트된 메인 영역이 화면 밖일 때 모든 timer pause. `useInViewport` 훅 이미 존재 → 재사용.
- **drift interval 통합**: KPI(2.5s) + feed(4s) + top5(5s) 3개 setInterval → 단일 `setInterval(1000)` tick + 카운터 모듈로 통합 (타이머 3→1).
- **count-up 최적화**: `useCountUp` 의 rAF 를 변화량이 < 0.5% 일 때 즉시 setState 로 단축. KPI 5셀이 동시에 rAF 5개 돌리는 것을 방지.
- **AuthLiveFeedTicker** 의 marquee `animation-duration` 을 60s 그대로 두되, `feed.length===0` 또는 `prefers-reduced-motion` 시 정지(이미 있음). loop 배열 슬라이스 30→16으로 축소.
- **AuthGlobalMap**: pulse `setTimeout` 누적 → `useRef<Map>` 으로 교체해 GC 압박 줄이고, `pulses` cap 6 유지.
- **realtime 채널 1개** 그대로 유지.
- 효과: setInterval 5→1, rAF 동시 5→1(공유 tick), DOM 노드 cap.

## 6. 변경/생성 파일
- 수정: `src/pages/SecureAuth.tsx` (타이틀 + Entry 카드 탭 + 회원가입/로그인 핸들러).
- 수정: `src/hooks/use-auth-live-data.ts` (단일 tick + IO 가드).
- 수정: `src/components/auth/AuthLiveFeedTicker.tsx` (SVG 국기, loop 16).
- 수정: `src/components/auth/AuthTop5Card.tsx` (SVG 국기).
- 수정: `src/components/auth/AuthGlobalMap.tsx` (세계지도 인라인 SVG + 초기 시드 + 국기칩).
- 수정: `src/components/auth/AuthLiveNowBar.tsx` (count-up 임계값).
- 수정: `src/hooks/use-count-up.ts` (작은 변화 즉시 적용).
- 신설: `src/lib/countryFlag.ts` (flagcdn URL 헬퍼).
- (필요 시) `src/pages/CompleteProfile.tsx` 부족 필드 보강.

## 7. 백엔드/DB
- 마이그레이션 없음. 기존 RPC 그대로.
- Supabase Auth 의 Email/Password 는 기본 활성. 이메일 확인은 사용자 명시 요청 없으므로 기본값 유지(확인 메일 → /complete-profile 로 들어오면 추가정보 입력).

진행해도 될까요?
