-- Billing & subscription tables for Flat Tier + Calls quota monetization.
-- Adds: api_keys plan/quota columns, subscriptions, webhook tables (schema-only).

-- ============================================================================
-- 1. Extend api_keys: add 'protocol' to plan CHECK, change default rate_limit,
--    add trial/billing/quota columns.
-- ============================================================================

-- First drop the old CHECK constraint (only allows free/pro/enterprise)
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_plan_check;

-- Re-add with 'protocol' included
ALTER TABLE public.api_keys
  ADD CONSTRAINT api_keys_plan_check
  CHECK (plan IN ('free', 'pro', 'protocol', 'enterprise'));

-- Lower the default rate_limit to the Free tier value (20/min)
ALTER TABLE public.api_keys ALTER COLUMN rate_limit SET DEFAULT 20;

-- New columns for trial, Stripe linkage, and monthly quota tracking
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS monthly_quota_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_reset_at timestamp with time zone NOT NULL DEFAULT now();

COMMENT ON COLUMN public.api_keys.trial_ends_at IS 'When the 7-day Pro trial ends; NULL for non-trial keys. Cron downgrades to free after this timestamp.';
COMMENT ON COLUMN public.api_keys.stripe_customer_id IS 'Stripe customer ID linked to this key (set by webhook on first checkout).';
COMMENT ON COLUMN public.api_keys.stripe_subscription_id IS 'Stripe subscription ID backing this key plan (set by webhook).';
COMMENT ON COLUMN public.api_keys.monthly_quota_used IS 'Number of API calls consumed in the current billing month. Reset by cron on the 1st of each month.';
COMMENT ON COLUMN public.api_keys.quota_reset_at IS 'When monthly_quota_used should next reset to 0 (start of next billing month).';

-- Index for cron trial-expiry scan
CREATE INDEX IF NOT EXISTS idx_api_keys_trial_ends_at
  ON public.api_keys (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- Index for Stripe subscription lookups during webhook handling
CREATE INDEX IF NOT EXISTS idx_api_keys_stripe_subscription
  ON public.api_keys (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;


-- ============================================================================
-- 2. subscriptions: mirrors Stripe subscription state for the user-facing
--    billing panel. One row per active or past subscription.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text UNIQUE NOT NULL,
  plan text NOT NULL CHECK (plan IN ('pro', 'protocol', 'enterprise')),
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  interval text NOT NULL CHECK (interval IN ('month', 'year')),
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  trial_ends_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

COMMENT ON TABLE public.subscriptions IS 'Mirrors Stripe subscription state. Updated by /api/billing/webhook. Used by BillingPanel to show current plan and period end.';


-- ============================================================================
-- 3. user_profiles: add trial_claimed_at to enforce one-trial-per-user.
-- ============================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS trial_claimed_at timestamp with time zone;

COMMENT ON COLUMN public.user_profiles.trial_claimed_at IS 'When the user claimed their 7-day Pro trial. NULL = trial not yet claimed. One trial per user.';


-- ============================================================================
-- 4. webhook_subscriptions & webhook_deliveries: schema-only reservation
--    for the Protocol-tier webhook push system (not implemented yet).
--    Allows future work to add push alerts without another migration.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_user ON public.webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON public.webhook_subscriptions(is_active) WHERE is_active = true;

COMMENT ON TABLE public.webhook_subscriptions IS 'Protocol-tier webhook endpoints registered by users. Reserved schema — push logic not yet implemented.';

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamp with time zone,
  response_code integer,
  next_retry_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription ON public.webhook_deliveries(subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending ON public.webhook_deliveries(status, next_retry_at) WHERE status = 'pending';

COMMENT ON TABLE public.webhook_deliveries IS 'Delivery attempts for Protocol-tier webhook push. Reserved schema.';


-- ============================================================================
-- 5. RLS policies for new user-owned tables.
--    Service role bypasses RLS (used by webhooks and crons).
--    User-facing queries go through createUserClient which enforces auth.uid().
-- ============================================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own subscriptions (rarely needed; webhooks usually do this)
CREATE POLICY subscriptions_insert_own ON public.subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own subscriptions (e.g. cancel_at_period_end)
CREATE POLICY subscriptions_update_own ON public.subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- Webhook subscriptions: full CRUD by owner
CREATE POLICY webhook_subscriptions_select_own ON public.webhook_subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY webhook_subscriptions_insert_own ON public.webhook_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY webhook_subscriptions_update_own ON public.webhook_subscriptions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY webhook_subscriptions_delete_own ON public.webhook_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Deliveries: read-only by the subscription owner (via join)
CREATE POLICY webhook_deliveries_select_own ON public.webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.webhook_subscriptions ws
      WHERE ws.id = webhook_deliveries.subscription_id
        AND ws.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 6. updated_at trigger for subscriptions (mirror existing api_keys pattern)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscriptions_updated_at();
