import { describe, it, expect } from "vitest";
import { categorizeDecline } from "@/learning/categorizeDecline.js";

describe("categorizeDecline", () => {
  it("categorizes exposure-related declines", () => {
    expect(categorizeDecline("At full exposure capacity")).toBe("max_exposure");
    expect(categorizeDecline("Lender is full")).toBe("max_exposure");
  });

  it("categorizes industry restrictions", () => {
    expect(categorizeDecline("Industry not in appetite")).toBe("industry_restriction");
    expect(categorizeDecline("NAICS code restricted")).toBe("industry_restriction");
  });

  it("categorizes credit quality", () => {
    expect(categorizeDecline("FICO below minimum")).toBe("credit_quality");
    expect(categorizeDecline("Credit score too low")).toBe("credit_quality");
  });

  it("categorizes stacking limits", () => {
    expect(categorizeDecline("Too many existing positions")).toBe("stacking_limit");
    expect(categorizeDecline("Stacking limit exceeded")).toBe("stacking_limit");
  });

  it("categorizes geographic restrictions", () => {
    expect(categorizeDecline("State not covered")).toBe("geographic_restriction");
    expect(categorizeDecline("Geographic restriction")).toBe("geographic_restriction");
  });

  it("categorizes insufficient revenue", () => {
    expect(categorizeDecline("Revenue too low")).toBe("insufficient_revenue");
    expect(categorizeDecline("Insufficient income")).toBe("insufficient_revenue");
  });

  it("categorizes NSF issues", () => {
    expect(categorizeDecline("NSF count too high")).toBe("nsf_excessive");
    expect(categorizeDecline("Excessive overdraft activity")).toBe("nsf_excessive");
  });

  it("categorizes time in business", () => {
    expect(categorizeDecline("Time in business too short")).toBe("time_in_business");
    expect(categorizeDecline("Business too new (TIB)")).toBe("time_in_business");
  });

  it("falls back to other for unknown reasons", () => {
    expect(categorizeDecline("Just didn't like the deal")).toBe("other");
    expect(categorizeDecline("No reason given")).toBe("other");
  });
});
