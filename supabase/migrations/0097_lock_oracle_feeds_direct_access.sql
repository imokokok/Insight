-- The public REST endpoint was being used to fetch large oracle_feeds pages
-- directly, bypassing Insight's authenticated, paginated application API.
-- That turns an inexpensive metadata read into unbounded Disk I/O on the Nano
-- database. All product reads use a service-role server client; browser-side
-- Supabase use is limited to Auth. Keep service-role access intact while
-- requiring external consumers to use /api/v1/feeds (API-key authenticated,
-- rate-limited, and bounded to paginated projections).

drop policy if exists oracle_feeds_read_all on public.oracle_feeds;

revoke all privileges on table public.oracle_feeds from anon, authenticated;
