-- ============================================
-- Migration: Add name field to price_alerts
-- Version: 002
-- Description: Add name field to support alert naming
-- ============================================

-- Add name column to price_alerts table
ALTER TABLE public.price_alerts
ADD COLUMN IF NOT EXISTS name TEXT;

-- Create index for name searches (optional, for future search functionality)
CREATE INDEX IF NOT EXISTS idx_price_alerts_name ON public.price_alerts(name);

-- Add comment for documentation
COMMENT ON COLUMN public.price_alerts.name IS 'Optional user-defined name for the alert';

-- Update existing alerts to have a default name based on their configuration
UPDATE public.price_alerts
SET name = symbol || ' ' || 
    CASE 
        WHEN condition_type = 'above' THEN '高于'
        WHEN condition_type = 'below' THEN '低于'
        ELSE '变化'
    END || ' ' || target_value
WHERE name IS NULL;
