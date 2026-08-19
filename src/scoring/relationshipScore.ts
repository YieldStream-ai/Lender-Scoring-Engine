/**
 * Layer B: Relationship Score (0–100)
 *
 * This ISO's specific pull-through history with each lender — the moat.
 * Two data paths, preferred in order:
 *
 *   1. funding_outcomes (production data with timestamps → time-decay)
 *   2. historical_deals (imported CSV data → simple count-based)
 *
 * FK-matched deals are weighted at 1.0; text-matched fallbacks at 0.7
 * to account for name-resolution uncertainty.
 *
 * Score formula:
 *   base = pull_through_rate × 80 + 20
 *   volume_bonus = +10 (≥10 deals) | +5 (≥5 deals)
 *   relationship_bonus = pull_through ≥ 60% AND ≥ 3 funded → +15% multiplier
 */

import { getTimeDecayWeight } from "./timeDecay.js";

export interface OutcomeRecord {
  funded: boolean;
  daysAgo: number;
}

export interface RelationshipResult {
  score: number;
  pullThroughRate: number;
  hasBonus: boolean;
  isFallback: boolean;
}

export function computeRelationshipScore(
  dealsSubmitted: number,
  dealsFunded: number,
  outcomes?: OutcomeRecord[],
): RelationshipResult {
  // Preferred path: time-weighted funding_outcomes
  if (outcomes && outcomes.length > 0) {
    let weightedFunded = 0;
    let weightedTotal = 0;

    for (const o of outcomes) {
      const w = getTimeDecayWeight(o.daysAgo);
      weightedTotal += w;
      if (o.funded) weightedFunded += w;
    }

    const pullThroughRate = weightedTotal > 0 ? weightedFunded / weightedTotal : 0;
    let score = Math.round(pullThroughRate * 80) + 20;

    // Volume bonus
    if (outcomes.length >= 10) score = Math.min(100, score + 10);
    else if (outcomes.length >= 5) score = Math.min(100, score + 5);

    const hasBonus = pullThroughRate >= 0.6 && outcomes.filter((o) => o.funded).length >= 3;

    return {
      score: Math.max(0, Math.min(100, score)),
      pullThroughRate,
      hasBonus,
      isFallback: false,
    };
  }

  // Fallback: simple count-based scoring (historical_deals only)
  if (dealsSubmitted === 0) {
    return { score: 30, pullThroughRate: 0, hasBonus: false, isFallback: true };
  }

  const pullThroughRate = dealsFunded / dealsSubmitted;
  let score = Math.round(pullThroughRate * 80) + 20;

  if (dealsSubmitted >= 10) score = Math.min(100, score + 10);
  else if (dealsSubmitted >= 5) score = Math.min(100, score + 5);

  const hasBonus = pullThroughRate >= 0.6 && dealsFunded >= 3;

  return {
    score: Math.max(0, Math.min(100, score)),
    pullThroughRate,
    hasBonus,
    isFallback: false,
  };
}
