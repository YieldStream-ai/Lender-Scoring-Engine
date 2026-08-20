import { describe, it, expect } from "vitest";
import { classifyConfidence } from "@/scoring/confidence.js";

describe("classifyConfidence", () => {
  it("returns high with 3+ data points and 3+ deals", () => {
    const merchant = { monthly_revenue: 50000, owner_fico: 650, avg_daily_balance: 20000, nsf_count_30d: 1 };
    expect(classifyConfidence(merchant, 5)).toBe("high");
  });

  it("returns medium with 3+ data points but < 3 deals", () => {
    const merchant = { monthly_revenue: 50000, owner_fico: 650, avg_daily_balance: 20000, nsf_count_30d: null };
    expect(classifyConfidence(merchant, 1)).toBe("medium");
  });

  it("returns medium with 2 data points", () => {
    const merchant = { monthly_revenue: 50000, owner_fico: 650, avg_daily_balance: null, nsf_count_30d: null };
    expect(classifyConfidence(merchant, 0)).toBe("medium");
  });

  it("returns low with < 2 data points", () => {
    const merchant = { monthly_revenue: 50000, owner_fico: null, avg_daily_balance: null, nsf_count_30d: null };
    expect(classifyConfidence(merchant, 0)).toBe("low");
  });

  it("returns low with all-null merchant", () => {
    const merchant = { monthly_revenue: null, owner_fico: null, avg_daily_balance: null, nsf_count_30d: null };
    expect(classifyConfidence(merchant, 10)).toBe("low");
  });
});
