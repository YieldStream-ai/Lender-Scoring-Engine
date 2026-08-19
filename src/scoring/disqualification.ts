/**
 * Hard Disqualification — Pre-Scoring Gate
 *
 * This is NOT one of the three scoring layers (A/B/C). It's a binary
 * pass/fail gate that runs before any scoring. If a merchant fails any
 * gate, the lender is disqualified (composite forced to 0) and the
 * three layers are never consulted.
 *
 * Execution order:
 *   1. Disqualification gate (this module) — pass/fail
 *   2. Layer A: Global score (15%)
 *   3. Layer B: Relationship score (50%)
 *   4. Layer C: Attribute score (35%)
 *   5. Composite = weighted sum → decline adjustments → final score
 *
 * Gates: restricted state, restricted industry, revenue floor,
 * FICO floor, max positions, NSF tolerance.
 */

import type { LenderBuybox } from "../types.js";

export interface DisqualificationInput {
  state: string | null;
  industry: string | null;
  monthly_revenue: number | null;
  owner_fico: number | null;
  nsf_count_30d: number | null;
  positions: number;
}

export interface DisqualificationResult {
  disqualified: boolean;
  reasons: string[];
}

export function checkDisqualification(
  buybox: LenderBuybox,
  merchant: DisqualificationInput,
): DisqualificationResult {
  const reasons: string[] = [];

  if (
    merchant.state &&
    buybox.restricted_states?.length > 0 &&
    buybox.restricted_states.includes(merchant.state)
  ) {
    reasons.push(`State restriction: ${merchant.state}`);
  }

  if (
    merchant.industry &&
    buybox.restricted_industries?.length > 0 &&
    buybox.restricted_industries.some(
      (ri) => ri.toLowerCase() === merchant.industry!.toLowerCase(),
    )
  ) {
    reasons.push(`Industry restriction: ${merchant.industry}`);
  }

  if (
    buybox.min_monthly_revenue != null &&
    merchant.monthly_revenue != null &&
    merchant.monthly_revenue < buybox.min_monthly_revenue
  ) {
    reasons.push(
      `Revenue $${merchant.monthly_revenue.toLocaleString()} below minimum $${buybox.min_monthly_revenue.toLocaleString()}`,
    );
  }

  if (
    buybox.min_fico != null &&
    merchant.owner_fico != null &&
    merchant.owner_fico < buybox.min_fico
  ) {
    reasons.push(`FICO ${merchant.owner_fico} below minimum ${buybox.min_fico}`);
  }

  if (
    buybox.max_positions != null &&
    merchant.positions > buybox.max_positions
  ) {
    reasons.push(
      `${merchant.positions} positions exceeds max ${buybox.max_positions}`,
    );
  }

  if (
    buybox.max_nsf_30_day != null &&
    merchant.nsf_count_30d != null &&
    merchant.nsf_count_30d > buybox.max_nsf_30_day
  ) {
    reasons.push(
      `${merchant.nsf_count_30d} NSFs (30d) exceeds max ${buybox.max_nsf_30_day}`,
    );
  }

  return { disqualified: reasons.length > 0, reasons };
}
