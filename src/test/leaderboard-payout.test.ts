import { describe, it, expect } from "vitest";

// Mirrors the SQL CASE in pay_weekly_leaderboard / dry-run:
// rank 1 → 50_000, rank 2 → 30_000, rank 3 → 15_000, otherwise 0
function payoutForRank(rank: number): number {
  if (rank === 1) return 50_000;
  if (rank === 2) return 30_000;
  if (rank === 3) return 15_000;
  return 0;
}

describe("weekly leaderboard payout tiers", () => {
  it("matches the canonical 50/30/15 KRW tiers", () => {
    expect(payoutForRank(1)).toBe(50_000);
    expect(payoutForRank(2)).toBe(30_000);
    expect(payoutForRank(3)).toBe(15_000);
  });

  it("pays nothing outside top 3", () => {
    expect(payoutForRank(0)).toBe(0);
    expect(payoutForRank(4)).toBe(0);
    expect(payoutForRank(99)).toBe(0);
  });

  it("totals 95,000 KRW per week when 3 winners exist", () => {
    const total = payoutForRank(1) + payoutForRank(2) + payoutForRank(3);
    expect(total).toBe(95_000);
  });
});

describe("rank-change notification policy", () => {
  // Mirrors tick_weekly_leaderboard_ranks branching
  type Branch = "enter_top10" | "moved_up" | "fell_out_top3" | "noop";
  function classify(prev: number | null, current: number): Branch {
    if (prev === null && current <= 10) return "enter_top10";
    if (prev !== null && current < prev) return "moved_up";
    if (prev !== null && current > prev && prev <= 3 && current > 3) return "fell_out_top3";
    return "noop";
  }

  it("notifies first-time entry into TOP 10", () => {
    expect(classify(null, 7)).toBe("enter_top10");
    expect(classify(null, 11)).toBe("noop");
  });

  it("notifies on rank improvement", () => {
    expect(classify(8, 5)).toBe("moved_up");
    expect(classify(2, 1)).toBe("moved_up");
  });

  it("warns when falling out of TOP 3", () => {
    expect(classify(2, 5)).toBe("fell_out_top3");
    expect(classify(3, 4)).toBe("fell_out_top3");
    expect(classify(5, 8)).toBe("noop"); // already outside top 3
  });
});
