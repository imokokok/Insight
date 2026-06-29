-- ============================================
-- Migration: Add peg summaries to daily_reports
-- Version: 023
-- Description: Stores daily stablecoin depeg and wrapped/LST peg
--   risk summaries derived from hourly snapshot deviations.
-- ============================================

ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS stablecoin_depeg JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS wrapped_asset_peg JSONB NOT NULL DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.daily_reports.stablecoin_depeg IS
    'Daily stablecoin depeg summary: max deviation, risk level, and affected protocols.';

COMMENT ON COLUMN public.daily_reports.wrapped_asset_peg IS
    'Daily wrapped/LST asset peg summary: max deviation, risk level, and affected protocols.';

CREATE INDEX IF NOT EXISTS idx_daily_reports_stablecoin_depeg
    ON public.daily_reports USING gin (stablecoin_depeg);

CREATE INDEX IF NOT EXISTS idx_daily_reports_wrapped_asset_peg
    ON public.daily_reports USING gin (wrapped_asset_peg);
