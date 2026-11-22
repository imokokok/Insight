-- Migration 0147: avoid redundant Turso-mode capture and projection fallbacks.
--
-- The receipt table is written by the Supabase projection path. In Turso
-- projection mode it remains empty, even after the primary capture and
-- projection workflows have succeeded. Use the dispatch ledger as the shared
-- completion/in-flight signal, while keeping the receipt check for the
-- Supabase projection path and retaining same-slot timeout retries.

BEGIN;

CREATE OR REPLACE FUNCTION public.dispatch_turso_fallbacks_if_unprojected()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_slot timestamptz;
  v_snapshot_done boolean;
  v_projection_done boolean;
  v_dispatched boolean := false;
BEGIN
  v_slot := date_trunc('hour', v_now)
    + floor(extract(minute FROM v_now) / 15) * interval '15 minutes';

  IF EXISTS (
    SELECT 1
    FROM public.turso_price_slot_receipts
    WHERE snapshot_ts = v_slot
  ) THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.cron_dispatch_runs r
    WHERE r.workflow_file = 'snapshot-collect.yml'
      AND r.source IN ('supabase_cron', 'github_fallback')
      AND r.status = 'succeeded'
      AND date_trunc('hour', r.scheduled_for)
          + floor(extract(minute FROM r.scheduled_for) / 15) * interval '15 minutes'
          = v_slot
  ) INTO v_snapshot_done;

  SELECT EXISTS (
    SELECT 1
    FROM public.cron_dispatch_runs r
    WHERE r.workflow_file = 'turso-price-project.yml'
      AND r.source IN ('supabase_cron', 'github_fallback')
      AND r.status = 'succeeded'
      AND date_trunc('hour', r.scheduled_for)
          + floor(extract(minute FROM r.scheduled_for) / 15) * interval '15 minutes'
          = v_slot
  ) INTO v_projection_done;

  IF NOT v_snapshot_done THEN
    PERFORM public.dispatch_github_workflow('snapshot-collect.yml');
    v_dispatched := true;
  END IF;

  IF NOT v_projection_done THEN
    PERFORM public.dispatch_github_workflow('turso-price-project.yml');
    v_dispatched := true;
  END IF;

  RETURN v_dispatched;
END;
$function$;

REVOKE ALL ON FUNCTION public.dispatch_turso_fallbacks_if_unprojected()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_turso_fallbacks_if_unprojected()
  TO service_role;

CREATE OR REPLACE FUNCTION public.dispatch_turso_snapshot_second_probe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_slot timestamptz;
  v_projected boolean;
  v_token text;
  v_retry record;
  v_dispatched boolean := false;
  v_retried integer := 0;
BEGIN
  v_slot := date_trunc('hour', v_now)
    + floor(extract(minute FROM v_now) / 15) * interval '15 minutes';

  SELECT
    EXISTS (
      SELECT 1
      FROM public.turso_price_slot_receipts
      WHERE snapshot_ts = v_slot
    )
    OR EXISTS (
      SELECT 1
      FROM public.cron_dispatch_runs r
      WHERE r.workflow_file = 'snapshot-collect.yml'
        AND r.source IN ('supabase_cron', 'github_fallback')
        AND (
          r.status = 'succeeded'
          OR (
            r.status IN ('dispatching', 'running')
            AND r.scheduled_for >= v_slot + interval '5 minutes'
          )
          OR (r.status = 'timed_out' AND r.source = 'supabase_cron')
        )
        AND date_trunc('hour', r.scheduled_for)
            + floor(extract(minute FROM r.scheduled_for) / 15) * interval '15 minutes'
            = v_slot
    )
  INTO v_projected;

  -- A successful run covers this slot. An active +7-minute fallback also
  -- covers it, while an active primary remains eligible for recovery at +12.
  -- Timed-out primary rows are left for the retry loop below instead of
  -- creating a second independent dispatch row.
  IF NOT v_projected THEN
    PERFORM public.dispatch_github_workflow('snapshot-collect.yml');
    v_dispatched := true;
  END IF;

  -- Cross-slot abstention: never retry a capture after its slot has closed.
  UPDATE public.cron_dispatch_runs
  SET status = 'lost',
      conclusion = 'cross_slot_abandoned: no late backfill',
      completed_at = now(),
      updated_at = clock_timestamp()
  WHERE workflow_file = 'snapshot-collect.yml'
    AND source = 'supabase_cron'
    AND status = 'timed_out'
    AND date_trunc('hour', scheduled_for)
        + floor(extract(minute FROM scheduled_for) / 15) * interval '15 minutes'
        <> v_slot;

  SELECT decrypted_secret
  INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'github_workflow_dispatch_token'
  LIMIT 1;

  IF v_token IS NULL OR length(v_token) < 20 THEN
    RETURN v_dispatched;
  END IF;

  FOR v_retry IN
    SELECT r.id, r.scheduled_for
    FROM public.cron_dispatch_runs r
    WHERE r.workflow_file = 'snapshot-collect.yml'
      AND r.source = 'supabase_cron'
      AND r.status = 'timed_out'
      AND date_trunc('hour', r.scheduled_for)
          + floor(extract(minute FROM r.scheduled_for) / 15) * interval '15 minutes'
          = v_slot
      AND NOT EXISTS (
        SELECT 1
        FROM public.turso_price_slot_receipts s
        WHERE s.snapshot_ts = v_slot
      )
    ORDER BY r.scheduled_for DESC
    LIMIT 2
  LOOP
    UPDATE public.cron_dispatch_runs
    SET status = 'dispatching',
        conclusion = NULL,
        completed_at = NULL,
        created_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = v_retry.id
      AND status = 'timed_out';

    IF FOUND THEN
      BEGIN
        PERFORM net.http_post(
          url := 'https://api.github.com/repos/imokokok/Insight/actions/workflows/snapshot-collect.yml/dispatches',
          headers := jsonb_build_object(
            'Accept', 'application/vnd.github+json',
            'Authorization', 'Bearer ' || v_token,
            'Content-Type', 'application/json',
            'User-Agent', 'insight-supabase-cron',
            'X-GitHub-Api-Version', '2026-03-10'
          ),
          body := jsonb_build_object(
            'ref', 'main',
            'inputs', jsonb_build_object(
              'dispatch_id', v_retry.id::text,
              'scheduled_for', v_retry.scheduled_for::text
            )
          ),
          timeout_milliseconds := 5000
        );
        v_retried := v_retried + 1;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.cron_dispatch_runs
        SET status = 'timed_out',
            conclusion = 'retry dispatch failed: ' || SQLERRM,
            completed_at = now(),
            updated_at = clock_timestamp()
        WHERE id = v_retry.id;
        RAISE WARNING 'second probe retry dispatch failed for %: %',
          v_retry.id, SQLERRM;
      END;
    END IF;
  END LOOP;

  RETURN v_dispatched OR v_retried > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.dispatch_turso_snapshot_second_probe()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_turso_snapshot_second_probe()
  TO service_role;

COMMIT;
