-- Migration: Create oracle_feeds table
-- Stores dynamically updatable oracle feed metadata (addresses, decimals, etc.)
-- This allows feed updates without code changes or redeployment.

CREATE TABLE IF NOT EXISTS oracle_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  symbol TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 8,
  category TEXT NOT NULL DEFAULT 'crypto',
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'sync',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each provider+symbol+chain_id combination should be unique
  CONSTRAINT oracle_feeds_unique_feed UNIQUE (provider, symbol, chain_id)
);

COMMENT ON COLUMN oracle_feeds.address IS 'Primary feed identifier: contract address (Chainlink/WINKLink/TWAP), feed ID (Pyth/Flare), pair index as string (Supra), dAPI name (API3), asset address (DIA), contract ID (Reflector)';
COMMENT ON COLUMN oracle_feeds.metadata IS 'Provider-specific data: {blockchain, pairIndex, feedId, dapiName, feeTier, token0, token1, contractId, ...}';

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_oracle_feeds_provider ON oracle_feeds (provider);
CREATE INDEX IF NOT EXISTS idx_oracle_feeds_provider_active ON oracle_feeds (provider, is_active);
CREATE INDEX IF NOT EXISTS idx_oracle_feeds_symbol_chain ON oracle_feeds (symbol, chain_id);
CREATE INDEX IF NOT EXISTS idx_oracle_feeds_provider_chain ON oracle_feeds (provider, chain_id, is_active);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_oracle_feeds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_oracle_feeds_updated_at ON oracle_feeds;
CREATE TRIGGER trg_update_oracle_feeds_updated_at
  BEFORE UPDATE ON oracle_feeds
  FOR EACH ROW
  EXECUTE FUNCTION update_oracle_feeds_updated_at();

-- RLS policies (service role bypasses RLS, so cron jobs work)
ALTER TABLE oracle_feeds ENABLE ROW LEVEL SECURITY;

-- Allow public read access (feed metadata is not sensitive)
CREATE POLICY "oracle_feeds_read_all" ON oracle_feeds
  FOR SELECT USING (true);

-- Only service role can write (handled at application level)
