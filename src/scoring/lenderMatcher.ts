/**
 * Lender Matching Engine — Orchestrator
 *
 * Composes the three scoring layers into a single composite score per lender.
 * Every function in this module is pure: data in → scores out, no side effects.
 *
 * Execution order per lender:
 *   0. Disqualification gate — binary pass/fail (not a scoring layer)
 *   1. Layer A: Global score (15%)   — cross-org market signal
 *   2. Layer B: Relationship (50%)   — ISO-specific pull-through history
 *   3. Layer C: Attribute (35%)      — merchant vs buy-box financial fit
 *   4. Composite = 0.15×A + 0.50×B + 0.35×C
 *   5. Post-processing: relationship bonus (×1.15), decline adjustments
 *   6. If disqualified → composite forced to 0
 */

import type {
  LenderBuybox,
  MerchantProfile,
  HistoricalDeal,
  FundingOutcome,
  ScoreAdjustment,
  LenderScore,
  MatchResult,
  DataCompleteness,
} from "../types.js";
import { checkDisqualification } from "./disqualification.js";
import { computeAttributeScore } from "./attributeScore.js";
import { computeRelationshipScore, type OutcomeRecord } from "./relationshipScore.js";
import { computeGlobalScores, type GlobalOutcome } from "./globalScore.js";
import { classifyConfidence } from "./confidence.js";

// ── Constants ────────────────────────────────────────────────────────────────

const SCORING_WEIGHTS = {
  global: 0.15,
  relationship: 0.50,
  attribute: 0.35,
};

const RELATIONSHIP_MULTIPLIER = 1.15;
const MAX_SCORED_LENDERS = 50;

// FK-resolved historical deals are weighted higher than text-matched fallbacks
const FK_MATCH_WEIGHT = 1.0;
const TEXT_MATCH_WEIGHT = 0.7;

// ── Input Types ──────────────────────────────────────────────────────────────

export interface MatchLendersInput {
  merchant: MerchantProfile;
  buyboxes: LenderBuybox[];
  historicalDeals: HistoricalDeal[];
  fundingOutcomes: FundingOutcome[];
  globalOutcomes: GlobalOutcome[];
  scoreAdjustments: ScoreAdjustment[];
}

// ── Main Scoring Function ────────────────────────────────────────────────────

export function matchLenders(input: MatchLendersInput): MatchResult {
  const {
    merchant,
    buyboxes,
    historicalDeals,
    fundingOutcomes,
    globalOutcomes,
    scoreAdjustments,
  } = input;

  // Pre-compute global scores (Layer A) — keyed by lender_id
  const globalScoreMap = computeGlobalScores(globalOutcomes);

  // Build per-lender-name outcome records with time-decay data
  const now = Date.now();
  const outcomesPerLenderName = new Map<string, OutcomeRecord[]>();
  for (const row of fundingOutcomes) {
    const lenderName = row.lender_name?.toLowerCase();
    if (!lenderName) continue;
    const daysAgo = Math.floor(
      (now - new Date(row.outcome_recorded_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    const bucket = outcomesPerLenderName.get(lenderName) ?? [];
    bucket.push({ funded: row.funded, daysAgo });
    outcomesPerLenderName.set(lenderName, bucket);
  }

  // Build lender_name → global score lookup
  const lenderNameToGlobalScore = new Map<string, number>();
  for (const row of fundingOutcomes) {
    const name = row.lender_name?.toLowerCase();
    if (!name || lenderNameToGlobalScore.has(name)) continue;
    const gs = globalScoreMap.get(row.lender_id);
    if (gs) lenderNameToGlobalScore.set(name, gs.score);
  }

  // Build decline adjustment map (lender_name → adjustment_pct)
  const adjustmentMap = new Map<string, number>();
  for (const adj of scoreAdjustments) {
    if (!adj.is_active) continue;
    const name = adj.lender_name?.toLowerCase();
    if (name) {
      const existing = adjustmentMap.get(name) ?? 0;
      adjustmentMap.set(name, existing + adj.adjustment_pct);
    }
  }

  const merchantProfile = {
    state: merchant.state,
    industry: merchant.industry,
    monthly_revenue: merchant.monthly_revenue,
    nsf_count_30d: merchant.nsf_count_30d,
    owner_fico: merchant.owner_fico,
    positions: merchant.position_count,
  };

  const merchantAttr = {
    monthly_revenue: merchant.monthly_revenue,
    owner_fico: merchant.owner_fico,
    nsf_count_30d: merchant.nsf_count_30d,
    avg_daily_balance: merchant.average_daily_balance,
    month_end_balance: merchant.month_end_balance,
    positions: merchant.position_count,
  };

  // Score each lender
  const scores: LenderScore[] = buyboxes.map((buybox) => {
    const { disqualified, reasons } = checkDisqualification(buybox, merchantProfile);

    const attrResult = disqualified
      ? { score: 0, isFallback: true }
      : computeAttributeScore(buybox, merchantAttr);

    // Count historical deals — prefer FK match over text match
    const fkDeals = historicalDeals.filter(
      (d) => d.lender_id != null && d.lender_id === buybox.id,
    );
    const textDeals = historicalDeals.filter(
      (d) =>
        d.lender_id == null &&
        d.lender_name?.toLowerCase() === buybox.lender_name?.toLowerCase(),
    );

    // Raw counts for display
    const dealsSubmitted = fkDeals.length + textDeals.length;
    const dealsFunded =
      fkDeals.filter((d) => d.outcome === "approved").length +
      textDeals.filter((d) => d.outcome === "approved").length;

    // Weighted counts for scoring
    const weightedSubmitted =
      fkDeals.length * FK_MATCH_WEIGHT + textDeals.length * TEXT_MATCH_WEIGHT;
    const weightedFunded =
      fkDeals.filter((d) => d.outcome === "approved").length * FK_MATCH_WEIGHT +
      textDeals.filter((d) => d.outcome === "approved").length * TEXT_MATCH_WEIGHT;

    // Prefer funding_outcomes (real production data with time-decay)
    const lenderKey = buybox.lender_name?.toLowerCase();
    const lenderOutcomes = lenderKey ? outcomesPerLenderName.get(lenderKey) : undefined;

    const { score: relationshipScore, pullThroughRate, hasBonus, isFallback: relationshipFallback } =
      computeRelationshipScore(weightedSubmitted, weightedFunded, lenderOutcomes);

    // Merchant-specific history with this lender — bonus/penalty signal
    const allLenderDeals = fkDeals.concat(textDeals);
    const merchantDeals = allLenderDeals.filter(
      (d) =>
        d.merchant_id === merchant.id ||
        d.business_name?.toLowerCase() === merchant.business_name?.toLowerCase(),
    );
    const merchantFundedCount = merchantDeals.filter((d) => d.outcome === "approved").length;

    let merchantHistoryModifier = 0;
    if (merchantDeals.length > 0) {
      const merchantPullThrough = merchantFundedCount / merchantDeals.length;
      merchantHistoryModifier = merchantPullThrough >= 0.5 ? 10 : -15;
    }

    const adjustedRelationshipScore = Math.max(
      0,
      Math.min(100, relationshipScore + merchantHistoryModifier),
    );

    // Global Pool — Layer A
    const globalLookup = lenderKey ? lenderNameToGlobalScore.get(lenderKey) : undefined;
    const globalScore = globalLookup ?? 50;
    const globalFallback = globalLookup === undefined;

    let compositeScore = Math.round(
      SCORING_WEIGHTS.global * globalScore +
      SCORING_WEIGHTS.relationship * adjustedRelationshipScore +
      SCORING_WEIGHTS.attribute * attrResult.score,
    );

    if (hasBonus) {
      compositeScore = Math.min(99, Math.round(compositeScore * RELATIONSHIP_MULTIPLIER));
    }

    // Apply decline intelligence adjustments
    const declineAdj = lenderKey ? (adjustmentMap.get(lenderKey) ?? 0) : 0;
    if (declineAdj < 0) {
      compositeScore = Math.max(0, Math.round(compositeScore * (1 + declineAdj / 100)));
    }

    if (disqualified) compositeScore = 0;

    const confidenceLevel = classifyConfidence(
      {
        monthly_revenue: merchant.monthly_revenue,
        owner_fico: merchant.owner_fico,
        avg_daily_balance: merchant.average_daily_balance,
        nsf_count_30d: merchant.nsf_count_30d,
      },
      dealsSubmitted,
    );

    return {
      lenderBuybox: buybox,
      globalScore,
      relationshipScore,
      attributeScore: attrResult.score,
      compositeScore,
      confidenceLevel,
      pullThroughRate,
      dealsSubmitted,
      dealsFunded,
      hasRelationshipBonus: hasBonus,
      disqualified,
      disqualifyReasons: reasons,
      globalFallback,
      relationshipFallback,
      attributeFallback: attrResult.isFallback,
    };
  });

  // Sort by composite score descending, cap at MAX_SCORED_LENDERS
  const sorted = scores
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, MAX_SCORED_LENDERS);

  return {
    scores: sorted,
    dataCompleteness: {
      attributeDataComplete: [
        merchant.monthly_revenue,
        merchant.owner_fico,
        merchant.average_daily_balance,
        merchant.nsf_count_30d,
      ].some((v) => v != null),
      isoHasAnyHistory: historicalDeals.length > 0 || fundingOutcomes.length > 0,
    },
  };
}
