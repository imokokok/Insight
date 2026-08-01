-- Idempotency table for incoming payment provider webhooks.
-- Prevents duplicate processing of the same event (e.g. Creem retries)
-- which could otherwise repeat upgrades/downgrades.

CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 1,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_lookup
  ON public.processed_webhook_events (provider, event_id);

COMMENT ON TABLE public.processed_webhook_events IS 'Tracks payment provider webhook events that have been received to ensure idempotent processing.';
COMMENT ON COLUMN public.processed_webhook_events.provider IS 'Payment provider namespace, e.g. creem, stripe.';
COMMENT ON COLUMN public.processed_webhook_events.event_id IS 'Provider-side event identifier used as the idempotency key.';
COMMENT ON COLUMN public.processed_webhook_events.status IS 'pending = received but not finished; completed = successfully processed; failed = terminal failure.';

-- Only service role / webhooks need access.
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_processed_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_processed_webhook_events_updated_at ON public.processed_webhook_events;
CREATE TRIGGER trigger_processed_webhook_events_updated_at
  BEFORE UPDATE ON public.processed_webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_processed_webhook_events_updated_at();
