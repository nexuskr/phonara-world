// Lightweight client-side store (mock backend) for 폰미션
import { useEffect, useState } from "react";

export type Tier = "NORMAL" | "VIP" | "GOD" | "EMPIRE";

export type User = {
  id: string;
  nickname: string;
  email: string;
  phone: string;
  realName: string;
  birth: string;
  referralCode?: string;
  balance: number;          // bank (KRW)
  coinBalance: number;      // coin balance (USDT)
  todayEarnings: number;
  streak: number;
  level: number;
  xp: number;
  tier: Tier;
  withdrawPw?: string;      // 6-digit
  isAdmin?: boolean;
  badges?: string[];
  // Daily play tracking (auto-reset by date string YYYY-MM-DD)
  playDate?: string;
  playsUsed?: number;
  // Attendance
  lastAttendance?: string;  // YYYY-MM-DD
  attendanceStreak?: number;
};

// Tier-based daily play limits (총 게임 플레이 가능 횟수 / 일)
export const DAILY_PLAY_LIMITS: Record<Tier, number> = {
  NORMAL: 10,
  VIP: 30,
  GOD: 80,
  EMPIRE: 200,
};

// Level is bound to tier (패키지 업그레이드 시 자동 상승)
export const LEVEL_BY_TIER: Record<Tier, number> = {
  NORMAL: 1,
  VIP: 10,
  GOD: 30,
  EMPIRE: 60,
};

// Realistic attendance rewards by tier (일일)
export const ATTENDANCE_REWARDS: Record<Tier, { base: number; weeklyBonus: number }> = {
  NORMAL: { base: 500,   weeklyBonus: 2_000 },   // 7일 연속 시 +2,000
  VIP:    { base: 1_500, weeklyBonus: 7_000 },
  GOD:    { base: 4_000, weeklyBonus: 20_000 },
  EMPIRE: { base: 12_000, weeklyBonus: 80_000 },
};

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export type MissionTier = "NORMAL" | "VIP" | "GOD" | "EMPIRE";
export type Mission = {
  id: string;
  title: string;
  desc: string;
  reward: number;
  category: "광고" | "설문" | "리뷰" | "추천" | "데이터" | "AI" | "UGC" | "게임";
  difficulty: "EASY" | "NORMAL" | "HARD" | "VIP";
  tier: MissionTier;
  duration: string;
  ugc?: boolean;
  game?: "tap" | "lucky" | "memory" | "reaction" | "scratch" | "dice" | "slot" | "highlow";
  fomoLimit?: number; // FOMO: only N plays remain today
  boostable?: boolean; // tier-boost reward effect
};

export type Pkg = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  dailyReturn: number;
  duration: number;
  totalReturn: number;
  tier: "FREE" | "STARTER" | "PRO" | "VIP" | "GOD" | "EMPIRE" | "PHANTOM";
  unlocksTier: Tier;
  perks: string[];
  badge?: string;
  fomo?: string;
  seatsLeft?: number; // limited slots
};

export type DepositReq = {
  id: string; userId: string; nickname: string;
  packageId: string; packageName: string; amount: number;
  method: "bank" | "coin";
  screenshot?: string;
  txCode?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
};

export type WithdrawReq = {
  id: string; userId: string; nickname: string; amount: number;
  method: "bank" | "coin";
  bank?: string; account?: string;
  coinAddress?: string; network?: string;
  txCode?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
};

export type CoinSetting = {
  network: "TRC20" | "ERC20" | "BEP20";
  address: string;
  qr?: string; // data URL
};

export type ChatMessage = {
  id: string;
  threadId: string;          // userId
  from: "user" | "admin";
  text: string;
  createdAt: number;
};

export type ChatThread = {
  id: string;                 // = userId
  nickname: string;
  unread: number;
  updatedAt: number;
};

export type JackpotWin = {
  nickname: string;
  amount: number;
  tier: Tier;
  when: number;
  type: "main" | "mini";
};

export type JackpotState = {
  amount: number;          // main progressive jackpot (KRW)
  mini: number;            // mini jackpot (KRW)
  lastMainExplode: number; // timestamp
  lastMiniExplode: number;
  totalContrib: number;    // lifetime contributions
  recentWins: JackpotWin[];
};

const KEY = "phonemission_v2";

type DB = {
  user: User | null;
  users: User[];
  deposits: DepositReq[];
  withdraws: WithdrawReq[];
  completedMissions: string[];
  customMissions: Mission[];
  coin: CoinSetting;
  chats: ChatMessage[];
  threads: ChatThread[];
  jackpot: JackpotState;
  momentum: number;        // current win streak
  recoveryMission?: { id: string; reward: number; expiresAt: number } | null;
};

const initialDB: DB = {
  user: null,
  users: [],
  deposits: [],
  withdraws: [],
  completedMissions: [],
  customMissions: [],
  coin: { network: "TRC20", address: "TXyZ8KqW3eRf...PolymorphAdmin", qr: "" },
  chats: [],
  threads: [],
  jackpot: {
    amount: 47_382_910,
    mini: 832_410,
    lastMainExplode: Date.now(),
    lastMiniExplode: Date.now(),
    totalContrib: 0,
    recentWins: [
      { nickname: "Cyber***K", amount: 38_240_000, tier: "EMPIRE", when: Date.now() - 1000 * 60 * 47, type: "main" },
      { nickname: "Neon***J",  amount: 1_240_000,  tier: "VIP",    when: Date.now() - 1000 * 60 * 12, type: "mini" },
      { nickname: "Phantom***", amount: 92_400_000, tier: "EMPIRE", when: Date.now() - 1000 * 60 * 60 * 4, type: "main" },
      { nickname: "Aurora***",  amount: 540_000,   tier: "NORMAL", when: Date.now() - 1000 * 60 * 3,  type: "mini" },
    ],
  },
  momentum: 0,
  recoveryMission: null,
};

// Tier-based jackpot win chances (per game play) — Empire 입금 유도 극대화
export const JACKPOT_CHANCE: Record<Tier, { main: number; mini: number; multi: boolean }> = {
  NORMAL: { main: 0.04, mini: 0.18, multi: false },
  VIP:    { main: 0.12, mini: 0.32, multi: false },
  GOD:    { main: 0.28, mini: 0.50, multi: false },
  EMPIRE: { main: 0.65, mini: 0.85, multi: true  },
};

// Contribution & payout policy
export const JACKPOT_CONTRIB_PCT = 0.08; // 8% of every game stake
export const JACKPOT_PAYOUT_PCT  = 0.55; // 55% of pool to winner, 45% house
export const MAIN_MILESTONE_AMOUNT = 30_000_000; // 3천만원 도달 시 폭발
export const MAIN_MILESTONES = [MAIN_MILESTONE_AMOUNT];
export const MAIN_MAX_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
export const MINI_MAX_INTERVAL_MS = 60 * 60 * 1000;     // 1h

// Reset base after explosion: random 1천만 ~ 1.5천만 KRW
export function jackpotResetBase() {
  return 10_000_000 + Math.floor(Math.random() * 5_000_000);
}
export function miniJackpotResetBase() {
  return 500_000 + Math.floor(Math.random() * 800_000);
}
export function jackpotPayoutPct() { return JACKPOT_PAYOUT_PCT; }
export function miniJackpotAmount() {
  // 50만 ~ 300만원
  return 500_000 + Math.floor(Math.random() * 2_500_000);
}

const FAKE_NICKS = ["Cyber***K","Neon***J","Aurora***","Phantom***","Quantum***","Nova***L","Zero***X","Echo***","Pulse***M","Helix***","Orbit***Q","Vexa***","Lyric***N","Mirage***"];
export function randomFakeNick() { return FAKE_NICKS[Math.floor(Math.random() * FAKE_NICKS.length)]; }

export function loadDB(): DB {
  if (typeof window === "undefined") return initialDB;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialDB;
    return { ...initialDB, ...JSON.parse(raw) };
  } catch { return initialDB; }
}
export function saveDB(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("phonemission:update"));
}

export function useDB() {
  const [db, setDb] = useState<DB>(() => loadDB());
  useEffect(() => {
    const h = () => setDb(loadDB());
    window.addEventListener("phonemission:update", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("phonemission:update", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return [db, (updater: (d: DB) => DB) => saveDB(updater(loadDB()))] as const;
}

export const TIER_RANK: Record<Tier, number> = { NORMAL: 0, VIP: 1, GOD: 2, EMPIRE: 3 };

// FREE-first natural upsell — withdrawal limits per tier (KRW). EMPIRE = unlimited (-1)
export const WITHDRAW_LIMITS: Record<Tier, number> = {
  NORMAL: 500_000,
  VIP: 5_000_000,
  GOD: 50_000_000,
  EMPIRE: -1,
};

export const PACKAGES: Pkg[] = [
  { id: "free",    name: "FREE",              tagline: "압박 ZERO · 평생 무료 플랜",     price: 0,          dailyReturn: 0,         duration: 0,  totalReturn: 0,           tier: "FREE",    unlocksTier: "NORMAL", badge: "평생무료",     perks: ["💚 결제 압박 0% · 광고 없음", "하루 무료 미션 8회 + 게임 3종", "출금 한도 월 50만원", "신규가입 5,000원 즉시 지급", "광고 보고 추가 적립 가능"] },
  { id: "starter", name: "STARTER",           tagline: "첫 사이버 수익의 시작",         price: 49_000,     dailyReturn: 3_500,     duration: 30, totalReturn: 105_000,     tier: "STARTER", unlocksTier: "NORMAL", badge: "BEST VALUE",   perks: ["하루 미션 15회 · 게임 +2종", "1.5배 정산 부스터", "출금 한도 월 100만원", "30일 후 원금+수익 회수"] },
  { id: "pro",     name: "PRO",               tagline: "본격적인 수익 가속",           price: 159_000,    dailyReturn: 13_000,    duration: 35, totalReturn: 455_000,     tier: "PRO",     unlocksTier: "VIP",    badge: "POPULAR",      perks: ["VIP 미션 입장권", "AI 자동 추천 2배 가속", "출금 한도 월 300만원", "주간 보너스 + 추천 5%"] },
  { id: "vip",     name: "VIP",               tagline: "VIP 전용 수익 풀 입장",        price: 490_000,    dailyReturn: 42_000,    duration: 45, totalReturn: 1_890_000,   tier: "VIP",     unlocksTier: "VIP",    badge: "VIP",          fomo: "이번 주 신규 1,284명 가입", perks: ["VIP 전용 미션 풀 (3배 보상)", "1:1 전담 매니저 24/7", "즉시 정산 (12분 이내)", "출금 한도 월 500만원"] },
  { id: "god",     name: "GOD MODE",          tagline: "한계 없는 신모드",             price: 1_500_000,  dailyReturn: 145_000,   duration: 45, totalReturn: 6_525_000,   tier: "GOD",     unlocksTier: "GOD",    badge: "GOD MODE",     fomo: "잔여 좌석 단 87석",       seatsLeft: 87, perks: ["무제한 GOD 미션 풀", "AI 자동 수익 봇 24h", "월간 골드 보너스 100만원", "출금 한도 월 5,000만원"] },
  { id: "empire",  name: "EMPIRE",            tagline: "선착순 20명 · 플랫폼 오너",     price: 9_900_000,  dailyReturn: 1_050_000, duration: 50, totalReturn: 52_500_000,  tier: "EMPIRE",  unlocksTier: "EMPIRE", badge: "👑 EMPIRE",    fomo: "🔥 선착순 20명 · 잔여 7석", seatsLeft: 7,  perks: ["플랫폼 수익 10% 매주 분배", "Syndicate Crew 정식 입성", "전세계 무제한 출금 (한도 ∞)", "프라이빗 컨퍼런스 + 오너십 배지", "전담 자산매니저 1:1 평생"] },
  { id: "phantom", name: "PHANTOM SYNDICATE", tagline: "초대 전용 · 평생 오너십",       price: 35_000_000, dailyReturn: 4_200_000, duration: 50, totalReturn: 210_000_000, tier: "PHANTOM", unlocksTier: "EMPIRE", badge: "INVITE ONLY",  fomo: "Syndicate Council · 잔여 3석", seatsLeft: 3,  perks: ["플랫폼 수익 15% 평생 분배", "Syndicate Council 의결권", "프라이빗 제트 분기 미팅", "글로벌 자산 매니저 풀", "재단 의결권 + 평생 오너십"] },
];

export const DEFAULT_MISSIONS: Mission[] = [
  { id: "m1",  title: "쿠팡 앱 설치 후 30초 실행", desc: "신규 앱 다운로드 후 메인 진입", reward: 1_500,    category: "광고",   difficulty: "EASY",   tier: "NORMAL", duration: "30초" },
  { id: "m2",  title: "AI 챗봇 응답 평가 5건",   desc: "AI 응답 품질 평가",         reward: 4_500,    category: "AI",     difficulty: "NORMAL", tier: "NORMAL", duration: "5분" },
  { id: "m3",  title: "유튜브 영상 시청 + 좋아요", desc: "지정 영상 60초 시청",        reward: 800,      category: "광고",   difficulty: "EASY",   tier: "NORMAL", duration: "1분" },
  { id: "m4",  title: "10분 마켓 리서치 설문",   desc: "라이프스타일 설문",          reward: 7_200,    category: "설문",   difficulty: "NORMAL", tier: "NORMAL", duration: "10분" },
  { id: "m7",  title: "친구 1명 초대하기",       desc: "추천코드로 친구 가입",        reward: 5_000,    category: "추천",   difficulty: "NORMAL", tier: "NORMAL", duration: "즉시" },
  // ─── NORMAL GAMES (9) — easy entry, jackpot contributors ───
  { id: "g1",  title: "사이버 탭 챌린지",        desc: "10초간 빠르게 탭",            reward: 1_200,    category: "게임",   difficulty: "EASY",   tier: "NORMAL", duration: "10초", game: "tap",      boostable: true },
  { id: "g2",  title: "럭키 박스 오픈",          desc: "1일 1회 무료 박스",            reward: 2_500,    category: "게임",   difficulty: "EASY",   tier: "NORMAL", duration: "5초",  game: "lucky",    boostable: true },
  { id: "g3",  title: "메모리 매칭",            desc: "카드 6쌍 매칭",                reward: 3_500,    category: "게임",   difficulty: "NORMAL", tier: "NORMAL", duration: "1분",  game: "memory",   boostable: true },
  { id: "g6",  title: "리액션 스피드",          desc: "녹색 신호에 즉시 탭",          reward: 2_000,    category: "게임",   difficulty: "EASY",   tier: "NORMAL", duration: "20초", game: "reaction", boostable: true },
  { id: "g7",  title: "스크래치 카드",          desc: "코팅을 긁어 보상 확인",         reward: 1_800,    category: "게임",   difficulty: "EASY",   tier: "NORMAL", duration: "5초",  game: "scratch",  boostable: true },
  { id: "g8",  title: "주사위 더블",            desc: "2개 주사위 합 7 이상",         reward: 2_400,    category: "게임",   difficulty: "EASY",   tier: "NORMAL", duration: "5초",  game: "dice",     boostable: true },
  { id: "g9",  title: "네온 슬롯",              desc: "3릴 슬롯 매칭",                reward: 3_200,    category: "게임",   difficulty: "NORMAL", tier: "NORMAL", duration: "10초", game: "slot",     boostable: true },
  { id: "g10", title: "하이로우",               desc: "다음 카드 더 큼/작음",          reward: 2_800,    category: "게임",   difficulty: "NORMAL", tier: "NORMAL", duration: "15초", game: "highlow",  boostable: true },
  { id: "g11", title: "한정 럭키 (오늘만)",      desc: "오늘 단 100회만 플레이 가능",   reward: 4_500,    category: "게임",   difficulty: "NORMAL", tier: "NORMAL", duration: "5초",  game: "lucky",    boostable: true, fomoLimit: 100 },

  // ─── VIP MISSIONS + GAMES (7) — easier difficulty, bigger rewards ───
  { id: "m5",  title: "프리미엄 카페 리뷰 작성",  desc: "300자 + 사진 1장",            reward: 12_000,   category: "리뷰",   difficulty: "HARD",   tier: "VIP",    duration: "20분", ugc: true },
  { id: "m6",  title: "VIP 데이터 라벨링 100건", desc: "고급 이미지 라벨링",            reward: 35_000,   category: "데이터", difficulty: "VIP",    tier: "VIP",    duration: "45분" },
  { id: "m8",  title: "AI 음성 데이터 녹음",     desc: "한국어 30문장 녹음",            reward: 18_000,   category: "AI",     difficulty: "HARD",   tier: "VIP",    duration: "25분", ugc: true },
  { id: "g4",  title: "VIP 럭키 휠",            desc: "최대 50,000원 당첨",           reward: 8_000,    category: "게임",   difficulty: "VIP",    tier: "VIP",    duration: "5초",  game: "lucky",    boostable: true },
  { id: "g12", title: "VIP 골드 슬롯",          desc: "황금 릴 잭팟 기여 2배",         reward: 15_000,   category: "게임",   difficulty: "NORMAL", tier: "VIP",    duration: "10초", game: "slot",     boostable: true },
  { id: "g13", title: "VIP 스크래치 골드",      desc: "프리미엄 스크래치",             reward: 10_000,   category: "게임",   difficulty: "EASY",   tier: "VIP",    duration: "5초",  game: "scratch",  boostable: true },
  { id: "g14", title: "VIP 리액션 마스터",      desc: "리액션 시 보상 1.5배",          reward: 12_000,   category: "게임",   difficulty: "EASY",   tier: "VIP",    duration: "15초", game: "reaction", boostable: true },

  // ─── GOD MODE (5) — extreme rewards, very easy ───
  { id: "m9",  title: "GOD 데이터 큐레이션",     desc: "고가치 데이터셋",               reward: 120_000,  category: "데이터", difficulty: "VIP",    tier: "GOD",    duration: "60분" },
  { id: "m10", title: "GOD AI RLHF 평가",       desc: "AI 모델 평가",                  reward: 250_000,  category: "AI",     difficulty: "VIP",    tier: "GOD",    duration: "90분" },
  { id: "g5",  title: "GOD 럭키 휠",            desc: "최대 500,000원 당첨",          reward: 50_000,   category: "게임",   difficulty: "VIP",    tier: "GOD",    duration: "5초",  game: "lucky",    boostable: true },
  { id: "g15", title: "GOD 다이아 슬롯",        desc: "잭팟 기여 5배",                reward: 80_000,   category: "게임",   difficulty: "NORMAL", tier: "GOD",    duration: "10초", game: "slot",     boostable: true },
  { id: "g16", title: "GOD 하이로우 챔프",      desc: "9라운드 연승 가능",             reward: 65_000,   category: "게임",   difficulty: "NORMAL", tier: "GOD",    duration: "30초", game: "highlow",  boostable: true },

  // ─── EMPIRE (4) — godlike rewards, jackpot odds insane ───
  { id: "m11", title: "EMPIRE 콘텐츠 캠페인",    desc: "단독 UGC 영상",                 reward: 850_000,  category: "UGC",    difficulty: "VIP",    tier: "EMPIRE", duration: "1일",  ugc: true },
  { id: "m12", title: "EMPIRE 자산 신호 검토",   desc: "팬텀 카운슬 보고서",             reward: 1_500_000, category: "데이터", difficulty: "VIP",   tier: "EMPIRE", duration: "당일" },
  { id: "g17", title: "EMPIRE 다이아 휠",       desc: "최대 1,000만원 + 메가 잭팟",     reward: 500_000,  category: "게임",   difficulty: "VIP",    tier: "EMPIRE", duration: "5초",  game: "lucky",    boostable: true },
  { id: "g18", title: "EMPIRE 잭팟 슬롯",       desc: "잭팟 기여 10배 · 다중 당첨",     reward: 800_000,  category: "게임",   difficulty: "VIP",    tier: "EMPIRE", duration: "10초", game: "slot",     boostable: true },
];

export function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
export function formatKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }
export function gen6() { return Math.floor(100000 + Math.random() * 900000).toString(); }
