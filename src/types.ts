/**
 * Self-contained type definitions for the Lender Scoring Engine.
 *
 * Extracted from YieldStream's client.ts and db.ts — stripped of
 * infrastructure concerns (Supabase RLS, org scoping, submission
 * workflow fields) to isolate the scoring domain model.
 */

// ── Lender Buy-Box Configuration ────────────────────────────────────────────

export interface LenderBuybox {
  id: string;
  lender_name: string;
  product_type: string;
  is_active: boolean;
  min_fico: number | null;
  min_monthly_revenue: number | null;
  max_positions: number | null;
  restricted_states: string[];
  restricted_industries: string[];
  preferred_terms_months: number | null;
  // Buy-box enhancements
  max_nsf_30_day: number | null;
  max_nsf_90_day: number | null;
  min_month_end_balance: number | null;
  commission_points: number | null;
}

// ── Merchant Profile ────────────────────────────────────────────────────────

export interface MerchantProfile {
  id: string;
  business_name: string;
  state: string | null;
  industry: string | null;
  monthly_revenue: number | null;
  owner_fico: number | null;
  position_count: number;
  nsf_count_30d: number | null;
  nsf_count_90d: number | null;
  average_daily_balance: number | null;
  month_end_balance: number | null;
  requested_amount: number;
}

// ── Historical Deals ────────────────────────────────────────────────────────

export interface HistoricalDeal {
  id: string;
  lender_name: string | null;
  lender_id: string | null;
  merchant_id: string | null;
  business_name: string;
  outcome: "approved" | "declined";
  funded_amount: number | null;
  funded_date: string | null;
  monthly_revenue: number | null;
  owner_fico: number | null;
  nsf_count: number | null;
  factor_rate: number | null;
  position: number | null;
  decline_reason: string | null;
}

// ── Funding Outcomes (time-stamped, for time-decay weighting) ───────────────

export interface FundingOutcome {
  id: string;
  lender_id: string;
  lender_name: string;
  merchant_id: string;
  funded: boolean;
  decline_reason: string | null;
  decline_category: string | null;
  actual_factor_rate: number | null;
  actual_commission: number | null;
  days_to_offer: number | null;
  submitted_at: string | null;
  outcome_recorded_at: string;
}

// ── Score Adjustments (decline penalties) ────────────────────────────────────

export interface ScoreAdjustment {
  id: string;
  lender_name: string;
  adjustment_pct: number; // -50 to 0
  reason: string;
  decline_category: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

// ── Scoring Output ──────────────────────────────────────────────────────────

export interface SubScoreResult {
  score: number;
  isFallback: boolean;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface LenderScore {
  lenderBuybox: LenderBuybox;
  globalScore: number;
  relationshipScore: number;
  attributeScore: number;
  compositeScore: number;
  confidenceLevel: ConfidenceLevel;
  pullThroughRate: number;
  dealsSubmitted: number;
  dealsFunded: number;
  hasRelationshipBonus: boolean;
  disqualified: boolean;
  disqualifyReasons: string[];
  globalFallback: boolean;
  relationshipFallback: boolean;
  attributeFallback: boolean;
}

export interface MatchResult {
  scores: LenderScore[];
  dataCompleteness: DataCompleteness;
}

export interface DataCompleteness {
  attributeDataComplete: boolean;
  isoHasAnyHistory: boolean;
}

// ── Buy-Box Evaluation ──────────────────────────────────────────────────────

export type CriterionStatus = "pass" | "warn" | "fail";

export interface BuyboxCriterion {
  label: string;
  status: CriterionStatus;
  detail: string;
}

export interface BuyboxEvaluation {
  lender_name: string;
  criteria: BuyboxCriterion[];
  passCount: number;
  failCount: number;
  warnCount: number;
}

// ── AI Reasoning ────────────────────────────────────────────────────────────

export interface ReasoningResult {
  lender_buybox_id: string;
  reasoning_logic: string;
  recommended_positioning: string;
  estimated_factor_rate: number | null;
  estimated_commission: number | null;
  estimated_funding_days: number | null;
  risk_factors: string[];
  approval_blockers: string[];
}

// ── Scoring Tiers ───────────────────────────────────────────────────────────

export type ScoringTier = "strong" | "viable" | "weak";

export function classifyTier(compositeScore: number): ScoringTier {
  if (compositeScore >= 75) return "strong";
  if (compositeScore >= 55) return "viable";
  return "weak";
}
