import { describe, it, expect } from "vitest";
import { computeRelationshipScore } from "@/scoring/relationshipScore.js";

describe("computeRelationshipScore", () => {
  describe("with time-weighted outcomes", () => {
    it("scores 100% funded deals highly", () => {
      const outcomes = [
        { funded: true, daysAgo: 10 },
        { funded: true, daysAgo: 20 },
        { funded: true, daysAgo: 25 },
      ];
      const result = computeRelationshipScore(3, 3, outcomes);
      expect(result.pullThroughRate).toBe(1.0);
      expect(result.score).toBe(100);
      expect(result.hasBonus).toBe(true);
    });

    it("scores 0% funded deals at baseline", () => {
      const outcomes = [
        { funded: false, daysAgo: 10 },
        { funded: false, daysAgo: 20 },
      ];
      const result = computeRelationshipScore(2, 0, outcomes);
      expect(result.pullThroughRate).toBe(0);
      expect(result.score).toBe(20);
    });

    it("applies time decay correctly", () => {
      const outcomes = [
        { funded: true, daysAgo: 5 },    // weight 1.0
        { funded: false, daysAgo: 200 }, // weight 0.05
      ];
      const result = computeRelationshipScore(2, 1, outcomes);
      // pullThrough = 1.0 / (1.0 + 0.05) = 0.952
      expect(result.pullThroughRate).toBeCloseTo(0.952, 2);
    });

    it("grants volume bonus at 5+ outcomes", () => {
      const outcomes = Array.from({ length: 5 }, (_, i) => ({
        funded: true, daysAgo: i * 5,
      }));
      const result = computeRelationshipScore(5, 5, outcomes);
      expect(result.score).toBe(100);
    });

    it("grants larger volume bonus at 10+ outcomes", () => {
      const outcomes = Array.from({ length: 10 }, (_, i) => ({
        funded: i < 5, daysAgo: i * 10,
      }));
      const result = computeRelationshipScore(10, 5, outcomes);
      expect(result.score).toBeGreaterThan(50);
    });

    it("hasBonus requires pullThrough >= 0.6 AND 3+ funded", () => {
      const outcomes = [
        { funded: true, daysAgo: 5 },
        { funded: true, daysAgo: 10 },
        { funded: false, daysAgo: 15 },
      ];
      const result = computeRelationshipScore(3, 2, outcomes);
      expect(result.hasBonus).toBe(false); // only 2 funded < 3 required
    });

    it("isFallback is false when outcomes provided", () => {
      const outcomes = [{ funded: true, daysAgo: 10 }];
      const result = computeRelationshipScore(1, 1, outcomes);
      expect(result.isFallback).toBe(false);
    });
  });

  describe("fallback (count-based)", () => {
    it("returns baseline 30 when no deals submitted", () => {
      const result = computeRelationshipScore(0, 0);
      expect(result.score).toBe(30);
      expect(result.pullThroughRate).toBe(0);
      expect(result.hasBonus).toBe(false);
      expect(result.isFallback).toBe(true);
    });

    it("scores based on pull-through rate", () => {
      // 4/5 = 80% → score = 80*0.8 + 20 = 84, + volume bonus 5 = 89
      const result = computeRelationshipScore(5, 4);
      expect(result.score).toBe(89);
    });

    it("grants hasBonus when rate >= 0.6 and funded >= 3", () => {
      const result = computeRelationshipScore(5, 4);
      expect(result.hasBonus).toBe(true);
    });

    it("no bonus when rate < 0.6", () => {
      const result = computeRelationshipScore(10, 2);
      expect(result.hasBonus).toBe(false);
    });
  });
});
