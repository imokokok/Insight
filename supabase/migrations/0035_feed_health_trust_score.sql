-- Migration 0035: Oracle Watch composite trust score
--
-- Extends feed_health_snapshots (migration 0034) with the machine-gateable
-- credibility rating: a composite 0-100 trust score + discrete level + a
-- quorum flag. These let a dependent agent gate on one number instead of
-- parsing the rule verdict and advisory signals separately. Same composite
-- semantics as src/lib/api/services/oracleWatchTrust.ts (ensures the 30-min
-- spine, the live point signal and the historical backfill all agree).
--
-- Created independently of the existing populating jobs; null until the next
-- oracle-watch-collect run writes new rows (backfill also backfills these).

BEGIN;

ALTER TABLE "public"."feed_health_snapshots"
    ADD COLUMN IF NOT EXISTS "quorum_satisfied" boolean;
ALTER TABLE "public"."feed_health_snapshots"
    ADD COLUMN IF NOT EXISTS "trust_score" double precision;
ALTER TABLE "public"."feed_health_snapshots"
    ADD COLUMN IF NOT EXISTS "trust_level" text;

COMMENT ON COLUMN "public"."feed_health_snapshots"."quorum_satisfied"
    IS 'True when >= 3 independent providers are responding (QUORUM_MIN).';
COMMENT ON COLUMN "public"."feed_health_snapshots"."trust_score"
    IS 'Composite 0-100 credibility rating (higher = more trustworthy).';
COMMENT ON COLUMN "public"."feed_health_snapshots"."trust_level"
    IS 'Discrete credibility gate (low/medium/high) derived from trust_score.';

CREATE INDEX IF NOT EXISTS "feed_health_snapshots_trust_idx"
    ON "public"."feed_health_snapshots" USING "btree" ("trust_level", "evaluated_at" DESC);

COMMIT;