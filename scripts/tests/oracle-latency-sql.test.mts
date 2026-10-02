import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('latency RPC aggregates complete 15-minute history across hot and archived rows', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE price_snapshots (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        snapshot_ts timestamptz NOT NULL, snapshot_hour timestamptz NOT NULL,
        provider text NOT NULL, symbol text NOT NULL, chain_id integer NOT NULL,
        price numeric, latency_ms integer, data_age_seconds integer, is_success boolean NOT NULL,
        created_at timestamptz DEFAULT now()
      );
      CREATE TABLE hourly_price_snapshots (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        snapshot_hour timestamptz NOT NULL, provider text NOT NULL,
        symbol text NOT NULL, chain_id integer NOT NULL,
        price numeric, latency_ms integer, data_age_seconds integer, is_success boolean NOT NULL,
        created_at timestamptz DEFAULT now()
      );
      CREATE TABLE oracle_feeds (
        provider text, symbol text, chain_id integer, is_active boolean,
        observed_data_age_p90_s integer, observed_cadence_updated_at timestamptz
      );
      GRANT SELECT ON price_snapshots,hourly_price_snapshots TO service_role;
    `);
    const archive = await readFile(
      new URL('../../supabase/migrations/0064_compressed_snapshot_history.sql', import.meta.url),
      'utf8'
    );
    const aggregate = await readFile(
      new URL('../../supabase/migrations/0074_aggregate_oracle_latency.sql', import.meta.url),
      'utf8'
    );
    await db.exec(archive);
    await db.exec(aggregate);
    await db.exec(aggregate);
    await db.exec(`
      INSERT INTO price_snapshots(snapshot_ts,snapshot_hour,provider,symbol,chain_id,price,latency_ms,is_success)
      SELECT day_start + v * interval '1 millisecond', day_start,
        'chainlink', 'ETH', 1, 3000, CASE WHEN v < 9900 THEN 10 ELSE 1000 END, true
      FROM generate_series(0,10000) v
      CROSS JOIN (SELECT (((now() AT TIME ZONE 'UTC')::date - 1)::timestamp AT TIME ZONE 'UTC') AS day_start) d;
      INSERT INTO price_snapshots(snapshot_ts,snapshot_hour,provider,symbol,chain_id,price,latency_ms,is_success)
      VALUES
        ((((now() AT TIME ZONE 'UTC')::date - 9)::timestamp AT TIME ZONE 'UTC'),
         (((now() AT TIME ZONE 'UTC')::date - 9)::timestamp AT TIME ZONE 'UTC'),
         'chainlink','ETH',1,0,2000,false),
        ((((now() AT TIME ZONE 'UTC')::date - 9)::timestamp AT TIME ZONE 'UTC') + interval '15 minutes',
         (((now() AT TIME ZONE 'UTC')::date - 9)::timestamp AT TIME ZONE 'UTC'),
         'api3','BTC',1,0,NULL,false);
      INSERT INTO hourly_price_snapshots(snapshot_hour,provider,symbol,chain_id,price,latency_ms,is_success)
      VALUES (date_trunc('hour',now()),'chainlink','ETH',1,3000,999999,true);
    `);
    await db.query("SELECT * FROM archive_snapshot_day((now() AT TIME ZONE 'UTC')::date - 9)");

    const from = (await db.query("SELECT ((now() AT TIME ZONE 'UTC')::date - 10)::text AS day"))
      .rows[0].day as string;
    const before = (await db.query("SELECT (now() AT TIME ZONE 'UTC')::date::text AS day")).rows[0]
      .day as string;
    const result = (
      await db.query('SELECT get_oracle_latency_statistics($1,$2) AS report', [from, before])
    ).rows[0].report as {
      rowsExamined: number;
      sampleSize: number;
      overall: { p50: number; p95: number; p99: number };
      entries: Array<{ provider: string; symbol: string; sampleSize: number; successRate: number }>;
    };
    assert.equal(result.rowsExamined, 10003);
    assert.equal(result.sampleSize, 10002);
    assert.deepEqual(result.overall, { p50: 10, p90: 10, p95: 10, p99: 1000 });
    assert.deepEqual(
      result.entries.map((entry) => [entry.provider, entry.symbol, entry.sampleSize]),
      [
        ['api3', 'BTC', 0],
        ['chainlink', 'ETH', 10002],
      ]
    );
    assert.ok(result.entries[1].successRate < 100);

    for (const role of ['anon', 'authenticated']) {
      assert.equal(
        (
          await db.query(
            "SELECT has_function_privilege($1,'get_oracle_latency_statistics(timestamptz,timestamptz,text,text)','EXECUTE') AS allowed",
            [role]
          )
        ).rows[0].allowed,
        false
      );
    }
    await db.exec('SET ROLE service_role');
    const filtered = (
      await db.query('SELECT get_oracle_latency_statistics($1,$2,$3,$4) AS report', [
        from,
        before,
        'api3',
        'BTC',
      ])
    ).rows[0].report as { rowsExamined: number; sampleSize: number; overall: unknown };
    assert.deepEqual(filtered, {
      rowsExamined: 1,
      sampleSize: 0,
      overall: null,
      entries: [
        {
          provider: 'api3',
          symbol: 'BTC',
          sampleSize: 0,
          successRate: 0,
          min: null,
          max: null,
          mean: null,
          p50: null,
          p90: null,
          p95: null,
          p99: null,
        },
      ],
    });
  } finally {
    await db.close();
  }
});
