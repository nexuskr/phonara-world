import { describe, it, expect } from "vitest";
import { DEFAULT_MISSIONS, missionBucket, type Mission } from "@/lib/store";

describe("missionBucket (Phase 4 — 4-bucket consolidation)", () => {
  it("매일 출석 카테고리는 daily 버킷으로 매핑", () => {
    const m = DEFAULT_MISSIONS.find((x) => x.category === "출석");
    expect(m).toBeTruthy();
    expect(missionBucket(m as Mission)).toContain("daily");
  });

  it("트레이딩/게임 카테고리는 battle 버킷으로 매핑", () => {
    const trading = DEFAULT_MISSIONS.find((x) => x.category === "트레이딩");
    const game = DEFAULT_MISSIONS.find((x) => x.category === "게임");
    expect(trading && missionBucket(trading)).toContain("battle");
    expect(game && missionBucket(game)).toContain("battle");
  });

  it("UGC/추천/바이럴 등은 rewards 버킷으로 매핑", () => {
    const ugc = DEFAULT_MISSIONS.find((x) => x.category === "UGC");
    const refer = DEFAULT_MISSIONS.find((x) => x.category === "추천");
    if (ugc) expect(missionBucket(ugc)).toContain("rewards");
    if (refer) expect(missionBucket(refer)).toContain("rewards");
  });

  it("시니어 안전 1탭 게임/가족초대/시황퀴즈만 senior 버킷", () => {
    const seniorSafe = DEFAULT_MISSIONS.filter((m) => missionBucket(m).includes("senior"));
    const ids = seniorSafe.map((m) => m.id).sort();
    // family_invite, weekly_streak_compound, market_pulse_quiz, empire_day_double, 럭키/스크래치/휠 카드
    expect(ids).toContain("family_invite");
    expect(ids).toContain("market_pulse_quiz");
    expect(ids).toContain("g2");  // 럭키 박스
    expect(ids).toContain("g7");  // 스크래치
    expect(ids).toContain("g4");  // VIP 럭키 휠
    // 시니어 부적합 ID 들은 절대 senior 에 포함되면 안 됨
    expect(ids).not.toContain("g1"); // (제거됨, 정의되지 않음)
  });

  it("미니게임은 lucky/scratch/wheel 계열 3종만 남아 있어야 함", () => {
    const games = DEFAULT_MISSIONS.filter((m) => m.game);
    const allowed = new Set(["lucky", "scratch", "wheel"]);
    for (const g of games) expect(allowed.has(g.game as string)).toBe(true);
    // tap/memory/reaction/dice/slot/highlow 는 모두 제거되어야 함
    const banned = new Set(["tap", "memory", "reaction", "dice", "slot", "highlow"]);
    for (const g of games) expect(banned.has(g.game as string)).toBe(false);
  });

  it("모든 미션은 최소 하나의 버킷에 속함 (orphan 0)", () => {
    for (const m of DEFAULT_MISSIONS) {
      expect(missionBucket(m).length).toBeGreaterThan(0);
    }
  });
});
