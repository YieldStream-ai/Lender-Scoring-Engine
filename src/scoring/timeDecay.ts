/**
 * Time-Decay Weighting
 *
 * Recent outcomes carry more signal than stale ones. The step function
 * reflects the MCA market's appetite volatility — a lender that was
 * aggressively funding 6 months ago may have tightened since.
 *
 * Weight schedule:
 *   ≤ 30 days: 1.0   |   31–90 days: 0.4   |   91–180 days: 0.2   |   >180 days: 0.05
 */

export function getTimeDecayWeight(daysAgo: number): number {
  if (daysAgo <= 30) return 1.0;
  if (daysAgo <= 90) return 0.4;
  if (daysAgo <= 180) return 0.2;
  return 0.05;
}
