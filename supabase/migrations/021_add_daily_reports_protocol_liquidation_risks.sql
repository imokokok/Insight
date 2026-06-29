-- ============================================
-- Migration: Add protocol_liquidation_risks to daily_reports
-- Version: 021
-- Description: Stores per-protocol liquidation stress-test results
--   derived from Safety Check's 1%/3%/5% deviation scenarios.
-- ============================================

ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS protocol_liquidation_risks JSONB NOT NULL DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.daily_reports.protocol_liquidation_risks IS
    'Per-protocol liquidation stress-test results using representative positions and 1%/3%/5% joint/single deviation scenarios.';

CREATE INDEX IF NOT EXISTS idx_daily_reports_protocol_liquidation_risks
    ON public.daily_reports USING gin (protocol_liquidation_risks);
