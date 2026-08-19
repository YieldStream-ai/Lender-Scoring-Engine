/**
 * Hard Disqualification — Gate Checks
 *
 * Before scoring, each lender's buy-box is checked for absolute deal-breakers.
 * If any gate fails, the lender is disqualified (composite = 0) regardless
 * of how well the other layers score.
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
