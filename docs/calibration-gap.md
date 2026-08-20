# Calibration Gap

What the production system has that this self-contained extract does not.

The scoring logic is identical — the same functions, weights, thresholds, and decision paths. What differs is the infrastructure that surrounds it.

---

## Data Layer

**Production:** Supabase with row-level security (RLS). Every query is scoped to `org_id` via `get_my_org_id()`. Predictions are cached in `lender_predictions` with a UNIQUE constraint on `(opportunity_id, lender_buybox_id)` for upsert semantics. Lender names are resolved via FK joins through the `lenders` table.

**Showcase:** In-memory synthetic fixtures. The `ScoringDataProvider` interface defines the contract; fixtures implement it directly. No multi-tenancy, no persistence, no caching.

---

## Prediction Caching

**Production:** Predictions are cached with a 24-hour TTL. If all three sub-scores used fallback values (no real data behind any layer), TTL drops to 5 minutes — ensuring the system re-scores quickly once real data arrives. Cache check runs before scoring; cache hit returns immediately.

**Showcase:** Computes fresh on every call. The TTL logic is documented but not implemented — there's no persistence layer to cache into.

---

## AI Reasoning

**Production:** Top 3 non-disqualified lenders are sent to Gemini 2.0 Flash Lite via Google AI Studio (free tier, 15 RPM). The model receives the merchant profile, sub-scores, and deal history, then generates:
- `reasoning_logic` — plain-English explanation of the match
- `recommended_positioning` — how the broker should pitch the deal
- `estimated_factor_rate`, `estimated_commission`, `estimated_funding_days`
- `risk_factors[]`, `approval_blockers[]`

Rate-limited via an in-process token bucket. The full prompt is documented in [gemini-prompt.md](gemini-prompt.md).

**Showcase:** The `ReasoningProvider` interface defines the contract. The shipped implementation is `FallbackReasoningProvider` — the real production fallback that activates when Gemini is unavailable. It produces a rule-based summary stating the sub-scores in plain English. This is the actual degradation path, not a stub.

---

## Event-Driven Orchestration

**Production:** Three Inngest functions handle async workflows:
1. `generatePredictions` — orchestrates the scoring pipeline: fetch data → score all lenders → generate Gemini reasoning for top 3 → save to DB → audit log
2. `declineIntelligence` — triggered by `submission/outcome-recorded` when `funded=false`. Creates/stacks temporary score penalties.
3. `recordOutcome` — snapshots the merchant profile, prediction, and bank intelligence at the moment of outcome for future accuracy analysis.

**Showcase:** The scoring pipeline runs synchronously as a single function call. Decline intelligence is a pure function (`processDecline`). No event bus, no async orchestration, no audit logging.

---

## Global Pool Cross-Org Aggregation

**Production:** `computeGlobalScores()` queries `funding_outcomes` across ALL orgs (no org filter) from the last 180 days. Results are aggregated by `lender_id` with time-decay weighting. This represents the anonymized market signal — what ALL ISOs are seeing, not just yours.

**Showcase:** Uses a fixed `globalOutcomes` fixture array. The aggregation logic is identical, but the data doesn't come from real cross-org sources.

---

## FK vs Text Match Weighting

**Production:** Historical deals have a `resolution_status` field (`resolved` | `partial` | `pending` | `unresolved`). Only `resolved` and `partial` deals are used for scoring. FK-matched deals (`lender_id` set) are weighted at 1.0; text-matched fallbacks (`lender_id` null, matched by `lender_name`) are weighted at 0.7 to account for name-resolution uncertainty.

**Showcase:** Preserves both weights and the matching logic. Fixtures include both FK-matched and text-matched deals to exercise both paths.

---

## Merchant-Specific History Modifier

**Production:** For each lender, the system checks whether THIS specific merchant has been previously submitted. Uses FK match (`merchant_id`) with a text fallback (`business_name`). Prior funded → +10, prior declined → -15.

**Showcase:** Same logic, same modifiers. Fixtures include merchant-specific history for Coastal Bistro (funded by Meridian → +10) and Metro Auto (declined by Atlas → -15).

---

## Frontend Visualization

**Production:** React components display scoring results:
- `LenderList` — sorted lender cards with composite score, tier badge, sub-score breakdown
- `ScoreDistributionStrip` — analyzes the score distribution and surfaces insights:
  - "Only N lenders qualify" (if < 5 viable)
  - "Steep dropoff after rank X" (if > 15 point gap in top 10)
  - "Many similar lenders" (if top 10 range < 10 points)
- Per-lender buy-box checklist (pass/fail/warn for each criterion)
- Polling for AI reasoning (10s interval until Gemini reasoning arrives)

**Showcase:** Backend-only. The evaluation layer (`scoreBuyboxFit.ts`) produces the same pass/fail/warn data, but there are no React components to render it.

---

## Multi-Tenancy & Security

**Production:** All data is scoped to `org_id`. RLS policies enforce isolation — one ISO's lender relationships are never visible to another. The global pool intentionally breaks this isolation for anonymized market signal only.

**Showcase:** Single-tenant. No org scoping, no RLS, no auth.
