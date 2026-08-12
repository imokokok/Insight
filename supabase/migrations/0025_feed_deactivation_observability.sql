-- Migration 0025: Feed deactivation observability + graceful pruning support
--
-- Context: the discover pass previously bulk-deactivated every active feed
-- that did not reappear in a discovery run (deactivateOracleFeeds), without
-- recording *why* or re-verifying it. A single flaky discovery run therefore
-- killed live feeds (e.g. 233 API3 feeds wiped in one batch). This migration
-- makes the lifecycle auditable and lets the discover pass reconcile (re-verify)
-- absent feeds instead of blindly killing them.
--
-- New columns on oracle_feeds:
--   deactivated_reason      why a feed was turned off
--                           ('discover_pruned' | 'health_failed' | 'manual')
--   deactivated_at          when it was turned off
--   absent_discovery_runs   consecutive discover passes where the feed was missing
--   last_discovery_at       last time discovery confirmed the feed is still present
--
-- Idempotent: safe to re-run (ADD COLUMN IF NOT EXISTS + guarded constraint).

BEGIN;

ALTER TABLE "public"."oracle_feeds"
  ADD COLUMN IF NOT EXISTS "deactivated_reason" text,
  ADD COLUMN IF NOT EXISTS "deactivated_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "absent_discovery_runs" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_discovery_at" timestamptz;

-- Constrain deactivated_reason to the known set. NULL is allowed (feed never
-- deactivated, or legacy rows written before this migration).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'oracle_feeds_deactivated_reason_check'
      AND conrelid = 'public.oracle_feeds'::regclass
  ) THEN
    ALTER TABLE "public"."oracle_feeds"
      ADD CONSTRAINT "oracle_feeds_deactivated_reason_check"
      CHECK (
        "deactivated_reason" IS NULL
        OR "deactivated_reason" IN ('discover_pruned', 'health_failed', 'manual')
      );
  END IF;
END $$;

COMMENT ON COLUMN "public"."oracle_feeds"."deactivated_reason" IS
  'Why a feed was deactivated: discover_pruned (absent from discovery after re-verify), health_failed (>=3 consecutive failures), manual.';
COMMENT ON COLUMN "public"."oracle_feeds"."deactivated_at" IS
  'Timestamp the feed was last deactivated.';
COMMENT ON COLUMN "public"."oracle_feeds"."absent_discovery_runs" IS
  'Consecutive discover passes where the feed was missing upstream; reset to 0 when rediscovered or re-verified.';
COMMENT ON COLUMN "public"."oracle_feeds"."last_discovery_at" IS
  'Last time discovery confirmed the feed is still present upstream.';

COMMIT;
