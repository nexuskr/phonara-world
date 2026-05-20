# Apex Mobile Shell — P3-E

Capacitor 래퍼로 iOS / Android 네이티브 배포.

## 빠른 시작

```bash
git pull
npm install
npx cap add ios       # 또는 android
npm run build
npx cap sync
npx cap run ios       # 또는 npx cap run android
```

## 의존성

- `@capacitor/core`, `@capacitor/cli`
- `@capacitor/ios`, `@capacitor/android`
- `@capacitor/push-notifications` (선택)
- `@capacitor/status-bar`, `@capacitor/splash-screen` (선택)

## 핵심 통합

| 모듈 | 위치 | 비고 |
|---|---|---|
| `detectNative()` | `@/packages/apex/mobile/nativeBridge` | web 안전 fallback |
| `registerNativePush()` | `@/packages/apex/mobile/pushBridge` | 기존 `push_subscriptions` 재사용, endpoint=`native:<platform>:<token>` |
| `<ColdStartBoost />` | App 루트 | iOS/Android에서만 splash fade, 웹 no-op |

## 목표 지표

- Cold start: **< 1.5s** (iPhone 12 기준)
- 푸시 deep-link 정확도: 100%
- 오프라인 모드: 핵심 라우트 6종 precache (sw.js)

## 가드레일

- 머니플로 8경로 무변경
- `capacitor.config.ts` 의 `server.url` 은 hot-reload 미리보기용. 스토어 빌드시 제거 필요
- 웹 빌드에서 capacitor 미설치시 모든 모듈은 graceful no-op
