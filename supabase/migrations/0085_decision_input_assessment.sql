-- Persist the optional, unsigned operation-input assessment alongside the
-- oracle safety check. The assessment is audit context, not part of the
-- EIP-712 oracle attestation or the existing verdict.

ALTER TABLE public.pre_trade_checks
  ADD COLUMN IF NOT EXISTS decision_input_assessment JSONB,
  ADD COLUMN IF NOT EXISTS decision_input_gate JSONB;

COMMENT ON COLUMN public.pre_trade_checks.decision_input_assessment IS
  'Unsigned evidence sufficiency assessment for caller-supplied decision prices, venue quotes, and (on the agent execution path) the proposed route quote. It does not alter the oracle verdict or extend its EIP-712 attestation. Source and destination rows are traceable from execution_receipts through their attestation_uid values.';

COMMENT ON COLUMN public.pre_trade_checks.decision_input_gate IS
  'Unsigned combined operation-input gate outcome and route-quote comparison, copied to both source and destination pre-trade audit rows. Execution receipts reference those rows through pre_trade_uid and destination_pre_trade_uid.';

CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_decision_input_status
  ON public.pre_trade_checks ((decision_input_assessment ->> 'status'), created_at DESC)
  WHERE decision_input_assessment IS NOT NULL;
