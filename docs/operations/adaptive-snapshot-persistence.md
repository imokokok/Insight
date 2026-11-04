# Adaptive fine-grained snapshot persistence

The snapshot collector still probes every active report feed every 15 minutes.
This policy changes only how often an unchanged result is appended to
`price_snapshots`; it does not reduce feed-health checks, alerts, hourly report
inputs, or the realtime collection cadence.

## Retention policy

`price_snapshot_persistence_policies` is the source of truth. The
`__default__` row is `adaptive`; symbols with an explicit `full` row persist
every 15-minute observation.

The seeded full-resolution set is BTC, ETH, SOL, BNB, XRP, ADA, DOGE, LINK,
USDC, USDT, DAI, WBTC, CBBTC, TBTC, STETH, WSTETH, and CBETH. The DeFi
collateral/borrow assets currently use the adaptive default. New symbols also
start adaptive until deliberately promoted.

An adaptive row is persisted when any of the following is true:

- It is the first observed row for a feed.
- Its success/failure state changes, or a failed row's error changes.
- It is the first observation in a new UTC hour.
- Its price moves by at least 25 basis points from the last persisted row.
- Its consensus deviation changes by at least 10 basis points.
- Its data age changes by at least 300 seconds, or confidence changes by at
  least 0.05.

Repeated unchanged failures are stored at the hourly baseline rather than once
per 15-minute poll. Feed-health state itself still records failures immediately,
so automatic deactivation and recovery remain responsive.

## Auditing and operations

`price_snapshot_collection_runs` contains one idempotent ledger row per
scheduled slot. It records how many candidate rows were written by reason and
how many stable observations were intentionally skipped. A retry with the same
canonical input returns the existing ledger result; a different payload for an
already-recorded slot fails loudly.

Use the ledger—not raw-row counts alone—to confirm that the collector observed
the expected feed population:

```sql
SELECT
  date_trunc('day', snapshot_ts) AS day,
  sum(received_count) AS received,
  sum(persisted_count) AS persisted,
  sum(stable_skipped_count) AS stable_skipped
FROM public.price_snapshot_collection_runs
WHERE snapshot_ts >= now() - interval '14 days'
GROUP BY 1
ORDER BY 1 DESC;
```

To promote a symbol to complete 15-minute history, update its policy instead of
changing application code:

```sql
INSERT INTO public.price_snapshot_persistence_policies (policy_key, resolution)
VALUES ('AAVE', 'full')
ON CONFLICT (policy_key) DO UPDATE
SET resolution = EXCLUDED.resolution,
    updated_at = now();
```

To return it to the default adaptive behavior, delete its symbol-specific row;
never delete `__default__`.

The policy tables are not exposed to anonymous or authenticated application
roles. Use an authorized administrative SQL session, and change one policy at a
time so the effect is visible in the next collection ledger entry.
