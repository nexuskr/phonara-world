// V17 Viral Optimizer — pure helpers (TikTok algorithm reverse-engineered).

export type ViralVideoMetrics = {
  watch_3s_rate: number;   // 0..1
  completion_rate: number; // 0..1
  share_rate: number;      // 0..1
};

/** Plan §10.2: viralScore = 3s*0.3 + completion*0.4 + share*0.3 */
export function viralScore(v: ViralVideoMetrics): number {
  return v.watch_3s_rate * 0.3 + v.completion_rate * 0.4 + v.share_rate * 0.3;
}

const BEST_TIME_MAP: Record<string, string> = {
  KR: "18:00",
  US: "19:00",
  JP: "20:00",
  VN: "19:30",
  AR: "21:00",
};

/** Plan §10.2: regional best-time-to-post (HH:mm, local). */
export function bestPostTime(region: string): string {
  return BEST_TIME_MAP[region.toUpperCase()] ?? "18:00";
}
