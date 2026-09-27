import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('resource migration preserves probe multiplicity, source identity and complete historical aggregates', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE oracle_feeds(provider text,symbol text,chain_id integer,
        consecutive_failures integer,last_success_at timestamptz,last_failure_at timestamptz,updated_at timestamptz);
      CREATE TABLE price_records(provider text,symbol text,chain text,timestamp timestamptz);
      CREATE TABLE hourly_price_snapshots(snapshot_hour timestamptz,symbol text,price numeric,deviation_pct numeric,is_success boolean);
      GRANT SELECT,UPDATE ON oracle_feeds TO service_role;
      GRANT SELECT ON hourly_price_snapshots TO service_role;
      INSERT INTO oracle_feeds VALUES
        ('api3','BTC/USD',1,9,NULL,NULL,NULL),('redstone','ETH',0,4,NULL,NULL,NULL),
        ('api3','BTC',1,7,NULL,NULL,NULL),('api3','BTC/USD',8453,8,NULL,NULL,NULL);
    `);
    const original = await readFile(
      new URL('../../supabase/migrations/0004_functions.sql', import.meta.url),
      'utf8'
    );
    const start = original.indexOf(
      'CREATE OR REPLACE FUNCTION "public"."batch_update_feed_health"'
    );
    await db.exec(original.slice(start, original.indexOf('ALTER FUNCTION', start)));
    const payload = {
      successes: [
        { provider: 'api3', symbol: 'BTC/USD', chainId: 1 },
        { provider: 'api3', symbol: 'BTC/USD', chainId: 1 },
      ],
      failures: [
        { provider: 'api3', symbol: 'BTC/USD', chainId: 1 },
        { provider: 'api3', symbol: 'BTC/USD', chainId: 1 },
        { provider: 'redstone', symbol: 'ETH', chainId: 0 },
        { provider: 'missing', symbol: 'ETH', chainId: 0 },
      ],
    };
    const seed = (await db.query('SELECT * FROM oracle_feeds ORDER BY provider,symbol,chain_id'))
      .rows;
    const oldCount = (
      await db.query('SELECT batch_update_feed_health($1::jsonb) AS n', [JSON.stringify(payload)])
    ).rows;
    const oldRows = (
      await db.query(
        'SELECT provider,symbol,chain_id,consecutive_failures,last_success_at IS NOT NULL AS succeeded,last_failure_at IS NOT NULL AS failed FROM oracle_feeds ORDER BY provider,symbol,chain_id'
      )
    ).rows;
    await db.exec('TRUNCATE oracle_feeds');
    for (const row of seed)
      await db.query('INSERT INTO oracle_feeds VALUES($1,$2,$3,$4,NULL,NULL,NULL)', [
        row.provider,
        row.symbol,
        row.chain_id,
        row.consecutive_failures,
      ]);
    const migration = await readFile(
      new URL('../../supabase/migrations/0063_resource_efficiency.sql', import.meta.url),
      'utf8'
    );
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual(
      (await db.query('SELECT batch_update_feed_health($1::jsonb) AS n', [JSON.stringify(payload)]))
        .rows,
      oldCount
    );
    assert.deepEqual(
      (
        await db.query(
          'SELECT provider,symbol,chain_id,consecutive_failures,last_success_at IS NOT NULL AS succeeded,last_failure_at IS NOT NULL AS failed FROM oracle_feeds ORDER BY provider,symbol,chain_id'
        )
      ).rows,
      oldRows
    );
    assert.deepEqual(
      (await db.query('SELECT batch_update_feed_health($1::jsonb) AS n', [JSON.stringify({})]))
        .rows,
      [{ n: 0 }]
    );
    await db.exec(`
      INSERT INTO hourly_price_snapshots
      SELECT date_trunc('hour',now()) - interval '1 hour','ETH',v,CASE WHEN v=1 THEN NULL ELSE -0.2 END,true
        FROM generate_series(1,1201) v;
      INSERT INTO hourly_price_snapshots VALUES
        (date_trunc('hour',now()),'ETH',5000,10,true),
        (date_trunc('hour',now())-interval '2 hours','ETH',0,10,true),
        (date_trunc('hour',now())-interval '2 hours','ETH',100,10,false),
        (date_trunc('hour',now())-interval '3 hours','ETH',100,-0.4,true),
        (date_trunc('hour',now())-interval '3 hours','ETH',200,NULL,true),
        (date_trunc('hour',now())-interval '40 hours','ETH',900,50,true);
    `);
    const rows = (
      await db.query(
        `SELECT * FROM get_oracle_history_baseline('eth',now()-interval '30 hours',date_trunc('hour',now()))`
      )
    ).rows;
    assert.equal(rows.length, 2);
    assert.equal(Number(rows[0].participant_count), 2);
    assert.equal(rows[0].consensus_price, 150);
    assert.equal(rows[0].max_deviation_pct, 0.4);
    assert.equal(Number(rows[1].participant_count), 1201);
    assert.equal(rows[1].consensus_price, 601);
    for (const role of ['anon', 'authenticated']) {
      const privileges = (
        await db.query(
          `SELECT
        has_function_privilege($1,'get_oracle_history_baseline(text,timestamptz,timestamptz)','EXECUTE') AS history,
        has_function_privilege($1,'batch_update_feed_health(jsonb)','EXECUTE') AS health`,
          [role]
        )
      ).rows[0];
      assert.deepEqual(privileges, { history: false, health: false });
    }
    await db.exec('SET ROLE service_role');
    assert.equal(
      (
        await db.query(
          `SELECT * FROM get_oracle_history_baseline('ETH',now()-interval '30 hours',date_trunc('hour',now()))`
        )
      ).rows.length,
      2
    );
    assert.equal(
      (await db.query('SELECT batch_update_feed_health($1::jsonb) AS n', [JSON.stringify(payload)]))
        .rows.length,
      1
    );
  } finally {
    await db.close();
  }
});
