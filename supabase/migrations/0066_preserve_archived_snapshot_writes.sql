-- Preserve append-only fine observations and hourly upsert identity after
-- moving original rows out of the hot tables. Hot inserts never read archives.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.preserve_archived_snapshot_write()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  source_time timestamptz;
  kind_name text;
  timestamp_name text;
  original jsonb;
BEGIN
  IF TG_TABLE_NAME = 'price_snapshots' THEN
    source_time := NEW.snapshot_ts;
    kind_name := 'price'; timestamp_name := 'snapshot_ts';
  ELSIF TG_TABLE_NAME = 'hourly_price_snapshots' THEN
    source_time := NEW.snapshot_hour;
    kind_name := 'hourly'; timestamp_name := 'snapshot_hour';
  ELSE
    RAISE EXCEPTION 'Unsupported snapshot source';
  END IF;
  IF source_time >= (((now() AT TIME ZONE 'UTC')::date-7)::timestamp AT TIME ZONE 'UTC') THEN
    RETURN NEW;
  END IF;
  -- Serialize cold inserts with archive/delete. The VOLATILE trigger's lookup
  -- gets a fresh snapshot, so a concurrent move cannot bypass deduplication.
  IF NOT pg_try_advisory_xact_lock(192736,64) THEN
    RAISE EXCEPTION 'Snapshot archive maintenance is running; retry cold write';
  END IF;
  SELECT item INTO original FROM public.snapshot_archives a
  CROSS JOIN LATERAL jsonb_array_elements(a.entries) item
  WHERE a.kind=kind_name AND a.archive_day=(source_time AT TIME ZONE 'UTC')::date
    AND a.provider=NEW.provider AND a.symbol=NEW.symbol AND a.chain_id=NEW.chain_id
    AND (item->>timestamp_name)::timestamptz=source_time LIMIT 1;
  IF original IS NOT NULL THEN
    IF kind_name='price' THEN RETURN NULL; END IF;
    NEW.id := (original->>'id')::bigint;
    NEW.created_at := (original->>'created_at')::timestamptz;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.preserve_archived_snapshot_write() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preserve_archived_snapshot_write() TO service_role;

DROP TRIGGER IF EXISTS preserve_archived_snapshot_write ON public.price_snapshots;
CREATE TRIGGER preserve_archived_snapshot_write BEFORE INSERT ON public.price_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.preserve_archived_snapshot_write();
DROP TRIGGER IF EXISTS preserve_archived_snapshot_write ON public.hourly_price_snapshots;
CREATE TRIGGER preserve_archived_snapshot_write BEFORE INSERT ON public.hourly_price_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.preserve_archived_snapshot_write();
COMMIT;
