import { describe, it, expect } from "vitest";
import { getTimeDecayWeight } from "@/scoring/timeDecay.js";

describe("getTimeDecayWeight", () => {
  it("returns 1.0 for ≤30 days", () => {
    expect(getTimeDecayWeight(0)).toBe(1.0);
    expect(getTimeDecayWeight(15)).toBe(1.0);
    expect(getTimeDecayWeight(30)).toBe(1.0);
  });

  it("returns 0.4 for 31-90 days", () => {
    expect(getTimeDecayWeight(31)).toBe(0.4);
    expect(getTimeDecayWeight(60)).toBe(0.4);
    expect(getTimeDecayWeight(90)).toBe(0.4);
  });

  it("returns 0.2 for 91-180 days", () => {
    expect(getTimeDecayWeight(91)).toBe(0.2);
    expect(getTimeDecayWeight(120)).toBe(0.2);
    expect(getTimeDecayWeight(180)).toBe(0.2);
  });

  it("returns 0.05 for >180 days", () => {
    expect(getTimeDecayWeight(181)).toBe(0.05);
    expect(getTimeDecayWeight(365)).toBe(0.05);
  });
});
