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
} as const;

export type GlossaryKey = keyof typeof G;
