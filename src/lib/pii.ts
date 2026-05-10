// PII 마스킹 유틸 — 이메일, 전화번호, 카드번호, 계좌번호, 주민등록번호, JWT/API 키 패턴을 가립니다.
// 클라이언트와 엣지 함수에서 동일 로직을 공유하기 위해 의존성 없이 작성됩니다.

export type PiiKind = "email" | "phone" | "card" | "rrn" | "account" | "token";

export type PiiMatch = { kind: PiiKind; raw: string; masked: string };

const PATTERNS: Array<{ kind: PiiKind; re: RegExp; mask: (m: string) => string }> = [
  // 이메일
  {
    kind: "email",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    mask: (m) => {
      const [u, d] = m.split("@");
      const head = u.slice(0, Math.min(2, u.length));
      return `${head}${"*".repeat(Math.max(2, u.length - 2))}@${d}`;
    },
  },
  // 한국 주민등록번호 (6자리-7자리)
  {
    kind: "rrn",
    re: /\b\d{6}[- ]?[1-4]\d{6}\b/g,
    mask: (m) => `${m.slice(0, 6)}-*******`,
  },
  // 카드번호 (13~19 digits, optional dash/space)
  {
    kind: "card",
    re: /\b(?:\d[ -]?){13,19}\b/g,
    mask: (m) => {
      const digits = m.replace(/[^0-9]/g, "");
      if (digits.length < 13) return m;
      return `${digits.slice(0, 4)}-****-****-${digits.slice(-4)}`;
    },
  },
  // 전화번호 (KR/E.164)
  {
    kind: "phone",
    re: /(?:\+?\d{1,3}[- ]?)?(?:0?1[0-9]|0[2-9]{1,2})[- ]?\d{3,4}[- ]?\d{4}/g,
    mask: (m) => {
      const digits = m.replace(/[^0-9]/g, "");
      if (digits.length < 9) return m;
      return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
    },
  },
  // 계좌번호 (8~14 digits with dashes)
  {
    kind: "account",
    re: /\b\d{2,4}-\d{2,6}-\d{2,8}\b/g,
    mask: (m) => {
      const parts = m.split("-");
      return parts.map((p, i) => (i === parts.length - 1 ? p : "*".repeat(p.length))).join("-");
    },
  },
  // JWT / API key 패턴
  {
    kind: "token",
    re: /\b(?:eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{20,}|pk_[A-Za-z0-9_]{20,})\b/g,
    mask: (m) => `${m.slice(0, 6)}…${m.slice(-4)}`,
  },
];

export function detectPii(text: string): PiiMatch[] {
  const out: PiiMatch[] = [];
  for (const p of PATTERNS) {
    const matches = text.match(p.re);
    if (!matches) continue;
    for (const raw of matches) {
      out.push({ kind: p.kind, raw, masked: p.mask(raw) });
    }
  }
  return out;
}

export function maskPii(text: string): { masked: string; hits: PiiMatch[] } {
  let masked = text;
  const hits: PiiMatch[] = [];
  for (const p of PATTERNS) {
    masked = masked.replace(p.re, (m) => {
      const mm = p.mask(m);
      hits.push({ kind: p.kind, raw: m, masked: mm });
      return mm;
    });
  }
  return { masked, hits };
}

export const PII_LABEL: Record<PiiKind, string> = {
  email: "이메일",
  phone: "전화번호",
  card: "카드번호",
  rrn: "주민등록번호",
  account: "계좌번호",
  token: "토큰/API 키",
};
