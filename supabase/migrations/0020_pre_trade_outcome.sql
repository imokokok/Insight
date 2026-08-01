-- 0020_pre_trade_outcome.sql
-- Adds the outcome (label) columns to pre_trade_checks so each audit row can be
-- paired with "what actually happened afterward". This is the bridge from a
-- feature-only flywheel to a labeled training set, and the first time we can
-- score the rule engine's precision/recall.
--
-- Populated by /api/cron/safety-outcome (safetyOutcomeService), which evaluates
-- each check ~6h later against hourly_price_snapshots: did the consensus price
-- move abnormally / did cross-oracle deviation spike in the window after the
-- check?

ALTER TABLE pre_trade_checks
  ADD COLUMN IF NOT EXISTS outcome_label BOOLEAN,
  ADD COLUMN IF NOT EXISTS outcome JSONB,
  ADD COLUMN IF NOT EXISTS outcome_evaluated_at TIMESTAMPTZ;

-- Find unlabeled, window-elapsed rows efficiently on each cron run.
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_outcome_pending
  ON pre_trade_checks(created_at)
  WHERE outcome_evaluated_at IS NULL;

COMMENT ON COLUMN pre_trade_checks.outcome_label IS
  'TRUE if an abnormal price move / cross-oracle deviation followed the check within the eval window (positive = the risk was real). FALSE = benign. NULL = not yet evaluated or no snapshot data available.';
COMMENT ON COLUMN pre_trade_checks.outcome IS
  '{ windowHours, evaluatedAt, baselinePrice, maxPriceMovePct, maxDeviationPct, label, evidence }. NULL until evaluated.';
COMMENT ON COLUMN pre_trade_checks.outcome_evaluated_at IS 'When the outcome label was computed.';
