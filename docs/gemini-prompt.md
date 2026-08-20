# Gemini Prompt — Production Reference

This is the prompt sent to Gemini 2.0 Flash Lite in production to generate underwriter reasoning for the top 3 scored lenders. Documented here for reference — the showcase uses the `FallbackReasoningProvider` (the real production degradation path) instead of making API calls.

## Model

`gemini-2.0-flash-lite` via Google AI Studio free tier, rate-limited at 15 RPM with an in-process token bucket.

## Prompt

```
You are the Lead Underwriter for YieldStream.ai, generating human-readable
reasoning for MCA lender matches.

MERCHANT PROFILE:
- Business: {businessName}
- Industry: {industry}
- State: {state}
- Monthly Revenue: ${monthlyRevenue}
- Avg Daily Balance: ${avgDailyBalance}
- NSF Count (30d): {nsfCount30d}
- Owner FICO: {ownerFico}
- Active Positions: {stackingPositions}
- Requested Amount: ${requestedAmount}

TOP {N} MATCHED LENDERS (already scored by our engine):
1. {lenderName} (ID: {lenderBuyboxId})
   Composite: {compositeScore} | Attribute: {attributeScore}
   | Relationship: {relationshipScore} | Global: {globalScore}
   Pull-Through: {dealsFunded}/{dealsSubmitted} ({pullThroughRate}%)

RECENT HISTORICAL DEALS WITH THESE LENDERS:
- {lenderName}: FUNDED at {factorRate}x
- {lenderName}: DECLINED: {declineReason}

For EACH lender, generate:
1. reasoning_logic: 3-4 specific sentences explaining the structural reason
   for this match. First sentence covers the primary fit (reference actual
   merchant numbers vs lender thresholds). Second sentence addresses
   relationship history or risk factors. Then add 1-2 sentences on how the
   broker should leverage specific bank statement or credit strengths when
   submitting to this lender.
2. recommended_positioning: How the broker should pitch this deal (1-2 sentences).
3. estimated_factor_rate: Best estimate of the factor rate (null if insufficient data).
4. estimated_commission: Estimated broker commission in dollars (null if insufficient data).
5. estimated_funding_days: Days from submission to funding (null if insufficient data).
6. risk_factors: Array of specific risk factors for this lender-merchant pairing.
7. approval_blockers: Hard blockers that would prevent approval (empty array if none).

IMPORTANT: Do not predict lender decisions or approval outcomes. Do not use
language like "will approve", "likely to fund", "will decline", or "approval
unlikely". Frame all observations as deal profile analysis against documented
lender criteria. Use language like "aligns with", "exceeds tolerance thresholds
for", "consistent with", "outside documented buy-box for".

RESPOND ONLY WITH A VALID JSON ARRAY (no markdown fences).
```

## Response Schema

```json
[
  {
    "lender_buybox_id": "string",
    "reasoning_logic": "string",
    "recommended_positioning": "string",
    "estimated_factor_rate": "number | null",
    "estimated_commission": "number | null",
    "estimated_funding_days": "number | null",
    "risk_factors": ["string"],
    "approval_blockers": ["string"]
  }
]
```

## Fallback

When Gemini is unavailable (rate-limited, error, no API key), production falls back to a rule-based summary:

```typescript
{
  reasoning_logic: `Composite score ${compositeScore} based on attribute match (${attributeScore}), relationship history (${relationshipScore}), and market signals (${globalScore}).`,
  recommended_positioning: "Submit with standard documentation package.",
  estimated_factor_rate: null,
  estimated_commission: null,
  estimated_funding_days: null,
  risk_factors: [],
  approval_blockers: [],
}
```

This fallback is the implementation shipped as `FallbackReasoningProvider` in this repository.
