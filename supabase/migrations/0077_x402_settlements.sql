-- Audit table for x402 (HTTP 402) per-call settlements on the keyless paid
-- tier of /api/v1/safety/pre-trade.
--
-- Design notes:
-- * One row per settlement attempt. `status` distinguishes settled /
--   settlement_failed / verify_failed so failed attempts are auditable too.
-- * `tx_hash` is the on-chain USDC transferWithAuthorization tx returned by
--   the facilitator; weekly reconciliation compares these rows against the
--   actual USDC balance history of the X402_PAY_TO address.
-- * No PII: payer is a public wallet address. `request_id` joins to Vercel
--   request logs for latency/verdict correlation.
-- * Writes come exclusively from the service-role client (bypasses RLS), and
--   the table has RLS enabled with no public policies: only the service role
--   can read or write. Nothing here is user-owned data.

create table if not exists public.x402_settlements (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  status text not null check (status in ('settled', 'settlement_failed', 'verify_failed')),
  tx_hash text,
  payer text,
  amount_usdc numeric(20, 6),
  network text not null check (network in ('base', 'base-sepolia')),
  asset text,
  verdict text,
  error_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_x402_settlements_created_at
  on public.x402_settlements (created_at desc);
create index if not exists idx_x402_settlements_request
  on public.x402_settlements (request_id);

alter table public.x402_settlements enable row level security;

-- Intentionally no policies: the service role bypasses RLS; anon/authenticated
-- roles get nothing (default deny).
