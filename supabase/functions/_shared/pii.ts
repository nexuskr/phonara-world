// Edge function용 PII 마스킹 — Deno 호환 (src/lib/pii.ts와 동일 로직).
export type PiiKind = "email" | "phone" | "card" | "rrn" | "account" | "token";
export type PiiMatch = { kind: PiiKind; raw: string; masked: string };

const PATTERNS: Array<{ kind: PiiKind; re: RegExp; mask: (m: string) => string }> = [
  { kind: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    mask: (m) => { const [u, d] = m.split("@"); return `${u.slice(0, 2)}${"*".repeat(Math.max(2, u.length - 2))}@${d}`; } },
  { kind: "rrn", re: /\b\d{6}[- ]?[1-4]\d{6}\b/g, mask: (m) => `${m.slice(0, 6)}-*******` },
  { kind: "card", re: /\b(?:\d[ -]?){13,19}\b/g,
    mask: (m) => { const d = m.replace(/[^0-9]/g, ""); return d.length >= 13 ? `${d.slice(0, 4)}-****-****-${d.slice(-4)}` : m; } },
  { kind: "phone", re: /(?:\+?\d{1,3}[- ]?)?(?:0?1[0-9]|0[2-9]{1,2})[- ]?\d{3,4}[- ]?\d{4}/g,
    mask: (m) => { const d = m.replace(/[^0-9]/g, ""); return d.length >= 9 ? `${d.slice(0, 3)}-****-${d.slice(-4)}` : m; } },
  { kind: "account", re: /\b\d{2,4}-\d{2,6}-\d{2,8}\b/g,
    mask: (m) => { const parts = m.split("-"); return parts.map((p, i) => i === parts.length - 1 ? p : "*".repeat(p.length)).join("-"); } },
  { kind: "token", re: /\b(?:eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{20,}|pk_[A-Za-z0-9_]{20,})\b/g,
    mask: (m) => `${m.slice(0, 6)}…${m.slice(-4)}` },
];

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
