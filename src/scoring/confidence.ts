/**
 * Confidence Level Classification
 *
 * Surfaces how much data backs each prediction, so the broker
 * knows when to trust the score versus when to apply judgment.
 *
 *   High:   ≥ 3 merchant data points + ≥ 3 deal submissions
 *   Medium: ≥ 2 merchant data points
 *   Low:    < 2 merchant data points
 */

import type { ConfidenceLevel } from "../types.js";

export interface ConfidenceInput {
  monthly_revenue: number | null;
  owner_fico: number | null;
  avg_daily_balance: number | null;
  nsf_count_30d: number | null;
}

export function classifyConfidence(
  merchant: ConfidenceInput,
  dealsSubmitted: number,
): ConfidenceLevel {
  let dataPoints = 0;
  if (merchant.monthly_revenue != null) dataPoints++;
  if (merchant.owner_fico != null) dataPoints++;
  if (merchant.avg_daily_balance != null) dataPoints++;
  if (merchant.nsf_count_30d != null) dataPoints++;

  if (dataPoints >= 3 && dealsSubmitted >= 3) return "high";
  if (dataPoints >= 2) return "medium";
  return "low";
}
