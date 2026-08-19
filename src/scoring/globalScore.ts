/**
 * Layer A: Global Performance Score (0–100)
 *
 * Aggregates anonymized funding outcomes across ALL orgs to produce
 * a "market signal" score for each lender. A lender with a high
 * approval rate across the market is likely a safer bet, even for
 * an ISO with no prior relationship.
 *
 * Score formula:
 *   weighted_approval_rate = Σ(funded × weight) / Σ(weight)
 *   score = 30 + weighted_approval_rate × 70
 *
 * Baseline (no data) returns null — callers fall back to 50.
 */

import { getTimeDecayWeight } from "./timeDecay.js";

export interface GlobalOutcome {
  lender_id: string;
  funded: boolean;
  outcome_recorded_at: string;
}

export interface GlobalLenderScore {
  lenderId: string;
  score: number;
  totalOutcomes: number;
  fundedCount: number;
  weightedApprovalRate: number;
}

/**
 * Compute global scores for all lenders with outcome data.
 * Pure function — takes raw outcomes, returns a Map keyed by lender_id.
 */
export function computeGlobalScores(
  outcomes: GlobalOutcome[],
  now: number = Date.now(),
): Map<string, GlobalLenderScore> {
  const scoreMap = new Map<string, GlobalLenderScore>();

  if (outcomes.length === 0) return scoreMap;

  // Group by lender_id
  const lenderBuckets = new Map<string, { funded: boolean; daysAgo: number }[]>();

  for (const row of outcomes) {
    const daysAgo = Math.floor(
      (now - new Date(row.outcome_recorded_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    const bucket = lenderBuckets.get(row.lender_id) ?? [];
    bucket.push({ funded: row.funded, daysAgo });
    lenderBuckets.set(row.lender_id, bucket);
  }

  for (const [lenderId, records] of lenderBuckets) {
    let weightedFunded = 0;
    let weightedTotal = 0;

    for (const o of records) {
      const w = getTimeDecayWeight(o.daysAgo);
      weightedTotal += w;
      if (o.funded) weightedFunded += w;
    }

    const weightedApprovalRate = weightedTotal > 0 ? weightedFunded / weightedTotal : 0;

    // Scale to 0–100 with a base of 30 (even a lender with some data gets above 0)
    const score = Math.round(30 + weightedApprovalRate * 70);

    scoreMap.set(lenderId, {
      lenderId,
      score: Math.max(0, Math.min(100, score)),
      totalOutcomes: records.length,
      fundedCount: records.filter((o) => o.funded).length,
      weightedApprovalRate,
    });
  }

  return scoreMap;
}
