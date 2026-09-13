-- 0054: Atomically serialize webhook delivery processing with expiring leases.
--
-- The previous application flow selected processed_webhook_events and then
-- updated or inserted it. Two concurrent deliveries could both observe a
-- retryable row (or race on the initial insert) and both execute side effects.
-- These SECURITY DEFINER RPCs make claiming atomic and bind completion to the
-- winning lease so a stale worker cannot overwrite a newer attempt.

BEGIN;

ALTER TABLE public.processed_webhook_events
  ADD COLUMN IF NOT EXISTS lease_id uuid,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.claim_webhook_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_lease_seconds integer DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_lease_id uuid := gen_random_uuid();
  v_claimed_lease_id uuid;
  v_status text;
BEGIN
  IF p_provider IS NULL OR btrim(p_provider) = '' OR
     p_event_id IS NULL OR btrim(p_event_id) = '' OR
     p_event_type IS NULL OR btrim(p_event_type) = '' THEN
    RAISE EXCEPTION 'provider, event_id, and event_type are required';
  END IF;

  IF p_lease_seconds < 1 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'lease duration must be between 1 and 3600 seconds';
  END IF;

  INSERT INTO public.processed_webhook_events (
    provider,
    event_id,
    event_type,
    status,
    attempts,
    payload,
    lease_id,
    lease_expires_at
  )
  VALUES (
    p_provider,
    p_event_id,
    p_event_type,
    'pending',
    1,
    p_payload,
    v_lease_id,
    now() + make_interval(secs => p_lease_seconds)
  )
  ON CONFLICT (provider, event_id) DO NOTHING
  RETURNING processed_webhook_events.lease_id INTO v_claimed_lease_id;

  IF FOUND THEN
    RETURN jsonb_build_object('outcome', 'acquired', 'leaseId', v_claimed_lease_id);
  END IF;

  -- Only a failed attempt or an expired legacy/current lease may be replaced.
  -- This UPDATE obtains the row lock and rechecks the predicate after waiting,
  -- so concurrent claimants cannot both succeed.
  UPDATE public.processed_webhook_events
     SET status = 'pending',
         attempts = attempts + 1,
         event_type = p_event_type,
         payload = p_payload,
         lease_id = v_lease_id,
         lease_expires_at = now() + make_interval(secs => p_lease_seconds),
         updated_at = now()
   WHERE provider = p_provider
     AND event_id = p_event_id
     AND (
       status = 'failed' OR
       (status = 'pending' AND (lease_expires_at IS NULL OR lease_expires_at <= now()))
     )
  RETURNING processed_webhook_events.lease_id INTO v_claimed_lease_id;

  IF FOUND THEN
    RETURN jsonb_build_object('outcome', 'acquired', 'leaseId', v_claimed_lease_id);
  END IF;

  SELECT status
    INTO v_status
    FROM public.processed_webhook_events
   WHERE provider = p_provider
     AND event_id = p_event_id;

  IF v_status = 'completed' THEN
    RETURN jsonb_build_object('outcome', 'completed', 'leaseId', NULL);
  END IF;

  RETURN jsonb_build_object('outcome', 'busy', 'leaseId', NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_webhook_event(
  p_provider text,
  p_event_id text,
  p_lease_id uuid,
  p_succeeded boolean
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated_id uuid;
BEGIN
  UPDATE public.processed_webhook_events
     SET status = CASE WHEN p_succeeded THEN 'completed' ELSE 'failed' END,
         lease_id = NULL,
         lease_expires_at = NULL,
         updated_at = now()
   WHERE provider = p_provider
     AND event_id = p_event_id
     AND status = 'pending'
     AND lease_id = p_lease_id
  RETURNING id INTO v_updated_id;

  RETURN v_updated_id IS NOT NULL;
END;
$$;

ALTER FUNCTION public.claim_webhook_event(text, text, text, jsonb, integer) OWNER TO postgres;
ALTER FUNCTION public.finish_webhook_event(text, text, uuid, boolean) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.claim_webhook_event(text, text, text, jsonb, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finish_webhook_event(text, text, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_event(text, text, text, jsonb, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_webhook_event(text, text, uuid, boolean)
  TO service_role;

COMMENT ON FUNCTION public.claim_webhook_event(text, text, text, jsonb, integer) IS
  'Atomically claim a webhook event with an expiring lease. Returns acquired, busy, or completed.';
COMMENT ON FUNCTION public.finish_webhook_event(text, text, uuid, boolean) IS
  'Complete or fail a webhook event only when the caller still owns its lease.';

COMMIT;
