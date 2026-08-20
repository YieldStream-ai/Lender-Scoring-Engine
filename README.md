# Lender Scoring Engine

Deterministic, relationship-weighted lender scoring — the three-layer matching core extracted from [YieldStream](https://github.com/YieldStream-ai), with synthetic fixtures and the calibration gap documented.

```
npm install && npm test    # 100 tests, zero keys, zero mocks
npm run demo               # score 5 synthetic merchants against 8 lenders
```

## How it works

The engine ranks MCA (Merchant Cash Advance) lenders for a given deal using a weighted composite of three scoring layers, gated by a binary disqualification check:

```
                    ┌─────────────────────────┐
                    │   Disqualification Gate  │
                    │  (state, industry, FICO, │
                    │  revenue, positions, NSF)│
                    └────────────┬────────────┘
                                 │ pass
                    ┌────────────▼────────────┐
                    │    Three-Layer Scoring   │
                    │                         │
                    │  ┌───────┐ ┌──────────┐ │
                    │  │Global │ │Relation- │ │
                    │  │  15%  │ │ship  50% │ │
                    │  └───┬───┘ └────┬─────┘ │
                    │      │    ┌─────┘       │
                    │      │    │  ┌────────┐ │
                    │      │    │  │Attrib- │ │
                    │      │    │  │ute 35% │ │
                    │      │    │  └───┬────┘ │
                    │      └────┼──────┘      │
                    │           ▼             │
                    │    Composite Score      │
                    │    0.15A + 0.50B + 0.35C│
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Post-Processing       │
                    │  • Relationship bonus    │
                    │    ×1.15 if strong ISO   │
                    │  • Decline penalties     │
                    │    -10% to -50%          │
                    └────────────┬────────────┘
                                 │
               ┌─────────────────┼─────────────────┐
               ▼                 ▼                  ▼
          Strong ≥75        Viable ≥55          Weak <55
```

**Layer A — Global (15%):** Anonymized funding outcomes across all ISOs. Time-decay weighted so recent market signal dominates.

**Layer B — Relationship (50%):** This ISO's specific pull-through history with each lender. The moat — a broker who consistently closes with a lender gets ranked higher. FK-matched deals weighted 1.0, text-matched fallbacks 0.7.

**Layer C — Attribute (35%):** Pure merchant-vs-buybox financial fit. Revenue alignment, FICO, NSF count, positions, average daily balance, month-end balance.

**Decline Intelligence:** When a deal is declined, the system creates a temporary score penalty for that lender (-10% to -20% per category, stackable to -50%, 30-day expiry). The lender's score recovers naturally as penalties expire.

## Project structure

```
src/
├── scoring/
│   ├── lenderMatcher.ts         # Orchestrator — composes all layers
│   ├── attributeScore.ts        # Layer C: merchant vs buy-box fit
│   ├── relationshipScore.ts     # Layer B: time-weighted ISO history
│   ├── globalScore.ts           # Layer A: cross-org market signal
│   ├── disqualification.ts      # Pre-scoring binary gate
│   ├── confidence.ts            # Data completeness → high/medium/low
│   └── timeDecay.ts             # Shared decay utility
├── learning/
│   ├── declineIntelligence.ts   # Penalty engine (stack, cap, expire)
│   └── categorizeDecline.ts     # Free-text → structured category
├── evaluation/
│   └── scoreBuyboxFit.ts        # Per-criterion pass/fail/warn + action
├── reasoning/
│   └── reasoningProvider.ts     # Interface + production fallback
├── interfaces/
│   └── dataProvider.ts          # Port: abstract data access
└── types.ts                     # Self-contained type definitions

fixtures/                        # Synthetic data for 5 merchants × 8 lenders
tests/                           # 100 tests: unit, integration, scenarios
schema/                          # Reference DDL (production data model)
docs/                            # Architecture, formulas, calibration gap
examples/                        # Runnable demo script
```

## Documentation

- **[Architecture](docs/architecture.md)** — Three-layer deep dive with data flow
- **[Scoring Formula](docs/scoring-formula.md)** — Full mathematical specification
- **[Calibration Gap](docs/calibration-gap.md)** — What production has that this extract doesn't
- **[Decision Log](docs/decision-log.md)** — Key design decisions and rationale
- **[Gemini Prompt](docs/gemini-prompt.md)** — The production LLM prompt (documented, not wired)

## Calibration gap

This is a self-contained extract. The production system additionally includes:

- **Supabase** with row-level security and multi-tenant org isolation
- **Inngest** for event-driven async prediction generation and outcome recording
- **Gemini 2.0 Flash Lite** for natural-language underwriter reasoning (15 RPM rate-limited)
- **Prediction caching** with 24h TTL (5m for all-fallback scores)
- **Frontend visualization** — score distribution strip, tier badges, ghost bars

The scoring logic is identical. See [docs/calibration-gap.md](docs/calibration-gap.md) for the full breakdown.

## License

MIT
