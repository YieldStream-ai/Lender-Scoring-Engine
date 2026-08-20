import { describe, it, expect } from "vitest";
import { matchLenders } from "@/scoring/lenderMatcher.js";
import { coastalBistro, strugglingDiner } from "@fixtures/merchants.js";
import { allBuyboxes } from "@fixtures/lenderBuyboxes.js";
import { historicalDeals } from "@fixtures/historicalDeals.js";
import { fundingOutcomes } from "@fixtures/fundingOutcomes.js";
import { globalOutcomes } from "@fixtures/globalOutcomes.js";

describe("matchLenders (integration)", () => {
  const baseInput = {
    buyboxes: allBuyboxes,
    historicalDeals,
    fundingOutcomes,
    globalOutcomes,
    scoreAdjustments: [],
  };

  it("returns scores sorted by composite descending", () => {
    const result = matchLenders({ ...baseInput, merchant: coastalBistro });
    const scores = result.scores.map((s) => s.compositeScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it("assigns a score to every active buybox", () => {
    const result = matchLenders({ ...baseInput, merchant: coastalBistro });
    expect(result.scores.length).toBe(allBuyboxes.length);
  });

  it("disqualified lenders get composite 0", () => {
    const result = matchLenders({ ...baseInput, merchant: strugglingDiner });
    const disqualified = result.scores.filter((s) => s.disqualified);
    for (const s of disqualified) {
      expect(s.compositeScore).toBe(0);
    }
  });

  it("tracks data completeness", () => {
    const result = matchLenders({ ...baseInput, merchant: coastalBistro });
    expect(result.dataCompleteness.attributeDataComplete).toBe(true);
    expect(result.dataCompleteness.isoHasAnyHistory).toBe(true);
  });

  it("applies decline adjustments as percentage penalty", () => {
    const withPenalty = matchLenders({
      ...baseInput,
      merchant: coastalBistro,
      scoreAdjustments: [{
        id: "adj-1",
        lender_name: "Atlas Capital",
        adjustment_pct: -20,
        reason: "Credit quality decline",
        decline_category: "credit_quality",
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }],
    });
    const withoutPenalty = matchLenders({ ...baseInput, merchant: coastalBistro });

    const atlasWithPenalty = withPenalty.scores.find((s) => s.lenderBuybox.lender_name === "Atlas Capital")!;
    const atlasWithout = withoutPenalty.scores.find((s) => s.lenderBuybox.lender_name === "Atlas Capital")!;

    expect(atlasWithPenalty.compositeScore).toBeLessThan(atlasWithout.compositeScore);
  });

  it("each score has all three sub-scores populated", () => {
    const result = matchLenders({ ...baseInput, merchant: coastalBistro });
    for (const s of result.scores) {
      expect(s.globalScore).toBeGreaterThanOrEqual(0);
      expect(s.relationshipScore).toBeGreaterThanOrEqual(0);
      expect(s.attributeScore).toBeGreaterThanOrEqual(0);
    }
  });
});
