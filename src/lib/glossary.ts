/**
 * PHONARA Glossary v14.0 — UI Word Cleaning
 *
 * 5초 룰: 신규 유저가 보면 "여긴 돈 벌고 게임하는 곳" 으로 이해해야 함.
 * 내부 DB 컬럼·내부 코드(empire_levels, crown_events 등)는 그대로,
 * **사용자가 보는 UI 텍스트만** 이 사전을 통해 교체.
 *
 * 사용: import { G } from "@/lib/glossary";  →  <h1>{G.level}</h1>
 */

export const G = {
  // 4탭
  tabEarn: "수익",
  tabGames: "게임",
  tabTrade: "투자",
  tabLive: "실시간",

  // 탭별 한 줄
  tabEarnTagline: "매일 무료로 돈 버는 곳",
  tabGamesTagline: "재미있게 돈 버는 게임",
  tabTradeTagline: "코인으로 스마트하게 돈 벌기",
  tabLiveTagline: "지금 벌고 있는 사람들",

  // 등급/포인트
  level: "레벨",
  bonusPoints: "보너스 포인트",
  vipUpgrade: "VIP 승급",
  vipPass: "VIP 패스",
  seasonSeat: "시즌 좌석",
  weeklyTop: "이번 주 TOP",

  // 활동
  liveBigWin: "실시간 빅윈",
  news: "소식",
  hallOfFame: "명예의 전당",
  guild: "길드",

  // CTA
  ctaStartFree: "지금 무료로 시작",
  ctaStartFreeReward: "+500 보너스 포인트",
  ctaCharge: "충전",
  ctaWithdraw: "출금",
  ctaConvert: "환전",

  // 3대 메시지
  msg1: "무료로 돈 벌 수 있는 곳",
  msg2: "부업하면서 게임도 하고 돈도 버는 곳",
  msg3: "한번 들어오면 헤어나가기 힘든 곳",

  // Earn Hub — v14 Sprint 1
  earnHeader: "오늘 얼마 벌었나요?",
  earnSubheader: "아래만 다 하면 매일 4,000~6,000 PHON 확보",
  earnTodayLabel: "오늘 누적 적립",
  earnFomoLine: "지금도 이웃들이 PHON 받고 있어요",
  earnRouletteTitle: "데일리 무료 룰렛",
  earnRouletteSub: "24시간마다 1회 · 최대 5,000 PHON",
  earnRouletteCta: "오늘의 룰렛 1회 무료",
  earnRouletteDone: "오늘 이미 받았어요",
  earnRouletteSpinning: "돌리는 중…",
  earnRouletteResult: "획득",
  earnRouletteNextIn: "내일 자정 다시 무료",
  earnVipBoostOn: "VIP 부스트 ×1.5 적용중",
  earnVipBoostOff: "VIP 패스로 모든 보상 +50%",
  earnVipBoostCta: "VIP 패스 알아보기",
  earnVipBoostEndsIn: "남은 시간",
  earnShareTitle: "친구한테 자랑하기",
  earnShareSub: "공유 한 번에 +200 PHON",
  earnShareReward: "공유하고 +200 PHON",
  earnShareSheetTitle: "어디로 자랑할까요?",
  earnShareSheetSub: "채널당 1회 · +200 PHON 즉시 적립",
  earnShareCopied: "링크가 복사됐어요",
  earnShareInstagramHint: "이미지를 저장해서 스토리에 올려주세요",
} as const;

export type GlossaryKey = keyof typeof G;
