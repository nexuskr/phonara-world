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
};

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
  game?: "tap" | "lucky" | "memory"; // game mission
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
};

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

export const PACKAGES: Pkg[] = [
  { id: "starter", name: "스타터 게이트", tagline: "사이버 머니의 첫 관문", price: 50000, dailyReturn: 3000, duration: 30, totalReturn: 90000, tier: "STARTER", unlocksTier: "NORMAL", perks: ["일일 자동 미션 5개", "기본 AI 추천", "24시간 지원"] },
  { id: "empire-founder", name: "Empire Founder Club", tagline: "제국을 세우는 자들의 첫 클럽", price: 500000, dailyReturn: 38000, duration: 45, totalReturn: 1710000, tier: "FOUNDER", unlocksTier: "VIP", perks: ["VIP 미션 전용 풀", "즉시 정산 24/7", "1:1 매니저", "VIP 텔레그램 채널"] },
  { id: "god-mode", name: "God Mode Empire Syndicate", tagline: "한계 없는 수익의 신모드", price: 2000000, dailyReturn: 180000, duration: 45, totalReturn: 8100000, tier: "GOD", unlocksTier: "GOD", perks: ["무제한 GOD 미션", "AI 자동 수익 봇", "월간 보너스 + 골드", "프라이빗 리더보드"] },
  { id: "ai-data", name: "AI Data Kingdom Fund", tagline: "AI 데이터 왕국의 매일 송금", price: 5000000, dailyReturn: 480000, duration: 45, totalReturn: 21600000, tier: "AI", unlocksTier: "GOD", perks: ["AI 데이터 라벨링 분배", "매일 4회 정산", "AI 트레이닝 셰어", "전용 콘시어지"] },
  { id: "faceless", name: "Faceless Billionaire Program", tagline: "얼굴 없는 억만장자", price: 10000000, dailyReturn: 1000000, duration: 50, totalReturn: 50000000, tier: "EMPIRE", unlocksTier: "EMPIRE", perks: ["완전 익명 운영", "오프라인 VIP 컨퍼런스", "글로벌 송금", "무제한 부스터"] },
  { id: "phantom", name: "Phantom Empire Council", tagline: "선택받은 0.01% 팬텀 카운슬", price: 30000000, dailyReturn: 3500000, duration: 50, totalReturn: 175000000, tier: "PHANTOM", unlocksTier: "EMPIRE", perks: ["초대 전용 멤버십", "전용 자산 매니저", "프라이빗 제트 미팅", "글로벌 라운지"] },
];

export const DEFAULT_MISSIONS: Mission[] = [
  { id: "m1", title: "쿠팡 앱 설치 후 30초 실행", desc: "신규 앱 다운로드 후 메인 진입", reward: 1500, category: "광고", difficulty: "EASY", tier: "NORMAL", duration: "30초" },
  { id: "m2", title: "AI 챗봇 응답 평가 5건", desc: "AI 응답 품질 평가", reward: 4500, category: "AI", difficulty: "NORMAL", tier: "NORMAL", duration: "5분" },
  { id: "m3", title: "유튜브 영상 시청 + 좋아요", desc: "지정 영상 60초 시청", reward: 800, category: "광고", difficulty: "EASY", tier: "NORMAL", duration: "1분" },
  { id: "m4", title: "10분 마켓 리서치 설문", desc: "라이프스타일 설문", reward: 7200, category: "설문", difficulty: "NORMAL", tier: "NORMAL", duration: "10분" },
  { id: "m5", title: "프리미엄 카페 리뷰 작성", desc: "300자 이상 + 사진 1장", reward: 12000, category: "리뷰", difficulty: "HARD", tier: "VIP", duration: "20분", ugc: true },
  { id: "m6", title: "VIP 데이터 라벨링 100건", desc: "고급 이미지 라벨링", reward: 35000, category: "데이터", difficulty: "VIP", tier: "VIP", duration: "45분" },
  { id: "m7", title: "친구 1명 초대하기", desc: "추천코드로 친구 가입", reward: 5000, category: "추천", difficulty: "NORMAL", tier: "NORMAL", duration: "즉시" },
  { id: "m8", title: "AI 음성 데이터 녹음", desc: "한국어 30문장 녹음", reward: 18000, category: "AI", difficulty: "HARD", tier: "VIP", duration: "25분", ugc: true },
  { id: "m9", title: "GOD 모드 데이터 큐레이션", desc: "고가치 데이터셋 큐레이션", reward: 120000, category: "데이터", difficulty: "VIP", tier: "GOD", duration: "60분" },
  { id: "m10", title: "GOD AI 트레이너 세션", desc: "AI 모델 RLHF 평가", reward: 250000, category: "AI", difficulty: "VIP", tier: "GOD", duration: "90분" },
  { id: "m11", title: "EMPIRE 콘텐츠 캠페인", desc: "단독 UGC 영상 제작", reward: 850000, category: "UGC", difficulty: "VIP", tier: "EMPIRE", duration: "1일", ugc: true },
  { id: "m12", title: "EMPIRE 자산 신호 검토", desc: "팬텀 카운슬 전용 보고서", reward: 1500000, category: "데이터", difficulty: "VIP", tier: "EMPIRE", duration: "당일" },
];

export function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
export function formatKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }
export function gen6() { return Math.floor(100000 + Math.random() * 900000).toString(); }
