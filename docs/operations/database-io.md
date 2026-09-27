# Database I/O optimization

## Evidence and changes

The September 27, 2026 investigation of project `naevwrexybqodxinkrug` found
3,808,444,416 cumulative temporary-file bytes across 1,003 temporary files.
Database buffer statistics were 131,435,316 hits and 45,659 reads. These are
cumulative counters with an unknown reset time, not daily usage or a forecast.

Historical training queries sorted by symbol and used offset pagination;
the hourly variant also requested exact counts repeatedly. Their retained
query statistics reported 416,696 and 42,952 temporary blocks written.
The current trainer already uses a fixed eight-week window and a
`(timestamp,id)` cursor. Migration `0062` supplies matching partial indexes for
successful fine-grained and hourly samples, plus a covering symbol/hour index
for the live temporal-feature query. No collection schedule or retention period
changes. The additional indexes consume storage and maintenance writes in
exchange for fewer repeated scans and sorts.

The market-reference hot path previously grouped all retained observations for
one symbol before returning its latest hour. `get_latest_market_reference`
finds the most recent usable hour within the existing three-hour freshness bound
and aggregates only that hour. The historical `market_reference_hourly` view
remains available to training and outcome evaluation.

The application shares concurrent requests for the same symbol, caches usable
references for 60 seconds and missing/error results for 15 seconds, and checks
freshness on every cache hit. RPC calls have a 10-second deadline. Malformed
responses, stale references and mismatched symbols return absent evidence.
Caches are per process; they do not coalesce requests across Vercel instances.

## Production verification

Migration `0062` was applied and recorded on September 27, 2026 (Beijing time),
with a two-second lock timeout and 30-second statement timeout. Four production
assets (`ETH`, `BTC`, `USDC`, `USDT`) returned identical new/old rollup values
inside the usable window.

One ETH query sample before the change aggregated 9,598 observations into 2,826
hourly groups, accessed 647 cached blocks and took 855.111 ms. A subsequent
new-RPC sample took 43.236 ms including function overhead. The expanded new
query aggregated nine observations, accessed 12 cached blocks and took
5.571 ms. Timing samples were taken separately on a throttled shared workload;
they establish bounded execution, not a guaranteed latency or overall I/O
reduction percentage.

A representative 1,000-row training page used
`price_snapshots_success_cursor_idx`, had no Sort node, and wrote zero temporary
blocks. Check later production intervals for reductions in temporary bytes,
query calls, execution time and the Supabase Disk I/O budget. Do not reset the
production counters just to manufacture a comparison.

## Validation and release

Run `npm run test:reliability` for actual Postgres SQL parity and permission
checks, and the market-reference client tests for concurrency, negative-cache
expiry, freshness boundaries and malformed responses. Rebuild the checked-in
cron bundles with `npm run build:cron` whenever this client changes.

Apply `0062` before releasing its client. Publish the application and cron
bundles through the existing validated main-branch release workflow. If an
application rollback is needed, the previous client still reads the preserved
historical view; additive indexes and the new function can stay in place.
