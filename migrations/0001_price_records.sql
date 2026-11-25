CREATE TABLE IF NOT EXISTS price_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  symbol TEXT NOT NULL,
  chain TEXT,
  price_e8 TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  confidence_e4 INTEGER,
  source TEXT,
  created_at_ms INTEGER NOT NULL,
  ttl_ms INTEGER NOT NULL,
  failure_mode TEXT,
  signal_vector_json TEXT,
  decimals INTEGER,
  verification_json TEXT,
  ingestion_timestamp_ms INTEGER,
  metadata_fallback INTEGER CHECK (metadata_fallback IN (0, 1))
);

CREATE INDEX IF NOT EXISTS price_records_latest_idx
  ON price_records(provider, symbol, chain, timestamp_ms DESC);
CREATE INDEX IF NOT EXISTS price_records_timestamp_idx
  ON price_records(timestamp_ms DESC);
