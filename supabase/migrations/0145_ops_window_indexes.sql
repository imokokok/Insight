-- Migration 0145: index the /ops window aggregates on the Nano free tier.
--
-- The /ops console (and HealthStrip, which renders on EVERY /ops page) runs
-- 24h-window aggregates over api_key_usage and credit_ledger that filter and
-- order by created_at alone. Both tables only had (api_key_id, created_at)
-- leading-composite indexes (0003/0039/0126), so a query without an api_key_id
-- predicate cannot use them and degrades to a full sequential scan on every
-- render. On the Nano free tier (5 MB/s disk baseline — the 2026-11-12/13
-- IO-budget exhaustion incident, see migration 0144) that scan is exactly the
-- kind of residual read load the cutover to Turso did not remove, because /ops
-- is deliberately a Supabase-REST surface.
--
-- Companion code changes land in the same PR: pagedSelect now caps pages at
-- 50k rows and the window aggregates (getOverviewStats / getSigningIntegrity /
-- getApiUsage / getCreditUsage / getX402Ops) are TTL-cached for 60s with
-- in-flight dedup, so repeated renders no longer re-pay the read set.
--
-- Both indexes are plain btree builds inside a transaction: both tables are
-- small today (90d/retention-bounded windows, low external traffic), so
-- CONCURRENTLY is unnecessary ceremony; lock_timeout guards the write path.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE INDEX IF NOT EXISTS "idx_api_key_usage_created_at"
  ON "public"."api_key_usage" USING "btree" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_credit_ledger_created_at"
  ON "public"."credit_ledger" USING "btree" ("created_at");

ANALYZE "public"."api_key_usage";
ANALYZE "public"."credit_ledger";

COMMIT;
