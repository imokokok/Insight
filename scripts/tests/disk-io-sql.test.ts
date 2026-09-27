import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PGlite } from '@electric-sql/pglite';

test('latest market reference matches historical rollup while bounding reads and permissions', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE price_snapshots(id bigint, snapshot_ts timestamptz, is_success boolean);
      CREATE TABLE hourly_price_snapshots(id bigint, snapshot_hour timestamptz, symbol text,
        price numeric, deviation_pct numeric, is_success boolean);
      CREATE TABLE market_reference_snapshots(symbol text, snapshot_ts timestamptz,
        ref_price double precision, is_success boolean, bid_ask_spread_pct double precision,
        volume double precision, data_age_seconds integer);
      GRANT SELECT ON market_reference_snapshots TO service_role;
    `);
    const original = await readFile(
      new URL(
        '../../supabase/migrations/0052_ml_data_flywheel_and_market_context.sql',
        import.meta.url
      ),
      'utf8'
    );
    await db.exec(
      original.slice(original.indexOf('CREATE OR REPLACE VIEW'), original.indexOf('ALTER VIEW'))
    );
    const migration = await readFile(
      new URL('../../supabase/migrations/0062_reduce_snapshot_read_io.sql', import.meta.url),
      'utf8'
    );
    await db.exec(migration);
    // Applying twice is safe, including indexes and privileges.
    await db.exec(migration);
    await db.exec(`
      INSERT INTO market_reference_snapshots VALUES
        ('ETH', date_trunc('hour', now()) + interval '1 minute', 100, true, 0.1, 10, 1),
        ('ETH', date_trunc('hour', now()) + interval '2 minutes', 110, true, 0.3, 30, 1),
        ('ETH', date_trunc('hour', now()) + interval '3 minutes', 120, true, NULL, NULL, 1),
        ('ETH', date_trunc('hour', now()) + interval '4 minutes', 900, false, 5, 500, 1),
        ('ETH', date_trunc('hour', now()) + interval '5 minutes', 0, true, 5, 500, 1),
        ('ETH', now() - interval '20 days', 800, true, 5, 500, 1),
        ('BTC', date_trunc('hour', now()) - interval '1 hour', 60000, true, NULL, NULL, 1),
        ('SOL', date_trunc('hour', now()) - interval '3 hours', 20, true, 0.1, 10, 1);
    `);
    for (const symbol of ['ETH', 'BTC']) {
      const bounded = await db.query('SELECT * FROM get_latest_market_reference($1)', [
        symbol.toLowerCase(),
      ]);
      const old = await db.query(
        `SELECT symbol,ref_hour,ref_price,exchange_count,
        cross_exchange_spread_pct,median_bid_ask_spread_pct,median_volume
        FROM market_reference_hourly WHERE symbol=$1 ORDER BY ref_hour DESC LIMIT 1`,
        [symbol]
      );
      assert.deepEqual(bounded.rows, old.rows);
    }
    assert.deepEqual((await db.query("SELECT * FROM get_latest_market_reference('SOL')")).rows, []);
    assert.deepEqual(
      (await db.query("SELECT * FROM get_latest_market_reference('UNKNOWN')")).rows,
      []
    );
    const permissions = (
      await db.query(`SELECT
      has_function_privilege('anon', 'get_latest_market_reference(text)', 'EXECUTE') AS anon,
      has_function_privilege('authenticated', 'get_latest_market_reference(text)', 'EXECUTE') AS authenticated,
      has_function_privilege('service_role', 'get_latest_market_reference(text)', 'EXECUTE') AS service`)
    ).rows[0];
    assert.deepEqual(permissions, { anon: false, authenticated: false, service: true });
    await db.exec('SET ROLE service_role');
    assert.equal(
      (await db.query("SELECT * FROM get_latest_market_reference('ETH')")).rows.length,
      1
    );
  } finally {
    await db.close();
  }
});
