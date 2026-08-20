# Scoring Formula — Full Specification

## Composite Score

```
composite = 0.15 × global + 0.50 × relationship + 0.35 × attribute
```

If relationship bonus applies: `composite = min(99, composite × 1.15)`

If decline adjustments exist: `composite = max(0, composite × (1 + adj_pct / 100))`

If disqualified: `composite = 0`

---

## Time-Decay Weight Function

Used by Layer A and Layer B to down-weight stale outcomes:

```
w(days) =
    1.0     if days ≤ 30
    0.4     if 31 ≤ days ≤ 90
    0.2     if 91 ≤ days ≤ 180
    0.05    if days > 180
```

---

## Layer A: Global Score (0–100)

Market-wide lender performance, anonymized across all ISOs.

```
weighted_funded = Σ (funded_i × w(days_ago_i))
weighted_total  = Σ w(days_ago_i)

weighted_approval_rate = weighted_funded / weighted_total

global_score = round(30 + weighted_approval_rate × 70)
```

Fallback (no data): `50`

---

## Layer B: Relationship Score (0–100)

This ISO's specific pull-through history.

### Time-weighted path (preferred — uses `funding_outcomes`)

```
weighted_funded = Σ (funded_i × w(days_ago_i))
weighted_total  = Σ w(days_ago_i)

pull_through = weighted_funded / weighted_total

base = round(pull_through × 80) + 20

volume_bonus =
    +10   if outcomes ≥ 10
    +5    if outcomes ≥ 5
    0     otherwise

score = min(100, max(0, base + volume_bonus))
```

### Count-based fallback (uses `historical_deals`)

```
pull_through = deals_funded / deals_submitted

base = round(pull_through × 80) + 20
volume_bonus = same as above (keyed on deals_submitted)

score = min(100, max(0, base + volume_bonus))
```

FK-matched deals use weight `1.0`; text-matched fallbacks use weight `0.7`.

Fallback (no deals): `30`

### Relationship Bonus

Applied to the composite (not the sub-score):

```
bonus = pull_through ≥ 0.6 AND funded_count ≥ 3
```

If bonus: `composite *= 1.15` (capped at 99)

### Merchant-Specific History Modifier

Applied to the relationship score before compositing:

```
modifier =
    +10   if this merchant was previously funded by this lender (pull_through ≥ 0.5)
    -15   if this merchant was previously declined by this lender (pull_through < 0.5)
    0     if no prior history with this specific merchant
```

---

## Layer C: Attribute Score (0–100)

Merchant financial fit against the lender's buy-box.

```
base = 50

Revenue alignment (vs buybox min):
    ratio ≥ 2.0  → +20
    ratio ≥ 1.5  → +15
    ratio ≥ 1.2  → +10
    ratio ≥ 1.0  → +5
    (no buybox min) → +min(15, floor(revenue / 10000))

FICO:
    ≥ 700  → +15
    ≥ 650  → +10
    ≥ 600  → +5
    < 550  → -10

NSF count (30d):
    0      → +5
    ≤ 2    → -5
    ≤ 5    → -15
    > 5    → -25

Positions:
    ≥ 3    → -15
    = 2    → -5

Average daily balance:
    ≥ $50K → +10
    ≥ $20K → +5
    < $5K  → -10

Month-end balance (vs buybox min):
    ≥ 2× min   → +10
    ≥ 1× min   → +5
    < min       → -10

NSF alignment with lender threshold:
    0 NSFs          → +5
    ≤ 50% of max    → +3

score = max(0, min(100, base + adjustments))
```

---

## Disqualification Gates

Any one failure → `composite = 0`, `disqualified = true`:

| Gate | Condition |
|------|-----------|
| State | merchant.state ∈ buybox.restricted_states |
| Industry | merchant.industry ∈ buybox.restricted_industries (case-insensitive) |
| Revenue | merchant.revenue < buybox.min_monthly_revenue |
| FICO | merchant.fico < buybox.min_fico |
| Positions | merchant.positions > buybox.max_positions |
| NSF | merchant.nsf_30d > buybox.max_nsf_30_day |

Null merchant fields skip the check. Null buybox fields skip the check.

---

## Confidence Classification

```
data_points = count of non-null(revenue, fico, adb, nsf_30d)

confidence =
    "high"    if data_points ≥ 3 AND deals_submitted ≥ 3
    "medium"  if data_points ≥ 2
    "low"     otherwise
```

---

## Decline Intelligence

Severity by category:

| Category | Adjustment |
|----------|------------|
| max_exposure | -10% |
| geographic_restriction | -10% |
| industry_restriction | -15% |
| stacking_limit | -15% |
| time_in_business | -15% |
| credit_quality | -20% |
| nsf_excessive | -20% |
| insufficient_revenue | -20% |
| other | -10% |

Stacking: multiple declines compound, capped at `-50%`.

Expiry: 30 days from last decline. After expiry, adjustment is inactive and no longer applied.

---

## Tier Classification

```
Strong:  composite ≥ 75
Viable:  composite ≥ 55
Weak:    composite < 55
```
