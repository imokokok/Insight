import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('feed cadence refresh uses hot snapshots for 48 hours and history for longer windows', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE public.oracle_feeds (
        provider text NOT NULL, symbol text NOT NULL, chain_id integer NOT NULL,
        is_active boolean NOT NULL, observed_data_age_p90_s integer,
        observed_cadence_updated_at timestamptz,
        PRIMARY KEY (provider, symbol, chain_id)
      );
      CREATE TABLE public.price_snapshots (
        provider text NOT NULL, symbol text NOT NULL, chain_id integer NOT NULL,
        snapshot_ts timestamptz NOT NULL, data_age_seconds integer
      );
      CREATE TABLE public.archived_price_snapshots
        (LIKE public.price_snapshots INCLUDING ALL);
      CREATE VIEW public.price_snapshot_history AS
        SELECT *, (snapshot_ts AT TIME ZONE 'UTC')::date AS archive_day
          FROM public.price_snapshots
        UNION ALL
        SELECT *, (snapshot_ts AT TIME ZONE 'UTC')::date AS archive_day
          FROM public.archived_price_snapshots;
      INSERT INTO public.oracle_feeds(provider,symbol,chain_id,is_active)
      VALUES ('chainlink','ETH',1,true), ('chainlink','BTC',1,true),
        ('dia','ETH',1,true), ('chainlink','SOL',1,false);
      INSERT INTO public.price_snapshots
        SELECT 'chainlink','ETH',1,now()-v*interval '1 hour',v*10
        FROM generate_series(1,12) v;
      INSERT INTO public.price_snapshots
        SELECT 'chainlink','BTC',1,now()-v*interval '1 hour',v*10
        FROM generate_series(1,3) v;
      INSERT INTO public.price_snapshots
        SELECT 'dia','ETH',1,now()-v*interval '1 hour',v*10
        FROM generate_series(1,12) v;
      INSERT INTO public.archived_price_snapshots VALUES
        ('chainlink','ETH',1,now()-interval '8 days',5000),
        ('chainlink','ETH',1,now()-interval '1 hour',10000);
    `);

    const migration = await readFile(
      new URL('../../supabase/migrations/0072_feed_cadence_live_window.sql', import.meta.url),
      'utf8'
    );
    await db.exec(migration);
    await db.exec(migration);

    const short = (
      await db.query('SELECT * FROM public.refresh_oracle_feed_cadence_baselines(48,12)')
    ).rows[0];
    assert.deepEqual(short, { updated_count: 3, scanned_count: 3 });
    const rows = (
      await db.query(`SELECT provider,symbol,observed_data_age_p90_s AS p90,
        observed_cadence_updated_at IS NOT NULL AS refreshed
        FROM public.oracle_feeds ORDER BY provider,symbol`)
    ).rows;
    assert.deepEqual(rows, [
      { provider: 'chainlink', symbol: 'BTC', p90: null, refreshed: true },
      { provider: 'chainlink', symbol: 'ETH', p90: 109, refreshed: true },
      { provider: 'chainlink', symbol: 'SOL', p90: null, refreshed: false },
      { provider: 'dia', symbol: 'ETH', p90: null, refreshed: true },
    ]);

    await db.query('SELECT * FROM public.refresh_oracle_feed_cadence_baselines(120,12)');
    assert.equal(
      (
        await db.query(`SELECT observed_data_age_p90_s AS p90 FROM public.oracle_feeds
          WHERE provider='chainlink' AND symbol='ETH'`)
      ).rows[0].p90,
      109
    );

    await db.query('SELECT * FROM public.refresh_oracle_feed_cadence_baselines(121,12)');
    const long = (
      await db.query(`SELECT observed_data_age_p90_s AS p90 FROM public.oracle_feeds
        WHERE provider='chainlink' AND symbol='ETH'`)
    ).rows[0];
    assert.ok(Number(long.p90) > 109);

    await db.query('SELECT * FROM public.refresh_oracle_feed_cadence_baselines(240,12)');
    assert.equal(
      (
        await db.query(`SELECT observed_data_age_p90_s AS p90 FROM public.oracle_feeds
          WHERE provider='chainlink' AND symbol='ETH'`)
      ).rows[0].p90,
      3536
    );

    for (const role of ['anon', 'authenticated']) {
      assert.equal(
        (
          await db.query(
            `SELECT has_function_privilege($1,
              'public.refresh_oracle_feed_cadence_baselines(integer,integer)',
              'EXECUTE') AS allowed`,
            [role]
          )
        ).rows[0].allowed,
        false
      );
    }
    assert.equal(
      (
        await db.query(`SELECT has_function_privilege('service_role',
          'public.refresh_oracle_feed_cadence_baselines(integer,integer)',
          'EXECUTE') AS allowed`)
      ).rows[0].allowed,
      true
    );
  } finally {
    await db.close();
  }
});
