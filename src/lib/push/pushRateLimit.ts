// PR-P0-6: Client-side daily push cap mirror.
// Server `push_send_log` is the source of truth (3/day). This local mirror
// powers UX hints ("오늘 알림은 여기까지예요") without an extra RPC.

const DAILY_CAP = 3;
const PREFIX = "phonara:push:daily:";

function todayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${PREFIX}${y}-${m}-${day}`;
}

function readCount(): number {
  try {
    const v = localStorage.getItem(todayKey());
    return v ? Math.max(0, parseInt(v, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

function writeCount(n: number) {
  try { localStorage.setItem(todayKey(), String(n)); } catch {}
}

/** Increment today's local received-count. Called from SW message bridge. */
export function recordPushReceived(): number {
  const n = readCount() + 1;
  writeCount(n);
  return n;
}

export function getDailyPushCap(): number {
  return DAILY_CAP;
}

export function getPushReceivedToday(): number {
  return readCount();
}

export function isPushCapped(): boolean {
  return readCount() >= DAILY_CAP;
}

/** GC: removes any non-today daily keys. */
export function pruneOldPushCounters(): void {
  try {
    const keep = todayKey();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && k !== keep) localStorage.removeItem(k);
    }
  } catch {}
}
