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
        "push_notifications": false
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
COMMENT ON TABLE public.user_favorites IS 'User favorite configurations (oracle configs, symbols, chain configs)';

COMMENT ON COLUMN public.price_records.ttl IS 'Time-to-live: record expires after this timestamp';
COMMENT ON COLUMN public.price_records.confidence IS 'Confidence score from 0 to 1';
