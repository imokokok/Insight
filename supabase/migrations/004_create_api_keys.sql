-- Migration: Create api_keys table for Developer API
-- Created: 2026-05-10

-- API Keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(11) NOT NULL,
  plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  rate_limit INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast key lookups by hash
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys (key_hash) WHERE is_active = true;

-- Index for listing keys by user
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys (user_id);

-- Index for finding active keys
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys (is_active) WHERE is_active = true;

-- Index for expired key cleanup
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON public.api_keys (expires_at) WHERE expires_at IS NOT NULL;

-- API Key usage tracking table (optional, for analytics)
CREATE TABLE IF NOT EXISTS public.api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(200) NOT NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'GET',
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for usage queries by key and time
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_time ON public.api_key_usage (api_key_id, created_at DESC);

-- Index for usage count queries
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_created ON public.api_key_usage (api_key_id, created_at);

-- RLS policies
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own API keys
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
CREATE POLICY "Users can view own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own API keys
DROP POLICY IF EXISTS "Users can create own API keys" ON public.api_keys;
CREATE POLICY "Users can create own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys
DROP POLICY IF EXISTS "Users can update own API keys" ON public.api_keys;
CREATE POLICY "Users can update own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own API keys
DROP POLICY IF EXISTS "Users can delete own API keys" ON public.api_keys;
CREATE POLICY "Users can delete own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Usage records are managed by the service role only
DROP POLICY IF EXISTS "Service role manages usage" ON public.api_key_usage;
CREATE POLICY "Service role manages usage"
  ON public.api_key_usage FOR ALL
  USING (auth.role() = 'service_role');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-deactivate expired keys
CREATE OR REPLACE FUNCTION public.deactivate_expired_api_keys()
RETURNS void AS $$
BEGIN
  UPDATE public.api_keys
  SET is_active = false, updated_at = now()
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limits table (Supabase-based rate limiting, replaces need for Redis/Vercel KV)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for counting requests in a time window
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON public.rate_limits (key, created_at DESC);

-- Index for cleanup of old entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON public.rate_limits (created_at);

-- RLS: only service role can manage rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limits;
CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-cleanup: delete entries older than 5 minutes every minute
-- This keeps the table small and prevents unbounded growth
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: pg_cron extension for automatic cleanup
-- If pg_cron is available on your Supabase plan, uncomment:
-- SELECT cron.schedule(
--   'cleanup-rate-limits',
--   '* * * * *',
--   $$ SELECT public.cleanup_rate_limits(); $$
-- );
