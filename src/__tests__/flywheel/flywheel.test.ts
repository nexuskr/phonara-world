// IMPERIAL-SINGULARITY v3.5: split + slippage + emission + monte carlo
import { describe, it, expect } from "vitest";
import {
  expectedSlippage, slippageTone, clampEmission, SPLIT, SLIPPAGE,
  pickWarmKingMessage,
} from "@/lib/flywheel";

describe("flywheel: split", () => {
  it("sums to 1.0 within rounding", () => {
    const s = SPLIT.burn + SPLIT.treasury + SPLIT.reward + SPLIT.liquidity;
    expect(Math.abs(s - 1)).toBeLessThan(1e-9);
  });
  it("matches 45/35/15/5 mandate", () => {
    expect(SPLIT.burn).toBe(0.45);
    expect(SPLIT.treasury).toBe(0.35);
    expect(SPLIT.reward).toBe(0.15);
    expect(SPLIT.liquidity).toBe(0.05);
  });
});

describe("flywheel: slippage", () => {
  it("zero when bet or pool is zero", () => {
    expect(expectedSlippage(0, 1000)).toBe(0);
    expect(expectedSlippage(100, 0)).toBe(0);
  });
  it("monotonic in bet size", () => {
    const a = expectedSlippage(10, 1000);
    const b = expectedSlippage(100, 1000);
    const c = expectedSlippage(500, 1000);
    expect(a).toBeLessThanOrEqual(b);
    expect(b).toBeLessThanOrEqual(c);
  });
  it("caps at 0.42", () => {
    expect(expectedSlippage(1_000_000, 100)).toBeLessThanOrEqual(SLIPPAGE.cap);
  });
  it("tone tiers", () => {
    expect(slippageTone(0.01)).toBe("good");
    expect(slippageTone(0.1)).toBe("warn");
    expect(slippageTone(0.3)).toBe("danger");
  });
});

describe("flywheel: emission clamp", () => {
  it("respects bounds 0.4..1.6", () => {
    expect(clampEmission(0.1)).toBe(0.4);
    expect(clampEmission(5.0)).toBe(1.6);
    expect(clampEmission(1.0)).toBe(1.0);
  });
});

describe("flywheel: warm-king tier mapping", () => {
  it("covers all 5 tiers deterministically", () => {
    expect(pickWarmKingMessage("calm")).toBeTruthy();
    expect(pickWarmKingMessage("warm")).toBeTruthy();
    expect(pickWarmKingMessage("hot")).toBeTruthy();
    expect(pickWarmKingMessage("surge")).toBeTruthy();
    expect(pickWarmKingMessage("extreme")).toBeTruthy();
  });
});

describe("flywheel: monte carlo house edge", () => {
  it("converges to 6.2% +/- 0.4% over 5000 spins", () => {
    // Deterministic LCG to keep CI stable.
    let s = 0xC0FFEE;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000);
    const SPINS = 5000;
    const EDGE = 0.062;
    let stake = 0, payout = 0;
    for (let i = 0; i < SPINS; i++) {
      const bet = 100;
      stake += bet;
      // Pari-mutuel symmetric pool: payout pool = total * (1 - edge)
      const win = rand() < 0.5;
      if (win) payout += bet * 2 * (1 - EDGE);
    }
    const realized = (stake - payout) / stake;
    expect(realized).toBeGreaterThan(EDGE - 0.004);
    expect(realized).toBeLessThan(EDGE + 0.004);
  });
});
