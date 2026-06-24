-- ============================================
-- Migration: Add missing price_records columns
-- Version: 018
-- Description: Add columns used by savePriceRecord to match the application schema
-- ============================================

ALTER TABLE public.price_records
ADD COLUMN IF NOT EXISTS failure_mode text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS signal_vector jsonb,
ADD COLUMN IF NOT EXISTS decimals integer,
ADD COLUMN IF NOT EXISTS verification jsonb,
ADD COLUMN IF NOT EXISTS ingestion_timestamp timestamp with time zone,
ADD COLUMN IF NOT EXISTS metadata_fallback boolean,
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_price_records_failure_mode
    ON public.price_records (failure_mode);

CREATE INDEX IF NOT EXISTS idx_price_records_ingestion_timestamp
    ON public.price_records (ingestion_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_price_records_signal_vector
    ON public.price_records USING gin (signal_vector);
