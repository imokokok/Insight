-- Migration 0043: free-tier compute routing + bounded snapshot retention
--
-- Expensive network/background work now runs directly in GitHub Actions:
--   - reputation calculation: .github/workflows/reputation-cron.yml
--   - feed cadence baselines: .github/workflows/feed-cadence-cron.yml
-- The authenticated HTTP routes remain available for manual recovery, but
-- Supabase must no longer call them automatically through pg_net.
--
-- Fine-grained public history is capped at 90 days and the ML lookback is 8
-- weeks, so 120 days preserves every current product capability while keeping
-- headroom below the Supabase free-plan database-size ceiling.
--
-- ROLLOUT GATE: deploy the two workflow files first and confirm at least three
-- consecutive reputation runs plus one feed-cadence run. Apply this migration
-- only after that check; it is the intentional cutover that disables pg_net.

BEGIN;

-- Remove external HTTP/background compute from the database scheduler.
SELECT cron.unschedule('reputation-fetch-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reputation-fetch-hourly');

-- calculateAndStore() already calls aggregate_oracle_reputation_v4 for every
-- provider after inserting the new samples, so the legacy second aggregation
-- at :30 is redundant.
SELECT cron.unschedule('reputation-recalculate-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reputation-recalculate-hourly');

SELECT cron.unschedule('feed-cadence-baselines')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'feed-cadence-baselines');

-- Bound the two high-volume price tables to 120 days.
SELECT cron.unschedule('price-snapshots-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-snapshots-cleanup');
SELECT cron.schedule('price-snapshots-cleanup', '30 4 * * *', $$
  DELETE FROM public.price_snapshots
  WHERE snapshot_ts < now() - interval '120 days';
$$);

SELECT cron.unschedule('hourly-snapshots-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly-snapshots-cleanup');
SELECT cron.schedule('hourly-snapshots-cleanup', '0 4 * * *', $$
  DELETE FROM public.hourly_price_snapshots
  WHERE snapshot_hour < now() - interval '120 days';
$$);

-- Market-reference data has the same 90-day external-history requirement.
SELECT cron.unschedule('market-reference-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'market-reference-cleanup');
-- Stagger from price-snapshots-cleanup so the free database does not run two
-- high-volume deletes at once.
SELECT cron.schedule('market-reference-cleanup', '40 4 * * *', $$
  DELETE FROM public.market_reference_snapshots
  WHERE snapshot_ts < now() - interval '120 days';
$$);

COMMENT ON TABLE public.price_snapshots IS
  'Fine-grained (15-min) price snapshots for ML/anomaly detection. Lean numeric schema; 120-day retention via pg_cron. Populated by GitHub Actions snapshot-collect.';
COMMENT ON TABLE public.hourly_price_snapshots IS
  'Hourly price snapshots for reports, historical analysis, and ML. Bounded to 120 days by pg_cron.';
COMMENT ON TABLE public.market_reference_snapshots IS
  'Independent CEX market-reference snapshots for divergence analysis and training labels. Bounded to 120 days by pg_cron.';

COMMIT;
