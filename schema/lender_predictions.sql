-- Lender predictions — stores computed scores + AI reasoning per opportunity × lender.
-- Production uses Supabase with RLS; this is the reference DDL stripped of org-scoping.

CREATE TABLE IF NOT EXISTS lender_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  opportunity_id UUID NOT NULL,
  lender_buybox_id UUID NOT NULL,

  -- Three-layer scores (0–100)
  global_score INTEGER,
  relationship_score INTEGER,
  attribute_score INTEGER,
  composite_score INTEGER,
  confidence_level VARCHAR(20),       -- high | medium | low

  -- AI-generated reasoning (Gemini or fallback)
  reasoning_logic TEXT,
  recommended_positioning TEXT,

  -- Predicted terms
  predicted_factor_rate DECIMAL(4,2),
  expected_commission DECIMAL(10,2),
  expected_funding_days DECIMAL(3,1),

  -- Relationship data
  pull_through_rate DECIMAL(3,2),
  deals_submitted INTEGER DEFAULT 0,
  deals_funded INTEGER DEFAULT 0,
  has_relationship_bonus BOOLEAN DEFAULT false,

  -- Risk analysis
  risk_factors TEXT[],
  approval_blockers TEXT[],

  -- Fallback tracking — true means sub-score used a default, not real data
  global_fallback BOOLEAN,
  relationship_fallback BOOLEAN,
  attribute_fallback BOOLEAN,

  -- Cache metadata
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  UNIQUE(opportunity_id, lender_buybox_id)
);

-- Fast lookup by opportunity, sorted by score for ranked display
CREATE INDEX idx_predictions_opportunity ON lender_predictions(opportunity_id);
CREATE INDEX idx_predictions_composite ON lender_predictions(opportunity_id, composite_score DESC);

-- Cache expiry cleanup
CREATE INDEX idx_predictions_expires ON lender_predictions(expires_at)
  WHERE expires_at IS NOT NULL;
