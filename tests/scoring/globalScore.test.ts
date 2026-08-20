import { describe, it, expect } from "vitest";
import { computeGlobalScores } from "@/scoring/globalScore.js";

function daysAgoMs(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe("computeGlobalScores", () => {
  it("returns empty map for no outcomes", () => {
    const result = computeGlobalScores([]);
    expect(result.size).toBe(0);
  });

  it("scores a lender with 100% approval at 100", () => {
    const outcomes = Array.from({ length: 5 }, () => ({
      lender_id: "lender-1",
      funded: true,
      outcome_recorded_at: daysAgoMs(10),
    }));
    const result = computeGlobalScores(outcomes);
    expect(result.get("lender-1")?.score).toBe(100);
  });

  it("scores a lender with 0% approval at 30", () => {
    const outcomes = Array.from({ length: 3 }, () => ({
      lender_id: "lender-2",
      funded: false,
      outcome_recorded_at: daysAgoMs(15),
    }));
    const result = computeGlobalScores(outcomes);
    expect(result.get("lender-2")?.score).toBe(30);
  });

  it("scores multiple lenders independently", () => {
    const outcomes = [
      { lender_id: "good", funded: true, outcome_recorded_at: daysAgoMs(5) },
      { lender_id: "good", funded: true, outcome_recorded_at: daysAgoMs(10) },
      { lender_id: "bad", funded: false, outcome_recorded_at: daysAgoMs(5) },
      { lender_id: "bad", funded: false, outcome_recorded_at: daysAgoMs(10) },
    ];
    const result = computeGlobalScores(outcomes);
    expect(result.get("good")!.score).toBe(100);
    expect(result.get("bad")!.score).toBe(30);
  });

  it("applies time-decay — recent outcomes matter more", () => {
    // Recent decline (weight 1.0) + old approval (weight 0.05)
    const outcomes = [
      { lender_id: "mixed", funded: false, outcome_recorded_at: daysAgoMs(5) },
      { lender_id: "mixed", funded: true, outcome_recorded_at: daysAgoMs(200) },
    ];
    const result = computeGlobalScores(outcomes);
    const score = result.get("mixed")!;
    // weighted rate ≈ 0.05/(1.0+0.05) ≈ 0.048 → score ≈ 30 + 0.048*70 ≈ 33
    expect(score.score).toBeLessThan(40);
  });

  it("tracks totalOutcomes and fundedCount", () => {
    const outcomes = [
      { lender_id: "x", funded: true, outcome_recorded_at: daysAgoMs(10) },
      { lender_id: "x", funded: false, outcome_recorded_at: daysAgoMs(20) },
      { lender_id: "x", funded: true, outcome_recorded_at: daysAgoMs(30) },
    ];
    const result = computeGlobalScores(outcomes);
    expect(result.get("x")!.totalOutcomes).toBe(3);
    expect(result.get("x")!.fundedCount).toBe(2);
  });
});
