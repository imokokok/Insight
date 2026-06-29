-- ============================================
-- Migration: Drop unused highlights column from daily_reports
-- Version: 022
-- Description: Highlights section was removed from the daily report UI
--   and generation logic; the column is no longer needed.
-- ============================================

ALTER TABLE public.daily_reports
DROP COLUMN IF EXISTS highlights;
