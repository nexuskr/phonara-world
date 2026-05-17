/**
 * Shadow Ledger — 가상 PHON pot. sessionStorage persist.
 * 실제 wallet balance 와 무관, money-flow 8경로 미터치.
 * Phase 3.5 에서 real betting 으로 교체될 자리표시.
 */
const KEY = "phonara:duel:shadow:v1";
const START_BALANCE = 100_000;

export interface ShadowEntry {
  round: number;
  side: "left" | "right";
  stake: number;
  winnerSide: "left" | "right";
  payout: number;
  net: number;            // payout - stake
  balanceAfter: number;
  hmacShort: string;
  ts: number;
}

interface State {
  balance: number;
  history: ShadowEntry[];
  lifetimeStaked: number;
  lifetimeWon: number;
}

function loadRaw(): State {
  if (typeof window === "undefined") {
    return { balance: START_BALANCE, history: [], lifetimeStaked: 0, lifetimeWon: 0 };
  }
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { balance: START_BALANCE, history: [], lifetimeStaked: 0, lifetimeWon: 0 };
    const j = JSON.parse(raw);
    return {
      balance: typeof j.balance === "number" ? j.balance : START_BALANCE,
      history: Array.isArray(j.history) ? j.history.slice(-40) : [],
      lifetimeStaked: j.lifetimeStaked ?? 0,
      lifetimeWon: j.lifetimeWon ?? 0,
    };
  } catch {
    return { balance: START_BALANCE, history: [], lifetimeStaked: 0, lifetimeWon: 0 };
  }
}

function save(s: State) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...s, history: s.history.slice(-40) }));
  } catch { /* quota */ }
}

export const shadowLedger = {
  read: loadRaw,
  reset() {
    const s: State = { balance: START_BALANCE, history: [], lifetimeStaked: 0, lifetimeWon: 0 };
    save(s);
    return s;
  },
  /** 베팅 봉납 — balance 가상 차감. 실제로 settle 까지는 outcome 미정. */
  reserve(stake: number): State {
    const s = loadRaw();
    s.balance = Math.max(0, s.balance - stake);
    s.lifetimeStaked += stake;
    save(s);
    return s;
  },
  /** 라운드 정산. payout = 0 (패배) 또는 stake * odds (승리). */
  settle(entry: Omit<ShadowEntry, "balanceAfter" | "ts" | "net">): State {
    const s = loadRaw();
    s.balance += entry.payout;
    s.lifetimeWon += entry.payout;
    const full: ShadowEntry = {
      ...entry,
      net: entry.payout - entry.stake,
      balanceAfter: s.balance,
      ts: Date.now(),
    };
    s.history = [...s.history, full].slice(-40);
    save(s);
    return s;
  },
};

export const SHADOW_START_BALANCE = START_BALANCE;
