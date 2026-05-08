// DM safety audit + platform-specific spec.
// Pure client-side checks for banned phrases, length limits, link/emoji counts,
// and a coarse spam-risk score (0–100).

export type Channel = "tiktok" | "instagram" | "threads" | "naver" | "youtube" | "kakao";

export interface PlatformSpec {
  id: Channel;
  label: string;
  emoji: string;
  /** Soft length target (typical recommended). */
  ideal: [number, number];
  /** Hard maximum the platform allows. */
  hardMax: number;
  /** Tone hint shown in preview. */
  hint: string;
}

export const PLATFORMS: Record<Channel, PlatformSpec> = {
  kakao:     { id: "kakao",     label: "카카오톡",   emoji: "💬", ideal: [40, 120],  hardMax: 1000, hint: "친구톤, 2~3줄, 단순/직설적" },
  instagram: { id: "instagram", label: "인스타그램", emoji: "📸", ideal: [80, 180],  hardMax: 1000, hint: "비주얼 톤, 줄바꿈 활용" },
  threads:   { id: "threads",   label: "스레드",     emoji: "🧵", ideal: [60, 180],  hardMax: 500,  hint: "솔직 대화체, 3줄 내외" },
  tiktok:    { id: "tiktok",    label: "틱톡",       emoji: "🎵", ideal: [40, 150],  hardMax: 1000, hint: "후킹 첫 줄, 이모지 1~2" },
  youtube:   { id: "youtube",   label: "유튜브",     emoji: "▶️", ideal: [80, 250],  hardMax: 500,  hint: "협업 제안 톤, 명확하게" },
  naver:     { id: "naver",     label: "네이버",     emoji: "🟢", ideal: [80, 220],  hardMax: 1000, hint: "정중한 한국어, 신뢰감" },
};

/** Hard-banned phrases — never allowed regardless of context. */
const BANNED: { pattern: RegExp; label: string; suggestion: string }[] = [
  { pattern: /확정\s*수익|보장\s*수익|원금\s*보장/g, label: "확정/보장 수익", suggestion: "“예상 보상 한도”, “일일 미션 리워드”로 바꿔주세요" },
  { pattern: /100\s*%\s*수익|수익\s*100\s*%/g,        label: "100% 수익",       suggestion: "“시작 보상”, “첫 출금 5,000원”처럼 구체 숫자만 사용" },
  { pattern: /다단계|MLM|네트워크\s*마케팅/g,         label: "다단계/MLM",      suggestion: "초대 보상은 “친구 추천 5,000원”처럼 단순하게" },
  { pattern: /불법|사기|투자\s*권유/g,                label: "불법/투자권유 어휘", suggestion: "“부업”, “리워드 플랫폼”으로 순화" },
  { pattern: /원금\s*손실\s*없음/g,                   label: "원금 손실 없음",  suggestion: "리스크 표현 자체를 제거해주세요" },
];

/** Soft-warning phrases — usable in moderation. */
const SOFT: RegExp[] = [
  /대박|초대박|폭발/g,
  /지금\s*당장|오늘\s*안에/g,
  /무조건/g,
  /[!]{3,}/g,
  /[$₩]{2,}/g,
];

export interface AuditResult {
  riskScore: number;             // 0–100
  level: "safe" | "warn" | "danger";
  banned: { label: string; suggestion: string }[];
  soft: string[];
  lengthOk: boolean;
  length: number;
  linkCount: number;
  emojiCount: number;
  capsRatio: number;
  notes: string[];
}

const EMOJI_RX = /\p{Extended_Pictographic}/gu;
const URL_RX = /https?:\/\/[^\s)]+/g;

export function auditDM(text: string, channel: Channel): AuditResult {
  const t = (text || "").trim();
  const spec = PLATFORMS[channel];
  const banned: AuditResult["banned"] = [];
  const soft: string[] = [];
  const notes: string[] = [];

  for (const b of BANNED) {
    if (b.pattern.test(t)) banned.push({ label: b.label, suggestion: b.suggestion });
  }
  for (const r of SOFT) {
    const m = t.match(r);
    if (m) soft.push(m[0]);
  }

  const length = t.length;
  const linkCount = (t.match(URL_RX) || []).length;
  const emojiCount = (t.match(EMOJI_RX) || []).length;
  const lengthOk = length >= spec.ideal[0] && length <= spec.ideal[1];

  // Caps ratio (Latin only)
  const latin = t.replace(/[^A-Za-z]/g, "");
  const upper = latin.replace(/[^A-Z]/g, "").length;
  const capsRatio = latin.length ? upper / latin.length : 0;

  // Score
  let score = 0;
  score += banned.length * 35;
  score += soft.length * 8;
  if (length > spec.hardMax) score += 25;
  if (length < 30) score += 10;
  if (linkCount > 2) score += 15;
  if (emojiCount > 6) score += 10;
  if (capsRatio > 0.5 && latin.length > 6) score += 10;
  score = Math.max(0, Math.min(100, score));

  if (length < spec.ideal[0]) notes.push(`너무 짧음 — 권장 ${spec.ideal[0]}자 이상`);
  else if (length > spec.ideal[1]) notes.push(`길이 초과 — 권장 ${spec.ideal[1]}자 이하 (현재 ${length}자)`);
  if (linkCount > 2) notes.push("링크가 너무 많음 — 1~2개로 줄이세요");
  if (emojiCount > 6) notes.push("이모지 과다 — 스팸으로 분류될 수 있음");
  if (capsRatio > 0.5 && latin.length > 6) notes.push("대문자 과다 — 정상 표기로");

  const level: AuditResult["level"] =
    score >= 60 || banned.length > 0 ? "danger" :
    score >= 25 ? "warn" : "safe";

  return { riskScore: score, level, banned, soft, lengthOk, length, linkCount, emojiCount, capsRatio, notes };
}

export function summaryRisk(results: AuditResult[]) {
  const max = results.reduce((m, r) => Math.max(m, r.riskScore), 0);
  const danger = results.filter(r => r.level === "danger").length;
  const warn = results.filter(r => r.level === "warn").length;
  return { max, danger, warn, total: results.length };
}
