/**
 * Layer C: Attribute Match Score (0–100)
 *
 * Pure merchant-vs-buybox financial fit. Starts at a base of 50 and
 * adjusts based on how well the merchant's financials align with the
 * lender's preferences:
 *
 *   Revenue alignment      +5 to +20 (or generic bonus up to +15)
 *   FICO alignment         -10 to +15
 *   NSF penalty            -25 to +5
 *   Position penalty       -15 to 0
 *   Avg daily balance      -10 to +10
 *   Month-end balance      -10 to +10
 *   NSF vs lender max      +3 to +5
 */

import type { LenderBuybox, SubScoreResult } from "../types.js";

export interface AttributeInput {
  monthly_revenue: number | null;
  owner_fico: number | null;
  nsf_count_30d: number | null;
  avg_daily_balance: number | null;
  month_end_balance: number | null;
  positions: number;
}

export function computeAttributeScore(
  buybox: LenderBuybox,
  merchant: AttributeInput,
): SubScoreResult {
  let score = 50; // base

  const hasAnyData = [
    merchant.monthly_revenue,
    merchant.owner_fico,
    merchant.nsf_count_30d,
    merchant.avg_daily_balance,
  ].some((v) => v != null);

  // Revenue alignment
  if (merchant.monthly_revenue != null && buybox.min_monthly_revenue != null) {
    const ratio = merchant.monthly_revenue / buybox.min_monthly_revenue;
    if (ratio >= 2) score += 20;
    else if (ratio >= 1.5) score += 15;
    else if (ratio >= 1.2) score += 10;
    else if (ratio >= 1) score += 5;
  } else if (merchant.monthly_revenue != null) {
    score += Math.min(15, Math.floor(merchant.monthly_revenue / 10000));
  }

  // FICO alignment
  if (merchant.owner_fico != null) {
    if (merchant.owner_fico >= 700) score += 15;
    else if (merchant.owner_fico >= 650) score += 10;
    else if (merchant.owner_fico >= 600) score += 5;
    else if (merchant.owner_fico < 550) score -= 10;
  }

  // NSF penalty
  if (merchant.nsf_count_30d != null) {
    if (merchant.nsf_count_30d === 0) score += 5;
    else if (merchant.nsf_count_30d <= 2) score -= 5;
    else if (merchant.nsf_count_30d <= 5) score -= 15;
    else score -= 25;
  }

  // Position penalty
  if (merchant.positions >= 3) score -= 15;
  else if (merchant.positions === 2) score -= 5;

  // ADB bonus
  if (merchant.avg_daily_balance != null) {
    if (merchant.avg_daily_balance >= 50000) score += 10;
    else if (merchant.avg_daily_balance >= 20000) score += 5;
    else if (merchant.avg_daily_balance < 5000) score -= 10;
  }

  // Month-end balance alignment
  if (merchant.month_end_balance != null && buybox.min_month_end_balance != null) {
    if (merchant.month_end_balance >= buybox.min_month_end_balance * 2) score += 10;
    else if (merchant.month_end_balance >= buybox.min_month_end_balance) score += 5;
    else score -= 10;
  }

  // NSF alignment with lender threshold
  if (merchant.nsf_count_30d != null && buybox.max_nsf_30_day != null) {
    if (merchant.nsf_count_30d === 0) score += 5;
    else if (merchant.nsf_count_30d <= buybox.max_nsf_30_day * 0.5) score += 3;
  }

  return { score: Math.max(0, Math.min(100, score)), isFallback: !hasAnyData };
}
