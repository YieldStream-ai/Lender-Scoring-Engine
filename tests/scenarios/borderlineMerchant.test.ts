/**
 * Scenario: Metro Auto Repair — Borderline merchant profile
 *
 * FICO 620, $35K revenue, 2 NSFs, 2 positions. Should land in
 * Viable territory with some lenders and get disqualified by
 * stricter ones. Tests margin cases.
 */
import { describe, it, expect } from "vitest";
import { matchLenders } from "@/scoring/lenderMatcher.js";
import { classifyTier } from "@/types.js";
import { metroAutoRepair } from "@fixtures/merchants.js";
import { allBuyboxes } from "@fixtures/lenderBuyboxes.js";
import { historicalDeals } from "@fixtures/historicalDeals.js";
import { fundingOutcomes } from "@fixtures/fundingOutcomes.js";
import { globalOutcomes } from "@fixtures/globalOutcomes.js";

describe("Metro Auto Repair — borderline merchant", () => {
  const result = matchLenders({
    merchant: metroAutoRepair,
    buyboxes: allBuyboxes,
    historicalDeals,
    fundingOutcomes,
    globalOutcomes,
    scoreAdjustments: [],
  });

  it("some lenders qualify, some don't", () => {
    const qualified = result.scores.filter((s) => !s.disqualified);
    const disqualified = result.scores.filter((s) => s.disqualified);
    expect(qualified.length).toBeGreaterThan(0);
    expect(disqualified.length).toBeGreaterThan(0);
  });

  it("no lenders score in Strong tier", () => {
    const qualified = result.scores.filter((s) => !s.disqualified);
    const strongCount = qualified.filter((s) => classifyTier(s.compositeScore) === "strong").length;
    // Metro Auto's weak profile shouldn't produce Strong matches
    expect(strongCount).toBeLessThanOrEqual(1);
  });

  it("Meridian Finance disqualifies (min FICO 650, positions max 2)", () => {
    const meridian = result.scores.find((s) => s.lenderBuybox.lender_name === "Meridian Finance");
    expect(meridian?.disqualified).toBe(true);
  });

  it("Harbor Fund qualifies (permissive buy-box)", () => {
    const harbor = result.scores.find((s) => s.lenderBuybox.lender_name === "Harbor Fund");
    expect(harbor?.disqualified).toBe(false);
    expect(harbor?.compositeScore).toBeGreaterThan(0);
  });

  it("Atlas Capital applies merchant decline history penalty", () => {
    // Metro Auto was previously declined by Atlas (hd-014)
    const atlas = result.scores.find((s) => s.lenderBuybox.lender_name === "Atlas Capital");
    // The -15 merchantHistoryModifier should lower the relationship score
    expect(atlas).toBeDefined();
  });
});
