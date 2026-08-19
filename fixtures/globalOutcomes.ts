/**
 * Synthetic Global Outcomes — Cross-Org Market Signal
 *
 * Anonymized funding outcomes from ALL orgs, used to compute Layer A
 * (global performance score — 15% of composite). These represent what
 * the market is seeing independent of any single ISO's relationship.
 *
 * Note: "Layer A" refers to a scoring layer, not the execution order.
 * Disqualification (buy-box gate checks) runs first as a binary
 * pass/fail filter before any of the three layers are computed.
 *
 * Designed so:
 *   Atlas Capital     — high global score (~85, strong market approval)
 *   Summit Funding    — moderate global score (~65)
 *   Meridian Finance  — very high global score (~92)
 *   Velocity Capital  — moderate global score (~70)
 *   Harbor Fund       — low global score (~45, high decline rate)
 *   Others            — no global data (fall back to baseline 50)
 */

import type { GlobalOutcome } from "../src/scoring/globalScore.js";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const globalOutcomes: GlobalOutcome[] = [
  // Atlas Capital — 10 outcomes, 8 funded across the market
  ...Array.from({ length: 8 }, (_, i) => ({
    lender_id: "lb-001",
    funded: true,
    outcome_recorded_at: daysAgo(5 + i * 18),
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    lender_id: "lb-001",
    funded: false,
    outcome_recorded_at: daysAgo(30 + i * 50),
  })),

  // Summit Funding — 8 outcomes, 4 funded
  ...Array.from({ length: 4 }, (_, i) => ({
    lender_id: "lb-002",
    funded: true,
    outcome_recorded_at: daysAgo(10 + i * 20),
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    lender_id: "lb-002",
    funded: false,
    outcome_recorded_at: daysAgo(15 + i * 25),
  })),

  // Meridian Finance — 6 outcomes, 6 funded (perfect)
  ...Array.from({ length: 6 }, (_, i) => ({
    lender_id: "lb-003",
    funded: true,
    outcome_recorded_at: daysAgo(3 + i * 25),
  })),

  // Velocity Capital — 7 outcomes, 5 funded
  ...Array.from({ length: 5 }, (_, i) => ({
    lender_id: "lb-004",
    funded: true,
    outcome_recorded_at: daysAgo(8 + i * 22),
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    lender_id: "lb-004",
    funded: false,
    outcome_recorded_at: daysAgo(20 + i * 40),
  })),

  // Harbor Fund — 8 outcomes, 2 funded (weak market signal)
  ...Array.from({ length: 2 }, (_, i) => ({
    lender_id: "lb-006",
    funded: true,
    outcome_recorded_at: daysAgo(40 + i * 50),
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    lender_id: "lb-006",
    funded: false,
    outcome_recorded_at: daysAgo(5 + i * 20),
  })),

  // Pinnacle, Crestline, Bridgeway — no global data (baseline 50)
];
