-- Migration 0095: Monad on-chain DEX market evidence
--
-- This is deliberately separate from oracle prices and consensus. It stores
-- finalized Uniswap V3 Swap events for a reviewed Monad market so Insight can
-- expose attributable, source-local volume and liquidity evidence alongside
-- live block-pinned quotes. The data is system-owned and written only by the
-- authenticated collector; public APIs return an aggregate, never raw user
-- activity or an estimated volume.

BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.dex_market_sync_cursors (
  chain_id integer NOT NULL,
  dex text NOT NULL,
  pool_address text NOT NULL,
  last_scanned_block numeric(78, 0) NOT NULL CHECK (last_scanned_block >= 0),
  last_scanned_timestamp timestamptz NOT NULL,
  coverage_started_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, dex, pool_address),
  CHECK (coverage_started_at <= last_scanned_timestamp)
);

CREATE TABLE IF NOT EXISTS public.dex_market_swap_events (
  chain_id integer NOT NULL,
  dex text NOT NULL,
  pool_address text NOT NULL,
  tx_hash text NOT NULL,
  log_index numeric(78, 0) NOT NULL CHECK (log_index >= 0),
  block_number numeric(78, 0) NOT NULL CHECK (block_number >= 0),
  block_hash text NOT NULL,
  block_timestamp timestamptz NOT NULL,
  amount0_raw numeric NOT NULL,
  amount1_raw numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, dex, pool_address, tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS dex_market_swap_events_window_idx
  ON public.dex_market_swap_events (chain_id, dex, pool_address, block_timestamp DESC);

CREATE INDEX IF NOT EXISTS dex_market_swap_events_block_idx
  ON public.dex_market_swap_events (chain_id, dex, pool_address, block_number DESC);

ALTER TABLE public.dex_market_sync_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dex_market_swap_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.dex_market_sync_cursors IS
  'Finalized on-chain DEX-event cursor. coverage_started_at represents a contiguous indexed range and prevents an incomplete rolling window from being presented as a full-day volume.';
COMMENT ON TABLE public.dex_market_swap_events IS
  'Attributable finalized on-chain DEX Swap events. This evidence is a market-execution input, never an oracle-consensus provider.';
COMMENT ON COLUMN public.dex_market_swap_events.amount1_raw IS
  'Signed token1 amount in token-native integer units. For the reviewed Monad WMON/USDC pool token1 is USDC; the volume RPC sums abs(amount1_raw).';

CREATE OR REPLACE FUNCTION public.get_dex_market_volume_window(
  p_chain_id integer,
  p_dex text,
  p_pool_address text,
  p_window_start timestamptz,
  p_window_end timestamptz
)
RETURNS TABLE (swap_count bigint, gross_quote_volume_raw numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::bigint AS swap_count,
    coalesce(sum(abs(amount1_raw)), 0)::numeric AS gross_quote_volume_raw
  FROM public.dex_market_swap_events
  WHERE chain_id = p_chain_id
    AND dex = p_dex
    AND pool_address = lower(p_pool_address)
    AND block_timestamp > p_window_start
    AND block_timestamp <= p_window_end;
$$;

REVOKE ALL ON FUNCTION public.get_dex_market_volume_window(integer, text, text, timestamptz, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dex_market_volume_window(integer, text, text, timestamptz, timestamptz)
  TO service_role;

SELECT cron.unschedule('dex-market-swap-events-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dex-market-swap-events-cleanup');
SELECT cron.schedule('dex-market-swap-events-cleanup', '50 4 * * *', $$
  DELETE FROM public.dex_market_swap_events
  WHERE block_timestamp < now() - interval '35 days';
$$);

COMMIT;
