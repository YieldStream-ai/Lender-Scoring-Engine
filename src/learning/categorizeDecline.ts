/**
 * Decline Categorization — Heuristic Classifier
 *
 * When a lender declines a deal, the decline reason is free-text.
 * This classifier maps it to a structured category so the penalty
 * engine can apply the right severity.
 *
 * Categories (from least to most severe):
 *   max_exposure / geographic_restriction  → -10%  (not the lender's fault)
 *   industry_restriction / stacking_limit  → -15%
 *   time_in_business                       → -15%
 *   credit_quality / nsf_excessive /
 *     insufficient_revenue                 → -20%
 *   other/unknown                          → -10%
 */

export type DeclineCategory =
  | "max_exposure"
  | "geographic_restriction"
  | "industry_restriction"
  | "stacking_limit"
  | "credit_quality"
  | "nsf_excessive"
  | "insufficient_revenue"
  | "time_in_business"
  | "other";

export function categorizeDecline(reason: string): DeclineCategory {
  const lower = reason.toLowerCase();

  if (lower.includes("exposure") || lower.includes("capacity") || lower.includes("full"))
    return "max_exposure";
  if (lower.includes("industry") || lower.includes("naics") || lower.includes("sector"))
    return "industry_restriction";
  if (lower.includes("credit") || lower.includes("fico") || lower.includes("score"))
    return "credit_quality";
  if (lower.includes("stack") || lower.includes("position") || lower.includes("existing"))
    return "stacking_limit";
  if (lower.includes("state") || lower.includes("geographic") || lower.includes("location"))
    return "geographic_restriction";
  if (lower.includes("revenue") || lower.includes("income") || lower.includes("balance"))
    return "insufficient_revenue";
  if (lower.includes("nsf") || lower.includes("overdraft") || lower.includes("return"))
    return "nsf_excessive";
  if (lower.includes("time in business") || lower.includes("tib") || lower.includes("too new"))
    return "time_in_business";

  return "other";
}
