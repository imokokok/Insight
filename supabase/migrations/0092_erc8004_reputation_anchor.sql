-- ERC-8004 reputation anchoring queue (opt-in, M2).
--
-- Rows are written by the pre-trade route after a successful x402 settlement
-- when the paying agent opted in (reputationOptIn=1 + its own agentId), and
-- consumed by the daily erc8004-anchor GitHub Action
-- (scripts/anchor-erc8004-reputation.ts) which writes ERC-8004 feedback to the
-- Reputation Registry on BNB Chain mainnet. The queue deliberately carries no
-- trade details beyond what is already in the settled-payment audit trail:
-- verdict tag, attestation UID (opaque), payer, agentId.
--
-- The daily unique index caps feedback at one per payer+agentId+calendar day:
-- it bounds gas spend and prevents a chatty agent from inflating its own
-- feedback count.
--
-- RLS is enabled with no policies: only the service role (route enqueue +
-- anchor batch) may read or write.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.reputation_anchor_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE,
  payer text NOT NULL,
  agent_id bigint NOT NULL CHECK (agent_id > 0),
  verdict text CHECK (verdict IN ('pass', 'warn', 'block', 'unknown')),
  attestation_uid text,
  payment_network text,
  payment_tx_hash text,
  amount_usdc text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'anchored', 'skipped', 'failed')),
  anchor_tx_hash text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  anchor_day date GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED
);

COMMENT ON TABLE public.reputation_anchor_queue IS
  'Opt-in ERC-8004 reputation anchoring: one feedback entry per payer+agentId+day, batched daily to the BNB Reputation Registry.';

CREATE UNIQUE INDEX IF NOT EXISTS reputation_anchor_queue_daily_unique
  ON public.reputation_anchor_queue (payer, agent_id, anchor_day);

CREATE INDEX IF NOT EXISTS reputation_anchor_queue_pending_idx
  ON public.reputation_anchor_queue (created_at)
  WHERE status = 'pending';

ALTER TABLE public.reputation_anchor_queue ENABLE ROW LEVEL SECURITY;

COMMIT;
