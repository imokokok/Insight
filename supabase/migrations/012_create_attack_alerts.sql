-- 012_create_attack_alerts.sql
-- Attack detection alert persistence table
-- Stores flash loan / oracle manipulation alerts for forensic analysis

CREATE TABLE IF NOT EXISTS attack_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL CHECK (level IN ('warning', 'critical')),
  threat_level TEXT NOT NULL CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),
  symbol TEXT NOT NULL,
  chain TEXT NOT NULL,
  provider TEXT NOT NULL,
  message TEXT NOT NULL,
  recommendation TEXT,
  -- Attack signature snapshot (JSONB for forensic analysis)
  signature_snapshot JSONB NOT NULL,
  scores_snapshot JSONB NOT NULL,
  total_score DECIMAL(6,4) NOT NULL,
  -- Liquidity snapshot (only available for TWAP-backed detection)
  liquidity_snapshot JSONB,
  -- Lifecycle
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_attack_alerts_symbol_chain ON attack_alerts(symbol, chain);
CREATE INDEX IF NOT EXISTS idx_attack_alerts_started_at ON attack_alerts(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_attack_alerts_threat_level
  ON attack_alerts(threat_level) WHERE threat_level IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_attack_alerts_level ON attack_alerts(level);

-- Enable RLS
ALTER TABLE attack_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read alerts
CREATE POLICY "Authenticated users can read attack alerts"
  ON attack_alerts FOR SELECT
  TO authenticated
  USING (true);

-- Policy: authenticated users can insert alerts (service role bypasses RLS)
CREATE POLICY "Authenticated users can insert attack alerts"
  ON attack_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: authenticated users can update alert resolution
CREATE POLICY "Authenticated users can update attack alerts"
  ON attack_alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup function: delete alerts older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_attack_alerts()
RETURNS VOID AS $$
BEGIN
  DELETE FROM attack_alerts WHERE started_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
