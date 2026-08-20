# Decision Log

Key design decisions in the scoring engine and the reasoning behind them.

---

## Relationship layer at 50% — why so heavy?

The relationship layer carries half the composite weight because in MCA, the broker-lender relationship is the primary differentiator. Two ISOs submitting the same merchant to the same lender will get different outcomes based on their track records. A broker with a 70% pull-through rate gets prioritized in underwriting queues and receives better terms. The data bears this out — relationship score is the strongest predictor of funding success in our production outcomes.

---

## Deterministic scoring, not ML

The scoring model is a rule-based weighted composite, not a trained model. This was deliberate:

1. **Explainability** — Brokers won't trust a black-box score. Every recommendation surfaces with a human-readable breakdown of why. The three sub-scores give the broker three levers they understand.
2. **Auditability** — When a score looks wrong, you can trace it to a specific rule and fix it. With ML, you retrain and hope.
3. **Cold start** — New ISOs have zero data. A trained model would have nothing to predict from. The rule-based model degrades gracefully with fallback scores and confidence levels.
4. **Regulatory** — MCA isn't regulated like traditional lending yet, but the industry is moving that way. A deterministic model with documented decision logic is easier to defend.

---

## LLM outside the scoring path

Gemini generates reasoning AFTER the scores are computed, not as part of scoring. This is load-bearing:

- Scores are deterministic and reproducible. The same inputs always produce the same composite.
- Reasoning is async (Inngest job) and best-effort. If Gemini is down, the system is fully functional — the fallback produces a rule-based summary.
- Rate limiting (15 RPM on free tier) means you can't call it for every lender. Only top 3 get reasoning.

The architectural test: you can run `npm test` with 100 passing tests and zero API keys. The LLM is a layer on top, not load-bearing infrastructure.

---

## Time-decay as a step function, not exponential

The decay function uses four discrete steps (1.0 → 0.4 → 0.2 → 0.05) rather than a smooth exponential curve. Reasons:

1. **Interpretability** — "Outcomes in the last 30 days count at full weight" is easier for a broker to reason about than "outcomes decay with a half-life of 45 days."
2. **Market structure** — MCA lender appetites change in discrete shifts (quarterly buy-box reviews, capital raises, portfolio rebalancing), not continuously.
3. **Simplicity** — Four `if` statements vs. `Math.exp(-lambda * days)`. The precision difference doesn't matter when the data is noisy to begin with.

---

## FK match weight 1.0 vs text match weight 0.7

When scoring historical deals, FK-resolved matches (lender_id → lenders table) are weighted higher than text-matched fallbacks (lender_name string comparison). The 0.7 factor reflects name-resolution uncertainty — "Summit" could be "Summit Funding" or "Summit Capital" or a data entry error. The 30% discount is conservative enough to still use the data while acknowledging the ambiguity.

---

## Decline penalties expire, not accumulate forever

A lender who declined a deal 6 months ago may have changed their appetite since then. The 30-day expiry ensures the system forgives and re-tests. The -50% cap prevents a string of bad luck from permanently burying a lender. The stacking mechanism ensures that multiple recent declines carry appropriate weight.

---

## Disqualification as a gate, not a layer

Disqualification is a binary pass/fail check, not a fourth scoring layer. If a merchant's state is restricted, no amount of strong FICO or revenue alignment can compensate. Making it a gate rather than a negative score prevents the system from recommending lenders that will reject the deal on intake.
