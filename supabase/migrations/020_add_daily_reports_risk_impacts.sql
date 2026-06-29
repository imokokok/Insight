-- ============================================
-- Migration: Add risk_impacts to daily_reports
-- Version: 020
-- Description: Stores user-risk impact summaries
--   generated from deviation events, failures, and protocol exposure.
-- ============================================

ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS risk_impacts JSONB NOT NULL DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.daily_reports.risk_impacts IS
    'User-risk impact summary: who is affected and how, derived from oracle deviations and protocol exposure.';
