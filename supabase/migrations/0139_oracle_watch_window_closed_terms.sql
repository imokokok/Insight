-- Migration 0139: tighten poll terms on already-closed Oracle Watch windows.
--
-- Numbering: 0138 is this branch's previous migration, production currently
-- ends at 0137, and no branch carried 0138/0139 at creation time, so 0139 is
-- the next free number.
--
-- Scope: only windows that are already closed or expired. A window that is
-- still valid keeps `poll_cap` exactly as purchased; reducing it would remove
-- polls the customer already paid for.
--
-- Live inventory at creation (2026-11-08 ~09:50 UTC): 11 rows exist, all with
-- status='closed', poll_count=0, poll_cap=300, min_poll_interval_seconds=30.
-- There were no active/valid windows. One row (5fba5e30-5528-4f49-b9e5-
-- 3f83b197dd79) has status='closed' but closed_at IS NULL; it still matches the
-- closed predicate and is included, because its status already ended the window.
--
-- Affected ids captured before the update (for rollback):
--   13633f0c-945e-48f2-b81d-5189bcd2aee5, 5fba5e30-5528-4f49-b9e5-3f83b197dd79,
--   042d8b3a-6e35-4a58-9254-a1ecfd6467a3, c9514258-6be0-4cb1-a301-878aa984130f,
--   3bfdec39-0635-4fba-91bb-a99ee614ef41, 46e6653f-0d67-4d4f-bfd8-697b9e83c343,
--   8bccceff-c18f-4552-ba79-5cdd72b78cba, 0e98382b-ef01-4421-9043-3ad990843380,
--   b7f573a4-c0da-4111-afde-6d700455d854, 9a878067-7eca-49f2-9bf8-e1f0f7f364a4,
--   97933e55-84a5-4cf2-adb0-05afee7ff2f5
--
-- Idempotent: a second run changes 0 rows.
--
-- Rollback: UPDATE the same ids back to poll_cap=300 and
-- min_poll_interval_seconds=30 (their values before this migration).

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

UPDATE public.oracle_watch_windows AS w
   SET poll_cap = 48,
       min_poll_interval_seconds = 1800
 WHERE (w.status IN ('closed', 'expired') OR w.expires_at < now())
   AND (w.poll_cap <> 48 OR w.min_poll_interval_seconds <> 1800);

COMMIT;
