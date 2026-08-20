import { describe, it, expect } from "vitest";
import { computeAttributeScore } from "@/scoring/attributeScore.js";
import type { LenderBuybox } from "@/types.js";

const baseBuybox: LenderBuybox = {
  id: "lb-test",
  lender_name: "Test Lender",
  product_type: "mca",
  is_active: true,
  min_fico: null,
  min_monthly_revenue: 20000,
  max_positions: null,
  restricted_states: [],
  restricted_industries: [],
  preferred_terms_months: null,
  max_nsf_30_day: 5,
  max_nsf_90_day: null,
  min_month_end_balance: 10000,
  commission_points: null,
};

const baseMerchant = {
  monthly_revenue: 50000,
  owner_fico: 700,
  nsf_count_30d: 0,
  avg_daily_balance: 25000,
  month_end_balance: 15000,
  positions: 1,
};

describe("computeAttributeScore", () => {
  it("returns high score for ideal merchant", () => {
    const result = computeAttributeScore(baseBuybox, baseMerchant);
    // 50 base + 20 (revenue 2.5x) + 15 (FICO 700) + 5 (NSF 0) + 5 (ADB 25k)
    // + 5 (month-end >= min) + 5 (NSF 0 with buybox threshold) = 105 → clamped 100
    expect(result.score).toBe(100);
    expect(result.isFallback).toBe(false);
  });

  it("returns 50 (base) for all-null merchant data", () => {
    const result = computeAttributeScore(baseBuybox, {
      monthly_revenue: null, owner_fico: null, nsf_count_30d: null,
      avg_daily_balance: null, month_end_balance: null, positions: 1,
    });
    expect(result.score).toBe(50);
    expect(result.isFallback).toBe(true);
  });

  it("penalizes low FICO", () => {
    const result = computeAttributeScore(baseBuybox, { ...baseMerchant, owner_fico: 520 });
    expect(result.score).toBeLessThan(100);
  });

  it("penalizes high NSF count", () => {
    const result = computeAttributeScore(baseBuybox, { ...baseMerchant, nsf_count_30d: 8 });
    expect(result.score).toBeLessThan(100);
  });

  it("penalizes 3+ positions", () => {
    const result = computeAttributeScore(baseBuybox, { ...baseMerchant, positions: 3 });
    expect(result.score).toBeLessThan(100);
  });

  it("floors at 0", () => {
    const result = computeAttributeScore(
      { ...baseBuybox, min_monthly_revenue: 50000, min_month_end_balance: 20000 },
      {
        monthly_revenue: 5000, owner_fico: 450, nsf_count_30d: 10,
        avg_daily_balance: 2000, month_end_balance: 1000, positions: 4,
      },
    );
    expect(result.score).toBe(0);
  });

  it("revenue uses fallback scoring when buybox has no min", () => {
    const buybox = { ...baseBuybox, min_monthly_revenue: null, min_month_end_balance: null, max_nsf_30_day: null };
    const result = computeAttributeScore(buybox, { ...baseMerchant, monthly_revenue: 80000 });
    // Fallback: min(15, floor(80000/10000)) = 8 added to base
    expect(result.score).toBeGreaterThan(50);
  });

  it("rewards high ADB", () => {
    // Use a weaker base to avoid hitting the 100 cap
    const weakerMerchant = { ...baseMerchant, owner_fico: 620, nsf_count_30d: 2 };
    const low = computeAttributeScore(baseBuybox, { ...weakerMerchant, avg_daily_balance: 10000 });
    const high = computeAttributeScore(baseBuybox, { ...weakerMerchant, avg_daily_balance: 50000 });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("penalizes month-end balance below lender minimum", () => {
    const result = computeAttributeScore(baseBuybox, { ...baseMerchant, month_end_balance: 5000 });
    expect(result.score).toBeLessThan(100);
  });
});
