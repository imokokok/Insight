-- 0146: reserve 24-hour product usage under row locks.
--
-- Poll and guard callers previously wrote a count derived from a stale read.
-- Concurrent requests could all write the same increment while each ran its
-- assessment. These service-only RPCs lock the product row, validate its
-- current state, and mutate counters inside one transaction.

BEGIN;

CREATE OR REPLACE FUNCTION public.reserve_oracle_watch_window_poll(p_window_id uuid)
RETURNS TABLE(outcome text, poll_count integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_window public.oracle_watch_windows%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_poll_count integer;
  v_retry_after integer;
BEGIN
  SELECT * INTO v_window
  FROM public.oracle_watch_windows
  WHERE id = p_window_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'NOT_FOUND'::text, NULL::integer, NULL::integer;
    RETURN;
  END IF;
  IF v_window.status <> 'active' THEN
    RETURN QUERY SELECT 'WINDOW_CLOSED'::text, NULL::integer, NULL::integer;
    RETURN;
  END IF;
  IF v_window.expires_at <= v_now THEN
    RETURN QUERY SELECT 'WINDOW_EXPIRED'::text, NULL::integer, NULL::integer;
    RETURN;
  END IF;
  IF v_window.poll_count >= v_window.poll_cap THEN
    RETURN QUERY SELECT 'POLL_CAP_REACHED'::text, NULL::integer, NULL::integer;
    RETURN;
  END IF;
  IF v_window.last_poll_at IS NOT NULL
     AND v_window.last_poll_at + make_interval(secs => v_window.min_poll_interval_seconds) > v_now THEN
    v_retry_after := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (
        v_window.last_poll_at
        + make_interval(secs => v_window.min_poll_interval_seconds)
        - v_now
      )))::integer
    );
    RETURN QUERY SELECT 'POLL_TOO_SOON'::text, NULL::integer, v_retry_after;
    RETURN;
  END IF;

  UPDATE public.oracle_watch_windows
  SET poll_count = poll_count + 1,
      last_poll_at = v_now
  WHERE id = p_window_id
  RETURNING public.oracle_watch_windows.poll_count INTO v_poll_count;

  RETURN QUERY SELECT 'RESERVED'::text, v_poll_count, NULL::integer;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_position_lifecycle_guard_slot(p_lifecycle_id uuid)
RETURNS TABLE(outcome text, guard_used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_lifecycle public.position_lifecycles%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_guard_used integer;
BEGIN
  SELECT * INTO v_lifecycle
  FROM public.position_lifecycles
  WHERE id = p_lifecycle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'NOT_FOUND'::text, NULL::integer;
    RETURN;
  END IF;
  IF v_lifecycle.status <> 'active' THEN
    RETURN QUERY SELECT 'LIFECYCLE_CLOSED'::text, NULL::integer;
    RETURN;
  END IF;
  IF v_lifecycle.expires_at <= v_now THEN
    RETURN QUERY SELECT 'LIFECYCLE_EXPIRED'::text, NULL::integer;
    RETURN;
  END IF;
  IF v_lifecycle.guard_used >= v_lifecycle.guard_budget THEN
    RETURN QUERY SELECT 'GUARD_BUDGET_REACHED'::text, NULL::integer;
    RETURN;
  END IF;

  UPDATE public.position_lifecycles
  SET guard_used = guard_used + 1
  WHERE id = p_lifecycle_id
  RETURNING public.position_lifecycles.guard_used INTO v_guard_used;

  RETURN QUERY SELECT 'RESERVED'::text, v_guard_used;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_position_lifecycle_guard_slot(p_lifecycle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.position_lifecycles
  SET guard_used = guard_used - 1
  WHERE id = p_lifecycle_id
    AND guard_used > 0;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_oracle_watch_window_poll(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_position_lifecycle_guard_slot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_position_lifecycle_guard_slot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_oracle_watch_window_poll(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_position_lifecycle_guard_slot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_position_lifecycle_guard_slot(uuid) TO service_role;

COMMENT ON FUNCTION public.reserve_oracle_watch_window_poll(uuid) IS
  'Atomically enforces one Oracle Watch poll per stored window interval and poll cap.';
COMMENT ON FUNCTION public.reserve_position_lifecycle_guard_slot(uuid) IS
  'Atomically reserves one position lifecycle guard evaluation within the active lifecycle budget.';
COMMENT ON FUNCTION public.release_position_lifecycle_guard_slot(uuid) IS
  'Atomically returns one failed position lifecycle guard reservation.';

COMMIT;
