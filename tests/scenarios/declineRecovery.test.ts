/**
 * Scenario: Decline → Penalty → Expiry → Recovery
 *
 * Tests the full learning loop lifecycle:
 *   1. Score a lender normally
 *   2. Process a decline → penalty created
 *   3. Score again with penalty → lower composite
 *   4. Simulate 30+ days passing → penalty expires
 *   5. Score again → composite recovers
 */
import { describe, it, expect } from "vitest";
import { matchLenders } from "@/scoring/lenderMatcher.js";
import { processDecline, getActiveAdjustments } from "@/learning/declineIntelligence.js";
import { coastalBistro } from "@fixtures/merchants.js";
import { allBuyboxes } from "@fixtures/lenderBuyboxes.js";
import { historicalDeals } from "@fixtures/historicalDeals.js";
import { fundingOutcomes } from "@fixtures/fundingOutcomes.js";
import { globalOutcomes } from "@fixtures/globalOutcomes.js";

describe("decline → penalty → recovery lifecycle", () => {
  const baseInput = {
    merchant: coastalBistro,
    buyboxes: allBuyboxes,
    historicalDeals,
    fundingOutcomes,
    globalOutcomes,
  };

  const getAtlasScore = (adjustments: typeof baseInput extends { scoreAdjustments: infer T } ? T : never[]) => {
    const result = matchLenders({ ...baseInput, scoreAdjustments: adjustments });
    return result.scores.find((s) => s.lenderBuybox.lender_name === "Atlas Capital")!.compositeScore;
  };

  it("full lifecycle: score → decline → penalized → expire → recover", () => {
    const now = new Date("2026-08-20T12:00:00Z");

    // Step 1: Baseline score (no penalties)
    const baselineScore = getAtlasScore([]);
    expect(baselineScore).toBeGreaterThan(0);

    // Step 2: Process a decline
    const { newAdjustment } = processDecline(
      { lenderName: "Atlas Capital", funded: false, declineReason: "FICO too low", declineCategory: null },
      null,
      now,
    );
    expect(newAdjustment).not.toBeNull();

    // Step 3: Score with the active penalty
    const penalizedScore = getAtlasScore([newAdjustment!]);
    expect(penalizedScore).toBeLessThan(baselineScore);

    // Step 4: Simulate 31 days passing — penalty should expire
    const future = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
    const activeAfterExpiry = getActiveAdjustments([newAdjustment!], future);
    expect(activeAfterExpiry).toHaveLength(0);

    // Step 5: Score again with no active adjustments — should recover
    const recoveredScore = getAtlasScore(activeAfterExpiry);
    expect(recoveredScore).toBe(baselineScore);
  });

  it("stacked declines compound but cap at -50%", () => {
    const now = new Date("2026-08-20T12:00:00Z");

    // First decline: -20%
    const { newAdjustment: first } = processDecline(
      { lenderName: "Atlas Capital", funded: false, declineReason: "Credit quality", declineCategory: null },
      null,
      now,
    );

    // Second decline: stacks to -40%
    const { newAdjustment: second } = processDecline(
      { lenderName: "Atlas Capital", funded: false, declineReason: "NSF excessive", declineCategory: null },
      first!,
      now,
    );
    expect(second!.adjustment_pct).toBe(-40);

    // Third decline: stacks to -50% (cap)
    const { newAdjustment: third } = processDecline(
      { lenderName: "Atlas Capital", funded: false, declineReason: "Revenue too low", declineCategory: null },
      second!,
      now,
    );
    expect(third!.adjustment_pct).toBe(-50);

    // Penalized score should be roughly half of baseline
    const baselineScore = getAtlasScore([]);
    const heavilyPenalized = getAtlasScore([third!]);
    expect(heavilyPenalized).toBeLessThanOrEqual(Math.ceil(baselineScore * 0.55));
  });
});
