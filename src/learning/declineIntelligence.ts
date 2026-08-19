/**
 * Decline Intelligence — Closed-Loop Score Adjustment Engine
 *
 * When a deal is declined, the system creates a temporary score penalty
 * for that lender. Penalties stack (capped at -50%) and auto-expire
 * after 30 days, allowing the lender's score to recover naturally.
 *
 * In production this runs as an Inngest event handler triggered by
 * `submission/outcome-recorded`. Here it's extracted as a pure function
 * that takes current state and returns the new adjustment.
 *
 * Severity map:
 *   max_exposure:            -10%
 *   geographic_restriction:  -10%
 *   industry_restriction:    -15%
 *   stacking_limit:          -15%
 *   credit_quality:          -20%
 *   nsf_excessive:           -20%
 *   insufficient_revenue:    -20%
 *   time_in_business:        -15%
 *   other:                   -10%
 */

import type { ScoreAdjustment } from "../types.js";
import { categorizeDecline, type DeclineCategory } from "./categorizeDecline.js";

// ── Constants ────────────────────────────────────────────────────────────────

const DECLINE_SEVERITY: Record<DeclineCategory, number> = {
  max_exposure: -10,
  geographic_restriction: -10,
  industry_restriction: -15,
  stacking_limit: -15,
  credit_quality: -20,
  nsf_excessive: -20,
  insufficient_revenue: -20,
  time_in_business: -15,
  other: -10,
};

const DEFAULT_EXPIRY_DAYS = 30;
const MAX_PENALTY_PCT = -50;

// ── Types ────────────────────────────────────────────────────────────────────

export interface DeclineEvent {
  lenderName: string;
  funded: false;
  declineReason: string | null;
  declineCategory: string | null;
}

export type AdjustmentAction =
  | { action: "created"; lenderName: string; adjustmentPct: number; category: DeclineCategory }
  | { action: "stacked"; lenderName: string; adjustmentPct: number; category: DeclineCategory }
  | { action: "skipped"; reason: string };

// ── Core Function ────────────────────────────────────────────────────────────

/**
 * Compute the score adjustment that should be applied after a decline.
 *
 * Pure function: takes the decline event + any existing active adjustment
 * for this lender, returns the action to take and the new adjustment state.
 */
export function processDecline(
  event: DeclineEvent,
  existingAdjustment: ScoreAdjustment | null,
  now: Date = new Date(),
): { action: AdjustmentAction; newAdjustment: ScoreAdjustment | null } {
  if (event.funded) {
    return {
      action: { action: "skipped", reason: "funded" },
      newAdjustment: null,
    };
  }

  const category: DeclineCategory =
    (event.declineCategory as DeclineCategory) ??
    (event.declineReason ? categorizeDecline(event.declineReason) : "other");

  const adjustmentPct = DECLINE_SEVERITY[category] ?? -10;

  const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Stack onto existing adjustment if one is active
  if (existingAdjustment && existingAdjustment.is_active) {
    const newPct = Math.max(MAX_PENALTY_PCT, existingAdjustment.adjustment_pct + adjustmentPct);

    return {
      action: {
        action: "stacked",
        lenderName: event.lenderName,
        adjustmentPct: newPct,
        category,
      },
      newAdjustment: {
        ...existingAdjustment,
        adjustment_pct: newPct,
        reason: `${event.declineReason ?? "Declined"} (stacked penalty)`,
        decline_category: category,
        expires_at: expiresAt.toISOString(),
      },
    };
  }

  // Create new adjustment
  const newAdjustment: ScoreAdjustment = {
    id: crypto.randomUUID(),
    lender_name: event.lenderName,
    adjustment_pct: adjustmentPct,
    reason: event.declineReason ?? "Declined — no reason provided",
    decline_category: category,
    is_active: true,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  return {
    action: {
      action: "created",
      lenderName: event.lenderName,
      adjustmentPct,
      category,
    },
    newAdjustment,
  };
}

/**
 * Check whether an adjustment has expired.
 */
export function isExpired(adjustment: ScoreAdjustment, now: Date = new Date()): boolean {
  return new Date(adjustment.expires_at).getTime() <= now.getTime();
}

/**
 * Filter a list of adjustments to only active, non-expired ones.
 */
export function getActiveAdjustments(
  adjustments: ScoreAdjustment[],
  now: Date = new Date(),
): ScoreAdjustment[] {
  return adjustments.filter((a) => a.is_active && !isExpired(a, now));
}
