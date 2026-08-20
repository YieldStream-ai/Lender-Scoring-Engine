import { describe, it, expect } from "vitest";
import { processDecline, isExpired, getActiveAdjustments } from "@/learning/declineIntelligence.js";
import type { ScoreAdjustment } from "@/types.js";

describe("processDecline", () => {
  const now = new Date("2026-08-20T12:00:00Z");

  it("creates a new adjustment for a decline", () => {
    const { action, newAdjustment } = processDecline(
      { lenderName: "Atlas Capital", funded: false, declineReason: "FICO too low", declineCategory: null },
      null,
      now,
    );
    expect(action).toMatchObject({ action: "created", category: "credit_quality", adjustmentPct: -20 });
    expect(newAdjustment!.adjustment_pct).toBe(-20);
    expect(newAdjustment!.lender_name).toBe("Atlas Capital");
    expect(newAdjustment!.is_active).toBe(true);
  });

  it("uses provided category over heuristic", () => {
    const { action } = processDecline(
      { lenderName: "X", funded: false, declineReason: "some reason", declineCategory: "stacking_limit" },
      null,
      now,
    );
    expect(action).toMatchObject({ category: "stacking_limit", adjustmentPct: -15 });
  });

  it("stacks onto existing adjustment", () => {
    const existing: ScoreAdjustment = {
      id: "adj-1",
      lender_name: "Atlas Capital",
      adjustment_pct: -20,
      reason: "Previous decline",
      decline_category: "credit_quality",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
      expires_at: "2026-08-31T00:00:00Z",
    };

    const { action, newAdjustment } = processDecline(
      { lenderName: "Atlas Capital", funded: false, declineReason: "NSF too high", declineCategory: null },
      existing,
      now,
    );
    expect(action).toMatchObject({ action: "stacked" });
    expect(newAdjustment!.adjustment_pct).toBe(-40); // -20 + -20
  });

  it("caps stacked penalties at -50%", () => {
    const existing: ScoreAdjustment = {
      id: "adj-1",
      lender_name: "Atlas Capital",
      adjustment_pct: -40,
      reason: "Multiple declines",
      decline_category: "credit_quality",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
      expires_at: "2026-08-31T00:00:00Z",
    };

    const { newAdjustment } = processDecline(
      { lenderName: "Atlas Capital", funded: false, declineReason: "FICO too low", declineCategory: null },
      existing,
      now,
    );
    expect(newAdjustment!.adjustment_pct).toBe(-50); // capped
  });

  it("sets 30-day expiry on new adjustments", () => {
    const { newAdjustment } = processDecline(
      { lenderName: "X", funded: false, declineReason: "Declined", declineCategory: "other" },
      null,
      now,
    );
    const expiresAt = new Date(newAdjustment!.expires_at);
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });
});

describe("isExpired", () => {
  it("returns true when past expiry", () => {
    const adj: ScoreAdjustment = {
      id: "1", lender_name: "X", adjustment_pct: -10, reason: "test",
      decline_category: null, is_active: true,
      created_at: "2026-07-01T00:00:00Z", expires_at: "2026-07-31T00:00:00Z",
    };
    expect(isExpired(adj, new Date("2026-08-15T00:00:00Z"))).toBe(true);
  });

  it("returns false when before expiry", () => {
    const adj: ScoreAdjustment = {
      id: "1", lender_name: "X", adjustment_pct: -10, reason: "test",
      decline_category: null, is_active: true,
      created_at: "2026-08-01T00:00:00Z", expires_at: "2026-09-01T00:00:00Z",
    };
    expect(isExpired(adj, new Date("2026-08-15T00:00:00Z"))).toBe(false);
  });
});

describe("getActiveAdjustments", () => {
  it("filters out expired and inactive adjustments", () => {
    const adjustments: ScoreAdjustment[] = [
      { id: "1", lender_name: "A", adjustment_pct: -10, reason: "active", decline_category: null, is_active: true, created_at: "2026-08-01T00:00:00Z", expires_at: "2026-09-01T00:00:00Z" },
      { id: "2", lender_name: "B", adjustment_pct: -15, reason: "expired", decline_category: null, is_active: true, created_at: "2026-06-01T00:00:00Z", expires_at: "2026-07-01T00:00:00Z" },
      { id: "3", lender_name: "C", adjustment_pct: -20, reason: "inactive", decline_category: null, is_active: false, created_at: "2026-08-01T00:00:00Z", expires_at: "2026-09-01T00:00:00Z" },
    ];
    const active = getActiveAdjustments(adjustments, new Date("2026-08-15T00:00:00Z"));
    expect(active).toHaveLength(1);
    expect(active[0].lender_name).toBe("A");
  });
});
