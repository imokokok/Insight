-- Migration 0130: atomic per-API-key concurrency caps for the 24h products.
--
-- A $0.50 monitored window and a $0.55 lifecycle are flat-priced, so the
-- in-window work must be bounded or the flat price becomes an unlimited cost
-- commitment. The application enforces the same numbers before writing
-- (src/lib/api/services/productLimits.ts):
--
--   * 5 open monitored windows per API key
--   * 3 open lifecycles per API key
--
-- Those pre-checks give a friendly 429, but two concurrent purchases can both
-- read "4 open" and both insert. These triggers close that race by taking a
-- per-key transaction advisory lock and re-counting inside the insert
-- transaction. The lifecycle bundle's embedded window counts toward the window
-- cap because it is a real oracle_watch_windows row.
--
-- Rows whose expires_at has passed no longer occupy a slot even while status
-- stays 'active' (expiry is derived, see 0116/0117).
--
-- Refusal contract: RAISE EXCEPTION with message prefix
-- 'product_concurrency_limit', mapped by the service layer to HTTP 429. The
-- response carries scope/limit/current and a hint but NO Retry-After: a slot
-- frees only when the caller closes a window/lifecycle or it expires, so a
-- timer-based header would be a false promise.

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_product_window_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.api_key_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('product-window-cap:' || NEW.api_key_id::text, 0)
  );

  SELECT count(*) INTO active_count
  FROM public.oracle_watch_windows
  WHERE api_key_id = NEW.api_key_id
    AND status = 'active'
    AND expires_at > now();

  IF active_count >= 5 THEN
    RAISE EXCEPTION 'product_concurrency_limit: open_windows limit 5 reached for api key %', NEW.api_key_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_product_window_cap ON public.oracle_watch_windows;
CREATE TRIGGER enforce_product_window_cap
  BEFORE INSERT ON public.oracle_watch_windows
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_window_cap();

CREATE OR REPLACE FUNCTION public.enforce_product_lifecycle_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.api_key_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('product-lifecycle-cap:' || NEW.api_key_id::text, 0)
  );

  SELECT count(*) INTO active_count
  FROM public.position_lifecycles
  WHERE api_key_id = NEW.api_key_id
    AND status = 'active'
    AND expires_at > now();

  IF active_count >= 3 THEN
    RAISE EXCEPTION 'product_concurrency_limit: open_lifecycles limit 3 reached for api key %', NEW.api_key_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_product_lifecycle_cap ON public.position_lifecycles;
CREATE TRIGGER enforce_product_lifecycle_cap
  BEFORE INSERT ON public.position_lifecycles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_lifecycle_cap();

COMMENT ON FUNCTION public.enforce_product_window_cap() IS
  'Rejects the 6th concurrent open 24h monitored window per API key; pairs with productLimits.ts and returns a 429-mappable product_concurrency_limit error.';
COMMENT ON FUNCTION public.enforce_product_lifecycle_cap() IS
  'Rejects the 4th concurrent open 24h position lifecycle per API key; pairs with productLimits.ts and returns a 429-mappable product_concurrency_limit error.';

COMMIT;
