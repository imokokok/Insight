-- ============================================
-- Oracle Insight Database Schema
-- Version: 1.0.0
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: user_profiles
-- Extends Supabase auth.users with user preferences
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    preferences JSONB DEFAULT '{
        "default_oracle": "chainlink",
        "default_symbol": "BTC/USD",
        "default_chain": "ethereum",
        "chart_settings": {
            "show_confidence_interval": true,
            "auto_refresh": true,
            "refresh_interval": 30000
        }
    }'::jsonb,
    notification_settings JSONB DEFAULT '{
        "email_alerts": true,
        "push_notifications": false,
        "alert_frequency": "immediate"
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Table: price_records
-- Stores historical price data from oracles
-- ============================================
CREATE TABLE IF NOT EXISTS public.price_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    symbol TEXT NOT NULL,
    chain TEXT,
    price DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    confidence DECIMAL(5, 4),
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ttl TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE public.price_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_records (read-only for clients)
CREATE POLICY "Anyone can read price records"
    ON public.price_records FOR SELECT
    USING (true);

-- Note: Write operations should be done via service role key
-- No INSERT/UPDATE/DELETE policies for authenticated users

-- Indexes for price_records
CREATE INDEX idx_price_records_provider_symbol ON public.price_records(provider, symbol);
CREATE INDEX idx_price_records_timestamp ON public.price_records(timestamp DESC);
CREATE INDEX idx_price_records_chain ON public.price_records(chain);
CREATE INDEX idx_price_records_ttl ON public.price_records(ttl);
CREATE INDEX idx_price_records_provider_symbol_timestamp ON public.price_records(provider, symbol, timestamp DESC);

-- Partial index for active records (not expired)
CREATE INDEX idx_price_records_active ON public.price_records(provider, symbol)
    WHERE (ttl > NOW());

-- ============================================
-- Table: user_snapshots
-- Stores user price snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT,
    selected_oracles TEXT[] NOT NULL,
    price_data JSONB NOT NULL,
    stats JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_snapshots
CREATE POLICY "Users can view own snapshots"
    ON public.user_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Public snapshots are viewable by all"
    ON public.user_snapshots FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can create own snapshots"
    ON public.user_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots"
    ON public.user_snapshots FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
    ON public.user_snapshots FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for user_snapshots
CREATE INDEX idx_user_snapshots_user_id ON public.user_snapshots(user_id);
CREATE INDEX idx_user_snapshots_symbol ON public.user_snapshots(symbol);
CREATE INDEX idx_user_snapshots_created_at ON public.user_snapshots(created_at DESC);
CREATE INDEX idx_user_snapshots_public ON public.user_snapshots(is_public) WHERE (is_public = true);

CREATE TRIGGER update_user_snapshots_updated_at
    BEFORE UPDATE ON public.user_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Table: user_favorites
-- Stores user favorite configurations
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    config_type TEXT NOT NULL CHECK (config_type IN ('oracle_config', 'symbol', 'chain_config')),
    config_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_favorites
CREATE POLICY "Users can view own favorites"
    ON public.user_favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
    ON public.user_favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites"
    ON public.user_favorites FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
    ON public.user_favorites FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for user_favorites
CREATE INDEX idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_config_type ON public.user_favorites(config_type);
CREATE INDEX idx_user_favorites_created_at ON public.user_favorites(created_at DESC);

-- ============================================
-- Table: price_alerts
-- Stores price alert configurations
-- ============================================
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    provider TEXT,
    chain TEXT,
    condition_type TEXT NOT NULL CHECK (condition_type IN ('above', 'below', 'change_percent')),
    target_value DECIMAL(20, 8) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_alerts
CREATE POLICY "Users can view own alerts"
    ON public.price_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
    ON public.price_alerts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
    ON public.price_alerts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
    ON public.price_alerts FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_price_alerts_updated_at
    BEFORE UPDATE ON public.price_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for price_alerts
CREATE INDEX idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX idx_price_alerts_symbol ON public.price_alerts(symbol);
CREATE INDEX idx_price_alerts_active ON public.price_alerts(is_active) WHERE (is_active = true);
CREATE INDEX idx_price_alerts_provider ON public.price_alerts(provider);

-- ============================================
-- Table: alert_events
-- Stores alert trigger events
-- ============================================
CREATE TABLE IF NOT EXISTS public.alert_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES public.price_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    price DECIMAL(20, 8) NOT NULL,
    condition_met TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert_events
CREATE POLICY "Users can view own alert events"
    ON public.alert_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alert events"
    ON public.alert_events FOR UPDATE
    USING (auth.uid() = user_id);

-- Indexes for alert_events
CREATE INDEX idx_alert_events_user_id ON public.alert_events(user_id);
CREATE INDEX idx_alert_events_alert_id ON public.alert_events(alert_id);
CREATE INDEX idx_alert_events_triggered_at ON public.alert_events(triggered_at DESC);
CREATE INDEX idx_alert_events_acknowledged ON public.alert_events(acknowledged) WHERE (acknowledged = false);

-- ============================================
-- Functions and Procedures
-- ============================================

-- Function to clean up expired price records
CREATE OR REPLACE FUNCTION public.cleanup_expired_price_records()
RETURNS void AS $$
BEGIN
    DELETE FROM public.price_records WHERE ttl < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest price for a symbol
CREATE OR REPLACE FUNCTION public.get_latest_price(
    p_provider TEXT,
    p_symbol TEXT,
    p_chain TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    provider TEXT,
    symbol TEXT,
    chain TEXT,
    price DECIMAL,
    timestamp TIMESTAMPTZ,
    confidence DECIMAL,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.provider,
        pr.symbol,
        pr.chain,
        pr.price,
        pr.timestamp,
        pr.confidence,
        pr.source
    FROM public.price_records pr
    WHERE pr.provider = p_provider
        AND pr.symbol = p_symbol
        AND (p_chain IS NULL OR pr.chain = p_chain)
        AND pr.ttl > NOW()
    ORDER BY pr.timestamp DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get price history
CREATE OR REPLACE FUNCTION public.get_price_history(
    p_provider TEXT,
    p_symbol TEXT,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_chain TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE (
    id UUID,
    provider TEXT,
    symbol TEXT,
    chain TEXT,
    price DECIMAL,
    timestamp TIMESTAMPTZ,
    confidence DECIMAL,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.provider,
        pr.symbol,
        pr.chain,
        pr.price,
        pr.timestamp,
        pr.confidence,
        pr.source
    FROM public.price_records pr
    WHERE pr.provider = p_provider
        AND pr.symbol = p_symbol
        AND (p_chain IS NULL OR pr.chain = p_chain)
        AND pr.timestamp >= p_start_time
        AND pr.timestamp <= p_end_time
    ORDER BY pr.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Views
-- ============================================

-- View for active alerts with latest prices
CREATE OR REPLACE VIEW public.active_alerts_with_prices AS
SELECT 
    pa.id AS alert_id,
    pa.user_id,
    pa.symbol,
    pa.provider,
    pa.chain,
    pa.condition_type,
    pa.target_value,
    pa.is_active,
    pa.last_triggered_at,
    pr.price AS current_price,
    pr.timestamp AS price_timestamp
FROM public.price_alerts pa
LEFT JOIN LATERAL (
    SELECT price, timestamp
    FROM public.price_records pr
    WHERE pr.symbol = pa.symbol
        AND (pa.provider IS NULL OR pr.provider = pa.provider)
        AND (pa.chain IS NULL OR pr.chain = pa.chain)
        AND pr.ttl > NOW()
    ORDER BY pr.timestamp DESC
    LIMIT 1
) pr ON true
WHERE pa.is_active = true;

-- ============================================
-- Initial Data / Seeds (Optional)
-- ============================================

-- Insert default supported providers
-- This can be managed via application config instead

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE public.user_profiles IS 'Extends Supabase auth.users with user preferences and settings';
COMMENT ON TABLE public.price_records IS 'Historical price data from oracle providers with TTL for automatic cleanup';
COMMENT ON TABLE public.user_snapshots IS 'User-saved price snapshots for comparison and historical reference';
COMMENT ON TABLE public.user_favorites IS 'User favorite configurations (oracle configs, symbols, chain configs)';
COMMENT ON TABLE public.price_alerts IS 'Price alert configurations with trigger conditions';
COMMENT ON TABLE public.alert_events IS 'Records of alert trigger events';

COMMENT ON COLUMN public.price_records.ttl IS 'Time-to-live: record expires after this timestamp';
COMMENT ON COLUMN public.price_records.confidence IS 'Confidence score from 0 to 1';
COMMENT ON COLUMN public.user_snapshots.is_public IS 'Whether snapshot is publicly shareable';
COMMENT ON COLUMN public.price_alerts.condition_type IS 'Alert condition: above, below, or change_percent';
COMMENT ON COLUMN public.alert_events.condition_met IS 'Description of the condition that was met';
