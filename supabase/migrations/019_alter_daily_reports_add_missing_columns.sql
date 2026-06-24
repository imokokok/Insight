-- ============================================
-- Migration: Add missing daily_reports columns
-- Version: 019
-- Description: Add JSONB columns used by reportService.persistReport
-- ============================================

ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS recommendations JSONB NOT NULL DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS coverage_matrix JSONB NOT NULL DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS failure_breakdown JSONB NOT NULL DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS previous_day_comparison JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_daily_reports_coverage_matrix
    ON public.daily_reports USING gin (coverage_matrix);

CREATE INDEX IF NOT EXISTS idx_daily_reports_failure_breakdown
    ON public.daily_reports USING gin (failure_breakdown);
