/**
 * Buy-Box Fit Evaluation — Per-Criterion Pass/Fail/Warn
 *
 * While the scoring engine produces a composite number, the evaluation
 * layer produces a human-readable checklist: which criteria passed,
 * which failed, and which are borderline. This is what the broker
 * sees next to each lender recommendation.
 *
 * Also includes a recommended action engine that combines the composite
 * score with the evaluation to produce submit_now / submit_with_note /
 * hold / do_not_submit guidance.
 */

import type { LenderBuybox } from "../types.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type CriterionResult = "pass" | "fail" | "warn" | "unknown";

export interface BuyboxCriterion {
  label: string;
  result: CriterionResult;
  detail: string;
}

export interface BuyboxEvaluation {
  lenderId: string;
  criteria: BuyboxCriterion[];
  passCount: number;
  failCount: number;
  warnCount: number;
}

export interface DealSnapshot {
  ownerFico: number | null;
  timeInBusinessMonths: number | null;
  avgMonthlyRevenue: number | null;
  industry: string | null;
  state: string | null;
  maxPosition: number;
  nsfCount30d: number | null;
  minMonthEndBalance: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// ── Buy-Box Evaluation ───────────────────────────────────────────────────────

export function scoreBuyboxFit(
  deal: DealSnapshot,
  buybox: LenderBuybox,
): BuyboxEvaluation {
  const criteria: BuyboxCriterion[] = [];

  // 1. Min FICO
  if (buybox.min_fico != null && deal.ownerFico != null) {
    const diff = deal.ownerFico - buybox.min_fico;
    if (diff >= 20) {
      criteria.push({ label: "Min FICO", result: "pass", detail: `${deal.ownerFico} vs min ${buybox.min_fico}` });
    } else if (diff >= 0) {
      criteria.push({ label: "Min FICO", result: "warn", detail: `${deal.ownerFico} near min ${buybox.min_fico}` });
    } else {
      criteria.push({ label: "Min FICO", result: "fail", detail: `${deal.ownerFico} below min ${buybox.min_fico}` });
    }
  } else if (buybox.min_fico != null) {
    criteria.push({ label: "Min FICO", result: "unknown", detail: "FICO not available" });
  }

  // 2. Min Monthly Revenue
  if (buybox.min_monthly_revenue != null && deal.avgMonthlyRevenue != null) {
    const ratio = deal.avgMonthlyRevenue / buybox.min_monthly_revenue;
    if (ratio >= 1.1) {
      criteria.push({ label: "Min Revenue", result: "pass", detail: `${fmt$(deal.avgMonthlyRevenue)} vs min ${fmt$(buybox.min_monthly_revenue)}` });
    } else if (ratio >= 1.0) {
      criteria.push({ label: "Min Revenue", result: "warn", detail: `${fmt$(deal.avgMonthlyRevenue)} near min ${fmt$(buybox.min_monthly_revenue)}` });
    } else {
      criteria.push({ label: "Min Revenue", result: "fail", detail: `${fmt$(deal.avgMonthlyRevenue)} below min ${fmt$(buybox.min_monthly_revenue)}` });
    }
  } else if (buybox.min_monthly_revenue != null) {
    criteria.push({ label: "Min Revenue", result: "unknown", detail: "Revenue not available" });
  }

  // 3. Position Eligibility
  if (buybox.max_positions != null) {
    if (deal.maxPosition > buybox.max_positions) {
      criteria.push({ label: "Position", result: "fail", detail: `${deal.maxPosition} exceeds max ${buybox.max_positions}` });
    } else if (deal.maxPosition === buybox.max_positions) {
      criteria.push({ label: "Position", result: "warn", detail: `${deal.maxPosition} at max ${buybox.max_positions}` });
    } else {
      criteria.push({ label: "Position", result: "pass", detail: `${deal.maxPosition} within max ${buybox.max_positions}` });
    }
  }

  // 4. State Allowed
  if (buybox.restricted_states?.length > 0 && deal.state) {
    const restricted = buybox.restricted_states.some(
      (s) => s.toLowerCase() === deal.state!.toLowerCase(),
    );
    if (restricted) {
      criteria.push({ label: "State", result: "fail", detail: `${deal.state} restricted` });
    } else {
      criteria.push({ label: "State", result: "pass", detail: `${deal.state} allowed` });
    }
  }

  // 5. Industry Allowed
  if (buybox.restricted_industries?.length > 0 && deal.industry) {
    const restricted = buybox.restricted_industries.some(
      (i) => i.toLowerCase() === deal.industry!.toLowerCase(),
    );
    if (restricted) {
      criteria.push({ label: "Industry", result: "fail", detail: `${deal.industry} restricted` });
    } else {
      criteria.push({ label: "Industry", result: "pass", detail: `${deal.industry} allowed` });
    }
  }

  // 6. NSF Tolerance (30d)
  if (buybox.max_nsf_30_day != null && deal.nsfCount30d != null) {
    if (deal.nsfCount30d > buybox.max_nsf_30_day) {
      criteria.push({ label: "NSF (30d)", result: "fail", detail: `${deal.nsfCount30d} exceeds max ${buybox.max_nsf_30_day}` });
    } else if (deal.nsfCount30d === buybox.max_nsf_30_day) {
      criteria.push({ label: "NSF (30d)", result: "warn", detail: `${deal.nsfCount30d} at max ${buybox.max_nsf_30_day}` });
    } else {
      criteria.push({ label: "NSF (30d)", result: "pass", detail: `${deal.nsfCount30d} within max ${buybox.max_nsf_30_day}` });
    }
  }

  // 7. Min Month-End Balance
  if (buybox.min_month_end_balance != null && deal.minMonthEndBalance != null) {
    if (deal.minMonthEndBalance >= buybox.min_month_end_balance) {
      criteria.push({ label: "Month-End Bal", result: "pass", detail: `${fmt$(deal.minMonthEndBalance)} vs min ${fmt$(buybox.min_month_end_balance)}` });
    } else {
      criteria.push({ label: "Month-End Bal", result: "fail", detail: `${fmt$(deal.minMonthEndBalance)} below min ${fmt$(buybox.min_month_end_balance)}` });
    }
  }

  const passCount = criteria.filter((c) => c.result === "pass").length;
  const failCount = criteria.filter((c) => c.result === "fail").length;
  const warnCount = criteria.filter((c) => c.result === "warn").length;

  return { lenderId: buybox.id, criteria, passCount, failCount, warnCount };
}

// ── Recommended Action ───────────────────────────────────────────────────────

export type ActionLevel = "submit_now" | "submit_with_note" | "hold" | "do_not_submit";

export interface RecommendedAction {
  level: ActionLevel;
  label: string;
}

export function getRecommendedAction(
  compositeScore: number,
  evaluation: BuyboxEvaluation,
): RecommendedAction {
  if (evaluation.failCount > 0) {
    return { level: "do_not_submit", label: "Do not submit" };
  }
  if (compositeScore >= 80) {
    return { level: "submit_now", label: "Submit now" };
  }
  if (compositeScore >= 60) {
    return { level: "submit_with_note", label: "Submit with note" };
  }
  if (compositeScore >= 40 && evaluation.warnCount > 0) {
    return { level: "hold", label: "Hold — borderline" };
  }
  return { level: "do_not_submit", label: "Do not submit" };
}
