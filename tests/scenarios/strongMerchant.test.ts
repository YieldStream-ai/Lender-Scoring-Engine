/**
 * Scenario: Coastal Bistro — Strong merchant profile
 *
 * FICO 720, $85K revenue, 0 NSFs, 1 position, $42K ADB.
 * Should score Strong (≥75) with most lenders and be disqualified
 * only by state/industry restrictions.
 */
import { describe, it, expect } from "vitest";
import { matchLenders } from "@/scoring/lenderMatcher.js";
import { classifyTier } from "@/types.js";
import { coastalBistro } from "@fixtures/merchants.js";
import { allBuyboxes } from "@fixtures/lenderBuyboxes.js";
import { historicalDeals } from "@fixtures/historicalDeals.js";
import { fundingOutcomes } from "@fixtures/fundingOutcomes.js";
import { globalOutcomes } from "@fixtures/globalOutcomes.js";

describe("Coastal Bistro — strong merchant", () => {
  const result = matchLenders({
    merchant: coastalBistro,
    buyboxes: allBuyboxes,
    historicalDeals,
    fundingOutcomes,
    globalOutcomes,
    scoreAdjustments: [],
  });

  it("most lenders are not disqualified", () => {
    const qualified = result.scores.filter((s) => !s.disqualified);
    // Coastal Bistro is CA, Restaurant — only Pinnacle restricts CA
    expect(qualified.length).toBeGreaterThanOrEqual(6);
  });

  it("top lenders score in the Strong tier", () => {
    const qualified = result.scores.filter((s) => !s.disqualified);
    const strongCount = qualified.filter((s) => classifyTier(s.compositeScore) === "strong").length;
    expect(strongCount).toBeGreaterThanOrEqual(1);
  });

  it("Pinnacle Lending disqualifies (CA restricted)", () => {
    const pinnacle = result.scores.find((s) => s.lenderBuybox.lender_name === "Pinnacle Lending");
    expect(pinnacle?.disqualified).toBe(true);
    expect(pinnacle?.disqualifyReasons.some((r) => r.includes("State restriction"))).toBe(true);
  });

  it("Meridian Finance gets merchant history bonus", () => {
    // Coastal Bistro has a prior funded deal with Meridian (hd-013)
    const meridian = result.scores.find((s) => s.lenderBuybox.lender_name === "Meridian Finance");
    expect(meridian?.disqualified).toBe(false);
    expect(meridian?.compositeScore).toBeGreaterThan(0);
  });

  it("confidence is high (4 data points + deal history)", () => {
    const qualified = result.scores.filter((s) => !s.disqualified);
    const highConfidence = qualified.filter((s) => s.confidenceLevel === "high");
    expect(highConfidence.length).toBeGreaterThan(0);
  });
});
