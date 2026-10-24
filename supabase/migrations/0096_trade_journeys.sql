-- Migration 0096: paid pre-trade → execution journey ledger
--
-- A paid oracle check is not evidence that a trade occurred. This ledger
-- records lifecycle states explicitly; silence remains unknown, never a
-- synthetic NOT_EXECUTED conclusion.

BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.trade_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  request_id text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('pre_trade', 'swap_intent')),
  source text NOT NULL CHECK (source IN ('rest', 'mcp', 'sdk')),
  action text NOT NULL CHECK (action IN ('swap', 'borrow', 'lend', 'liquidate', 'repay')),
  source_asset text NOT NULL,
  destination_asset text,
  subject_chain_id integer NOT NULL,
  settlement_chain_id integer,
  declared_notional_usd numeric(20, 2) NOT NULL CHECK (declared_notional_usd > 0),
  venue_claim text,
  router_claim text,

  source_pre_trade_uid text,
  destination_pre_trade_uid text,
  valid_until timestamptz,
  execution_state text NOT NULL DEFAULT 'check_issued'
    CHECK (execution_state IN ('check_issued', 'receipt_claiming', 'receipt_issued', 'not_executed_reported', 'expired_unknown')),
  outcome_reason text,
  outcome_reported_at timestamptz,

  receipt_credit_state text NOT NULL DEFAULT 'not_available'
    CHECK (receipt_credit_state IN ('not_available', 'pending_settlement', 'available', 'claiming', 'consumed', 'void')),
  receipt_uid text,
  payment_request_id text,
  payer text,
  payment_network text,
  payment_tx_hash text,
  outcome_token_hash text NOT NULL,

  CHECK (kind <> 'swap_intent' OR destination_asset IS NOT NULL),
  CHECK (kind = 'swap_intent' OR destination_pre_trade_uid IS NULL)
);

CREATE INDEX IF NOT EXISTS trade_journeys_created_at_idx
  ON public.trade_journeys (created_at DESC);
CREATE INDEX IF NOT EXISTS trade_journeys_execution_state_idx
  ON public.trade_journeys (execution_state, created_at DESC);
CREATE INDEX IF NOT EXISTS trade_journeys_payer_idx
  ON public.trade_journeys (payer, created_at DESC) WHERE payer IS NOT NULL;
CREATE INDEX IF NOT EXISTS trade_journeys_source_pre_trade_uid_idx
  ON public.trade_journeys (source_pre_trade_uid) WHERE source_pre_trade_uid IS NOT NULL;

ALTER TABLE public.pre_trade_checks
  ADD COLUMN IF NOT EXISTS journey_id uuid REFERENCES public.trade_journeys(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS pre_trade_checks_journey_id_idx
  ON public.pre_trade_checks (journey_id) WHERE journey_id IS NOT NULL;

ALTER TABLE public.execution_receipts
  ADD COLUMN IF NOT EXISTS journey_id uuid REFERENCES public.trade_journeys(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS execution_receipts_journey_id_key
  ON public.execution_receipts (journey_id) WHERE journey_id IS NOT NULL;

ALTER TABLE public.trade_journeys ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.trade_journeys IS
  'Service-role-only lifecycle ledger from paid pre-trade through a voluntary non-execution report or transaction-backed Execution Receipt. Silence is never an execution outcome.';
COMMENT ON COLUMN public.trade_journeys.outcome_token_hash IS
  'SHA-256 of caller-held capability for voluntary lifecycle updates; raw token is never persisted.';
COMMENT ON COLUMN public.trade_journeys.receipt_credit_state IS
  'A Swap Intent unlocks one receipt only after its originating x402 payment settles.';

COMMIT;
