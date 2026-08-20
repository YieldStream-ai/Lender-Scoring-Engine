-- Lender score adjustments — temporary penalties applied after deal declines.
-- Each adjustment expires after 30 days (configurable). Multiple declines
-- stack up to a -50% cap. The scoring engine checks active adjustments
-- when computing composite scores.

CREATE TABLE IF NOT EXISTS lender_score_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  lender_name TEXT NOT NULL,
  adjustment_pct DECIMAL(5,2) NOT NULL DEFAULT -20,  -- -50 to 0
  reason TEXT NOT NULL,
  decline_category VARCHAR(50),                       -- credit_quality, nsf_excessive, etc.
  funding_outcome_id UUID,                            -- links back to the decline event
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- Fast lookup: active adjustments for a specific org + lender
CREATE INDEX idx_score_adj_org_active
  ON lender_score_adjustments(org_id, lender_name)
  WHERE is_active = true;

-- Expiry cleanup (called by scheduled job or pg_cron)
CREATE INDEX idx_score_adj_expires
  ON lender_score_adjustments(expires_at)
  WHERE is_active = true;

-- Scheduled cleanup function: deactivate expired adjustments
CREATE OR REPLACE FUNCTION expire_score_adjustments()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE lender_score_adjustments
  SET is_active = false
  WHERE is_active = true AND expires_at < NOW();
$$;
