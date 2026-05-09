import { describe, it, expect } from "vitest";
import { classifyClaim, buildClaimTelemetry } from "@/lib/claim-result";
import { formatKRW } from "@/lib/store";

describe("classifyClaim", () => {
  it("returns success when actual >= expected", () => {
    expect(classifyClaim({ expected: 12500, actual: 12500 })).toBe("success");
    expect(classifyClaim({ expected: 12500, actual: 13000 })).toBe("success");
  });
  it("returns partial when 0 < actual < expected", () => {
    expect(classifyClaim({ expected: 12500, actual: 4000 })).toBe("partial");
  });
  it("returns cap_reached when actual <= 0", () => {
    expect(classifyClaim({ expected: 12500, actual: 0 })).toBe("cap_reached");
    expect(classifyClaim({ expected: 12500, actual: -1 })).toBe("cap_reached");
  });
});

describe("buildClaimTelemetry", () => {
  it("captures full payload for support-side debugging", () => {
    const m = buildClaimTelemetry("content", { expected: 7500, actual: 0, capLeftBefore: 0 }, "cap_reached", { run_id: "r1" });
    expect(m.bot_kind).toBe("content");
    expect(m.outcome).toBe("cap_reached");
    expect(m.expected).toBe(7500);
    expect(m.actual).toBe(0);
    expect(m.cap_left_before).toBe(0);
    expect(m.run_id).toBe("r1");
  });
});

describe("formatKRW (currency display)", () => {
  it("uses Korean grouping and 원 suffix", () => {
    expect(formatKRW(0)).toBe("0원");
    expect(formatKRW(12500)).toBe("12,500원");
    expect(formatKRW(1_240_000)).toBe("1,240,000원");
  });
  it("rounds to integer KRW", () => {
    expect(formatKRW(12500.4)).toBe("12,500원");
    expect(formatKRW(12500.6)).toBe("12,501원");
  });
  it("handles null/undefined/NaN as 0원", () => {
    expect(formatKRW(null)).toBe("0원");
    expect(formatKRW(undefined)).toBe("0원");
    expect(formatKRW(Number.NaN)).toBe("0원");
  });
});
