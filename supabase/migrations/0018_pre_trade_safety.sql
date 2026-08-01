-- 0018_pre_trade_safety.sql
-- Pre-trade oracle safety check audit log.
--
-- Each call to the pre_trade_safety_check MCP tool / REST endpoint is recorded
-- here so we can (1) build a data flywheel for future ML-based manipulation
-- detection, (2) report on how many dangerous trades Insight has blocked, and
-- (3) let users audit their own check history.
--
-- The rule thresholds themselves are constants in preTradeSafetyService.ts for
-- Phase 1 (no DB round-trip on the hot path). A `safety_rules` table can be
-- added later when dynamic tuning is needed.

CREATE TABLE IF NOT EXISTS pre_trade_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Request parameters
  asset TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('swap','borrow','lend','liquidate','repay')),
  trade_amount_usd NUMERIC(20,2) NOT NULL,
  target_providers TEXT[],
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,

  -- Verdict
  verdict TEXT NOT NULL CHECK (verdict IN ('PASS','CAUTION','DANGER','BLOCK')),
  consensus_price NUMERIC(24,8),
  max_deviation_pct NUMERIC(10,4),
  manipulation_risk_score NUMERIC(5,4),
  stale_data_risk BOOLEAN,
  cross_provider_agreement NUMERIC(5,4),
  recommended_max_position_usd NUMERIC(20,2),
  participant_count INTEGER,

  -- Detailed context (JSONB for flexible analytics / future ML features)
  provider_prices JSONB,
  provider_deviations JSONB,
  provider_freshness JSONB,
  depeg_warnings JSONB,
  warnings TEXT[],
  contributing_factors JSONB,

  -- Performance
  latency_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_created_at
  ON pre_trade_checks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_verdict
  ON pre_trade_checks(verdict) WHERE verdict IN ('DANGER','BLOCK');
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_api_key
  ON pre_trade_checks(api_key_id) WHERE api_key_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_asset_chain
  ON pre_trade_checks(asset, chain_id, created_at DESC);

-- RLS: users may view only checks made with their own API keys.
-- Writes are performed server-side via the service-role client (bypasses RLS),
-- so no INSERT policy is needed for end users.
ALTER TABLE pre_trade_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_pre_trade_checks" ON pre_trade_checks
  FOR SELECT USING (
    api_key_id IS NULL
    OR api_key_id IN (
      SELECT id FROM api_keys WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE pre_trade_checks IS
  'Audit log for pre-trade oracle safety checks. Written fire-and-forget by preTradeSafetyService.';
