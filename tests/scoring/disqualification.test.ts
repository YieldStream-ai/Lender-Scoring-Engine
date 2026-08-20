import { describe, it, expect } from "vitest";
import { checkDisqualification } from "@/scoring/disqualification.js";
import type { LenderBuybox } from "@/types.js";

const baseBuybox: LenderBuybox = {
  id: "lb-test",
  lender_name: "Test Lender",
  product_type: "mca",
  is_active: true,
  min_fico: 550,
  min_monthly_revenue: 20000,
  max_positions: 3,
  restricted_states: ["NY", "FL"],
  restricted_industries: ["Cannabis", "Gambling"],
  preferred_terms_months: 12,
  max_nsf_30_day: 5,
  max_nsf_90_day: 12,
  min_month_end_balance: 5000,
  commission_points: 8,
};

const baseMerchant = {
  state: "CA",
  industry: "Restaurant",
  monthly_revenue: 50000,
  nsf_count_30d: 2,
  owner_fico: 650,
  positions: 1,
};

describe("checkDisqualification", () => {
  it("passes when all criteria met", () => {
    const result = checkDisqualification(baseBuybox, baseMerchant);
    expect(result.disqualified).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it("flags restricted state", () => {
    const result = checkDisqualification(baseBuybox, { ...baseMerchant, state: "NY" });
    expect(result.disqualified).toBe(true);
    expect(result.reasons[0]).toContain("State restriction");
  });

  it("flags restricted industry (case-insensitive)", () => {
    const result = checkDisqualification(baseBuybox, { ...baseMerchant, industry: "cannabis" });
    expect(result.disqualified).toBe(true);
    expect(result.reasons[0]).toContain("Industry restriction");
  });

  it("flags revenue below minimum", () => {
    const result = checkDisqualification(baseBuybox, { ...baseMerchant, monthly_revenue: 15000 });
    expect(result.disqualified).toBe(true);
    expect(result.reasons[0]).toContain("Revenue");
  });

  it("flags FICO below minimum", () => {
    const result = checkDisqualification(baseBuybox, { ...baseMerchant, owner_fico: 500 });
    expect(result.disqualified).toBe(true);
    expect(result.reasons[0]).toContain("FICO");
  });

  it("flags positions exceeding max", () => {
    const result = checkDisqualification(baseBuybox, { ...baseMerchant, positions: 4 });
    expect(result.disqualified).toBe(true);
    expect(result.reasons[0]).toContain("positions exceeds");
  });

  it("flags excessive NSFs", () => {
    const result = checkDisqualification(baseBuybox, { ...baseMerchant, nsf_count_30d: 8 });
    expect(result.disqualified).toBe(true);
    expect(result.reasons[0]).toContain("NSFs");
  });

  it("collects multiple reasons", () => {
    const result = checkDisqualification(baseBuybox, {
      ...baseMerchant, state: "NY", owner_fico: 400, positions: 5,
    });
    expect(result.disqualified).toBe(true);
    expect(result.reasons.length).toBe(3);
  });

  it("skips check when merchant field is null", () => {
    const result = checkDisqualification(baseBuybox, {
      state: null, industry: null, monthly_revenue: null,
      owner_fico: null, nsf_count_30d: null, positions: 1,
    });
    expect(result.disqualified).toBe(false);
  });

  it("skips check when buybox field is null", () => {
    const buybox: LenderBuybox = {
      ...baseBuybox,
      min_fico: null, min_monthly_revenue: null,
      max_positions: null, max_nsf_30_day: null,
      restricted_states: [], restricted_industries: [],
    };
    const result = checkDisqualification(buybox, baseMerchant);
    expect(result.disqualified).toBe(false);
  });
});
