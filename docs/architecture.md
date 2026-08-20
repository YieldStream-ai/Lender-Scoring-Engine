# Architecture

## Execution Flow

For each lender in the ISO's portfolio, the engine runs this pipeline:

```
Input: Merchant profile + Lender buy-box + Historical data
                          │
                          ▼
              ┌───────────────────────┐
              │ 0. Disqualification   │  Binary pass/fail gate
              │    Gate               │  (not a scoring layer)
              │                       │
              │  • Restricted state?  │
              │  • Restricted industry│
              │  • Revenue < floor?   │
              │  • FICO < floor?      │
              │  • Positions > max?   │
              │  • NSFs > max?        │
              └─────────┬─────────────┘
                        │
              ┌─────────▼─────────────┐
              │ 1. Layer A: Global    │  15% weight
              │    Market Signal      │
              │                       │
              │  Cross-org outcomes   │
              │  Time-decay weighted  │
              │  Fallback: 50         │
              └─────────┬─────────────┘
                        │
              ┌─────────▼─────────────┐
              │ 2. Layer B: Relation- │  50% weight
              │    ship Score         │
              │                       │
              │  ISO pull-through     │
              │  FK weight: 1.0       │
              │  Text weight: 0.7     │
              │  Volume bonus: +5/+10 │
              │  Merchant history:    │
              │    +10 (funded) /     │
              │    -15 (declined)     │
              └─────────┬─────────────┘
                        │
              ┌─────────▼─────────────┐
              │ 3. Layer C: Attribute │  35% weight
              │    Match Score        │
              │                       │
              │  Revenue alignment    │
              │  FICO alignment       │
              │  NSF penalty/bonus    │
              │  Position penalty     │
              │  ADB bonus/penalty    │
              │  Month-end balance    │
              │  NSF vs lender max    │
              └─────────┬─────────────┘
                        │
              ┌─────────▼─────────────┐
              │ 4. Composite          │
              │    0.15A + 0.50B      │
              │          + 0.35C      │
              └─────────┬─────────────┘
                        │
              ┌─────────▼─────────────┐
              │ 5. Post-Processing    │
              │                       │
              │  Relationship bonus   │
              │  ×1.15 if pull-through│
              │  ≥60% AND ≥3 funded   │
              │                       │
              │  Decline adjustments  │
              │  -(10-50)% penalty    │
              │                       │
              │  If disqualified → 0  │
              └─────────┬─────────────┘
                        │
                        ▼
              Final composite score (0–99)
              Confidence: high/medium/low
              Tier: strong/viable/weak
```

## Dependency Inversion

The production system is coupled to Supabase (data), Inngest (events), and Gemini (reasoning). This extract inverts those into clean interfaces:

```
Production                          Showcase
──────────                          ────────
supabaseAdmin.from(...)     →       ScoringDataProvider interface
inngest.createFunction(...)  →       Pure function (processDecline)
generateLenderReasoning(...) →       ReasoningProvider interface
                                     + FallbackReasoningProvider (real prod fallback)
```

Every scoring function is **pure**: data in → scores out, no side effects, no database calls. The orchestrator (`lenderMatcher.ts`) takes pre-fetched data and returns sorted scores.

## Learning Loop

The decline intelligence system forms a closed feedback loop:

```
Deal submitted ──→ Outcome recorded
                        │
                   ┌────▼────┐
                   │ Funded? │
                   └────┬────┘
                   yes  │  no
                   ▼    │  ▼
                 (done)  │  categorizeDecline()
                        │       │
                        │  ┌────▼──────────┐
                        │  │ processDecline │
                        │  │               │
                        │  │ Severity:     │
                        │  │ -10 to -20%   │
                        │  │ Stacks to -50%│
                        │  │ 30-day expiry │
                        │  └────┬──────────┘
                        │       │
                        │  ┌────▼──────────┐
                        │  │ Score adj     │
                        │  │ stored        │
                        │  └────┬──────────┘
                        │       │
                        └───────┘
                                │
              Next scoring run picks up active adjustments
              and applies percentage penalty to composite
```

## File Dependency Graph

```
types.ts
  ├── scoring/timeDecay.ts
  ├── scoring/disqualification.ts
  ├── scoring/attributeScore.ts
  ├── scoring/relationshipScore.ts ──→ timeDecay.ts
  ├── scoring/globalScore.ts ────────→ timeDecay.ts
  ├── scoring/confidence.ts
  ├── scoring/lenderMatcher.ts ──────→ all scoring modules
  ├── learning/categorizeDecline.ts
  ├── learning/declineIntelligence.ts → categorizeDecline.ts
  ├── evaluation/scoreBuyboxFit.ts
  ├── reasoning/reasoningProvider.ts
  └── interfaces/dataProvider.ts ────→ globalScore.ts
```
