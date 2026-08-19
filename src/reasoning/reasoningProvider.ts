/**
 * Reasoning Provider — Interface + Production Fallback
 *
 * In production, the primary implementation calls Gemini 2.0 Flash Lite
 * to generate natural-language underwriter reasoning for each lender match.
 * The Gemini prompt is documented in docs/gemini-prompt.md.
 *
 * When Gemini is unavailable (rate-limited, down, or no API key), production
 * falls back to FallbackReasoningProvider — the implementation below. This
 * is not a stub invented for the showcase; it's the real degradation path
 * that ships in production (generatePredictions.ts:156-167).
 *
 * The architectural point: the LLM sits outside the scoring path. Scores
 * are deterministic and computed first. Reasoning is layered on after,
 * and the system is fully functional without it.
 */

import type { ReasoningResult } from "../types.js";

// ── Interface ────────────────────────────────────────────────────────────────

export interface ReasoningInput {
  lenderName: string;
  lenderBuyboxId: string;
  compositeScore: number;
  attributeScore: number;
  relationshipScore: number;
  globalScore: number;
  pullThroughRate: number;
  dealsSubmitted: number;
  dealsFunded: number;
}

export interface MerchantContext {
  businessName: string;
  industry: string | null;
  state: string | null;
  monthlyRevenue: number | null;
  avgDailyBalance: number | null;
  nsfCount30d: number | null;
  ownerFico: number | null;
  stackingPositions: number;
  requestedAmount: number;
}

export interface DealHistoryEntry {
  lenderName: string;
  funded: boolean;
  factorRate: number | null;
  declineReason: string | null;
}

export interface ReasoningProvider {
  generateReasoning(
    merchant: MerchantContext,
    lenders: ReasoningInput[],
    history: DealHistoryEntry[],
  ): Promise<ReasoningResult[]>;
}

// ── Production Fallback Implementation ───────────────────────────────────────

/**
 * The real fallback that runs in production when Gemini is unavailable.
 * Extracted from generatePredictions.ts:156-167.
 *
 * Produces a rule-based summary stating the sub-scores in plain English.
 * No API key required, no external calls — pure computation.
 */
export class FallbackReasoningProvider implements ReasoningProvider {
  async generateReasoning(
    _merchant: MerchantContext,
    lenders: ReasoningInput[],
    _history: DealHistoryEntry[],
  ): Promise<ReasoningResult[]> {
    return lenders.map((l) => ({
      lender_buybox_id: l.lenderBuyboxId,
      reasoning_logic: `Composite score ${l.compositeScore} based on attribute match (${l.attributeScore}), relationship history (${l.relationshipScore}), and market signals (${l.globalScore}).`,
      recommended_positioning: "Submit with standard documentation package.",
      estimated_factor_rate: null,
      estimated_commission: null,
      estimated_funding_days: null,
      risk_factors: [],
      approval_blockers: [],
    }));
  }
}
