-- 0019_pre_trade_protocol_safety.sql
-- Adds lending-protocol safety context to the pre-trade audit log.
--
-- When a caller passes a protocolId, preTradeSafetyService computes a
-- position-free safety buffer from the protocol's own published risk params
-- (liquidation threshold + max LTV): the oracle deviation that would liquidate
-- a max-LTV position, and how much of that buffer the current cross-oracle
-- deviation already consumes. Storing this on every audit row lets the flywheel
-- capture the protocol dimension as a future ML feature (not just when the
-- rule triggers — the full context is recorded per check).

ALTER TABLE pre_trade_checks
  ADD COLUMN IF NOT EXISTS protocol_id TEXT,
  ADD COLUMN IF NOT EXISTS protocol_safety JSONB;

COMMENT ON COLUMN pre_trade_checks.protocol_id IS
  'Optional lending protocol id (e.g. aave-v3-ethereum) the caller asked to evaluate against. NULL when no protocol context was requested.';
COMMENT ON COLUMN pre_trade_checks.protocol_safety IS
  'Protocol safety context: { protocolId, protocolName, criticalDeviationPct, bufferConsumedPct, liquidationThreshold, maxLtv }. NULL when no protocol context.';
