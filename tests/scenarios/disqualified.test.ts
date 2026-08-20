/**
 * Scenario: Industry and state restrictions
 *
 * Sunrise Cannabis — Good financials, but Cannabis is restricted everywhere.
 * Quick Mart NY — Good financials, but NY is restricted by several lenders.
 * Struggling Diner — Fails multiple gates simultaneously.
 */
import { describe, it, expect } from "vitest";
import { matchLenders } from "@/scoring/lenderMatcher.js";
import { sunriseCannabis, quickMartNY, strugglingDiner } from "@fixtures/merchants.js";
import { allBuyboxes } from "@fixtures/lenderBuyboxes.js";
import { historicalDeals } from "@fixtures/historicalDeals.js";
import { fundingOutcomes } from "@fixtures/fundingOutcomes.js";
import { globalOutcomes } from "@fixtures/globalOutcomes.js";

const baseInput = {
  buyboxes: allBuyboxes,
  historicalDeals,
  fundingOutcomes,
  globalOutcomes,
  scoreAdjustments: [],
};

describe("Sunrise Cannabis — industry-restricted", () => {
  const result = matchLenders({ ...baseInput, merchant: sunriseCannabis });

  it("every lender disqualifies on industry", () => {
    // Every lender in our fixtures restricts Cannabis
    const disqualified = result.scores.filter((s) => s.disqualified);
    expect(disqualified.length).toBe(allBuyboxes.length);
  });

  it("all composite scores are 0", () => {
    for (const s of result.scores) {
      expect(s.compositeScore).toBe(0);
    }
  });

  it("disqualification reasons mention Cannabis", () => {
    for (const s of result.scores) {
      expect(s.disqualifyReasons.some((r) => r.includes("Cannabis"))).toBe(true);
    }
  });
});

describe("Quick Mart NY — state-restricted by some", () => {
  const result = matchLenders({ ...baseInput, merchant: quickMartNY });

  it("NY-restricted lenders disqualify", () => {
    // Atlas, Meridian, Pinnacle, Bridgeway restrict NY
    const atlas = result.scores.find((s) => s.lenderBuybox.lender_name === "Atlas Capital");
    const meridian = result.scores.find((s) => s.lenderBuybox.lender_name === "Meridian Finance");
    const bridgeway = result.scores.find((s) => s.lenderBuybox.lender_name === "Bridgeway Funding");
    expect(atlas?.disqualified).toBe(true);
    expect(meridian?.disqualified).toBe(true);
    expect(bridgeway?.disqualified).toBe(true);
  });

  it("non-NY-restricted lenders still score", () => {
    const summit = result.scores.find((s) => s.lenderBuybox.lender_name === "Summit Funding");
    const velocity = result.scores.find((s) => s.lenderBuybox.lender_name === "Velocity Capital");
    expect(summit?.disqualified).toBe(false);
    expect(velocity?.disqualified).toBe(false);
    expect(summit?.compositeScore).toBeGreaterThan(0);
  });
});

describe("Struggling Diner — fails multiple gates", () => {
  const result = matchLenders({ ...baseInput, merchant: strugglingDiner });

  it("most lenders disqualify", () => {
    const disqualified = result.scores.filter((s) => s.disqualified);
    expect(disqualified.length).toBeGreaterThanOrEqual(5);
  });

  it("disqualified lenders cite specific reasons", () => {
    for (const s of result.scores.filter((s) => s.disqualified)) {
      expect(s.disqualifyReasons.length).toBeGreaterThan(0);
    }
  });

  it("any qualifying lender scores Weak", () => {
    const qualified = result.scores.filter((s) => !s.disqualified);
    for (const s of qualified) {
      expect(s.compositeScore).toBeLessThan(55);
    }
  });
});
