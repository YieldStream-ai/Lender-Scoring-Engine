/**
 * Scoring Data Provider — Port Interface
 *
 * Abstracts all data access behind a single interface. In production
 * this is backed by Supabase with RLS and org-scoped queries. In the
 * showcase it's backed by in-memory synthetic fixtures.
 *
 * This is the seam that makes the scoring engine testable without
 * infrastructure — every pure function takes data as arguments,
 * and this interface defines how that data is fetched.
 */

import type {
  MerchantProfile,
  LenderBuybox,
  HistoricalDeal,
  FundingOutcome,
  ScoreAdjustment,
} from "../types.js";
import type { GlobalOutcome } from "../scoring/globalScore.js";

export interface ScoringDataProvider {
  getMerchant(merchantId: string): Promise<MerchantProfile | null>;
  getActiveBuyboxes(): Promise<LenderBuybox[]>;
  getHistoricalDeals(): Promise<HistoricalDeal[]>;
  getFundingOutcomes(): Promise<FundingOutcome[]>;
  getGlobalOutcomes(): Promise<GlobalOutcome[]>;
  getActiveAdjustments(): Promise<ScoreAdjustment[]>;
}
