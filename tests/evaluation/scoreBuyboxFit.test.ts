import { describe, it, expect } from "vitest";
import { scoreBuyboxFit, getRecommendedAction } from "@/evaluation/scoreBuyboxFit.js";
import { atlasCapital, meridianFinance } from "@fixtures/lenderBuyboxes.js";

describe("scoreBuyboxFit", () => {
  const strongDeal = {
    ownerFico: 720,
    timeInBusinessMonths: 36,
    avgMonthlyRevenue: 85000,
    industry: "Restaurant",
    state: "CA",
    maxPosition: 1,
    nsfCount30d: 0,
    minMonthEndBalance: 38000,
  };

  it("returns all-pass for a strong deal vs permissive lender", () => {
    const result = scoreBuyboxFit(strongDeal, atlasCapital);
    expect(result.failCount).toBe(0);
    expect(result.passCount).toBeGreaterThan(0);
  });

  it("flags state restriction", () => {
    const nyDeal = { ...strongDeal, state: "NY" };
    const result = scoreBuyboxFit(nyDeal, atlasCapital); // Atlas restricts NY
    const stateCriterion = result.criteria.find((c) => c.label === "State");
    expect(stateCriterion?.result).toBe("fail");
  });

  it("flags industry restriction", () => {
    const cannabisDeal = { ...strongDeal, industry: "Cannabis" };
    const result = scoreBuyboxFit(cannabisDeal, atlasCapital);
    const industryCriterion = result.criteria.find((c) => c.label === "Industry");
    expect(industryCriterion?.result).toBe("fail");
  });

  it("warns when FICO is near minimum", () => {
    const borderlineDeal = { ...strongDeal, ownerFico: 655 };
    const result = scoreBuyboxFit(borderlineDeal, meridianFinance); // Meridian min_fico=650
    const ficoCriterion = result.criteria.find((c) => c.label === "Min FICO");
    expect(ficoCriterion?.result).toBe("warn"); // 655 is within 20 of 650
  });

  it("fails when FICO is below minimum", () => {
    const lowFicoDeal = { ...strongDeal, ownerFico: 580 };
    const result = scoreBuyboxFit(lowFicoDeal, meridianFinance);
    const ficoCriterion = result.criteria.find((c) => c.label === "Min FICO");
    expect(ficoCriterion?.result).toBe("fail");
  });

  it("returns unknown when data is missing", () => {
    const noFicoDeal = { ...strongDeal, ownerFico: null };
    const result = scoreBuyboxFit(noFicoDeal, meridianFinance);
    const ficoCriterion = result.criteria.find((c) => c.label === "Min FICO");
    expect(ficoCriterion?.result).toBe("unknown");
  });

  it("counts pass/fail/warn correctly", () => {
    const result = scoreBuyboxFit(strongDeal, atlasCapital);
    expect(result.passCount + result.failCount + result.warnCount)
      .toBeLessThanOrEqual(result.criteria.length);
  });
});

describe("getRecommendedAction", () => {
  const allPass = { lenderId: "x", criteria: [], passCount: 5, failCount: 0, warnCount: 0 };
  const hasFail = { lenderId: "x", criteria: [], passCount: 3, failCount: 1, warnCount: 0 };
  const hasWarn = { lenderId: "x", criteria: [], passCount: 3, failCount: 0, warnCount: 2 };

  it("returns submit_now for high score with no fails", () => {
    expect(getRecommendedAction(85, allPass).level).toBe("submit_now");
  });

  it("returns submit_with_note for moderate score with no fails", () => {
    expect(getRecommendedAction(65, allPass).level).toBe("submit_with_note");
  });

  it("returns do_not_submit when any criterion fails", () => {
    expect(getRecommendedAction(90, hasFail).level).toBe("do_not_submit");
  });

  it("returns hold for borderline score with warnings", () => {
    expect(getRecommendedAction(45, hasWarn).level).toBe("hold");
  });

  it("returns do_not_submit for low score even without fails", () => {
    expect(getRecommendedAction(30, allPass).level).toBe("do_not_submit");
  });
});
