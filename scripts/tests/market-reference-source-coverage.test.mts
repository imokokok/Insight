import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('market-reference hourly rollups count independent exchanges, not ticker rows', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE TABLE public.market_reference_snapshots (
        snapshot_ts timestamptz NOT NULL,
        symbol text NOT NULL,
        exchange text NOT NULL,
        ref_price double precision,
        volume double precision,
        bid_ask_spread_pct double precision,
        data_age_seconds integer,
        is_success boolean NOT NULL
      );
    `);

    const migration = await readFile(
      new URL(
        '../../supabase/migrations/0086_market_reference_source_coverage.sql',
        import.meta.url
      ),
      'utf8'
    );
    await db.exec(migration);

    const sourceTimestampsMigration = await readFile(
      new URL(
        '../../supabase/migrations/0087_market_reference_source_timestamps.sql',
        import.meta.url
      ),
      'utf8'
    );
    await db.exec(sourceTimestampsMigration);

    await db.exec(`
      INSERT INTO public.market_reference_snapshots
        (snapshot_ts,symbol,exchange,ref_price,volume,bid_ask_spread_pct,data_age_seconds,is_success)
      SELECT date_trunc('hour', now()) + (sample.n * interval '15 minutes'),
        'WBTC','kraken',100 + sample.n * 10,100 + sample.n * 100,
        0.1 + sample.n * 0.2,2,true
      FROM generate_series(0,3) AS sample(n);

      INSERT INTO public.market_reference_snapshots
        (snapshot_ts,symbol,exchange,ref_price,volume,bid_ask_spread_pct,data_age_seconds,is_success)
      SELECT date_trunc('hour', now()) + (sample.n * interval '15 minutes'),
        'WBTC','crypto.com',200 + sample.n * 10,10 + sample.n * 10,
        2 + sample.n * 2,3,true
      FROM generate_series(0,3) AS sample(n);

      INSERT INTO public.market_reference_snapshots
        (snapshot_ts,symbol,exchange,ref_price,volume,bid_ask_spread_pct,data_age_seconds,is_success)
      VALUES (date_trunc('hour', now()),'WBTC','coinbase',84000,1000,0.01,1,false);
    `);

    const hourly = (
      await db.query(
        `SELECT exchange_count,ref_price,min_ref_price,max_ref_price,
          median_bid_ask_spread_pct,median_volume
         FROM public.market_reference_hourly
         WHERE symbol='WBTC' AND ref_hour=date_trunc('hour', now())`
      )
    ).rows[0];
    assert.ok(hourly);
    assert.equal(Number(hourly.exchange_count), 2);
    assert.equal(Number(hourly.ref_price), 165);
    assert.equal(Number(hourly.min_ref_price), 115);
    assert.equal(Number(hourly.max_ref_price), 215);
    assert.ok(Math.abs(Number(hourly.median_bid_ask_spread_pct) - 2.7) < 1e-12);
    assert.equal(Number(hourly.median_volume), 137.5);

    const latest = (
      await db.query(
        `SELECT exchange_count,ref_price,cross_exchange_spread_pct,
          median_bid_ask_spread_pct,median_volume
         FROM public.get_latest_market_reference('wbtc')`
      )
    ).rows[0];
    assert.ok(latest);
    assert.equal(Number(latest.exchange_count), 2);
    assert.equal(Number(latest.ref_price), 165);
    assert.equal(Number(latest.cross_exchange_spread_pct), ((215 - 115) / 215) * 100);
    assert.ok(Math.abs(Number(latest.median_bid_ask_spread_pct) - 2.7) < 1e-12);
    assert.equal(Number(latest.median_volume), 137.5);

    await db.exec(`
      INSERT INTO public.market_reference_snapshots
        (snapshot_ts,symbol,exchange,ref_price,volume,bid_ask_spread_pct,
         data_age_seconds,is_success,source_observed_at)
      VALUES
        (date_trunc('hour', now()),'BTC','bitstamp',84000,100,0.1,1,true,now()),
        (date_trunc('hour', now()),'BTC','bitfinex',84100,120,0.2,1,true,now());
    `);

    const sourceRows = (
      await db.query(
        `SELECT exchange,source_observed_at
         FROM public.market_reference_snapshots WHERE symbol='BTC' ORDER BY exchange`
      )
    ).rows;
    assert.equal(sourceRows.length, 2);
    assert.deepEqual(
      sourceRows.map((row) => row.exchange),
      ['bitfinex', 'bitstamp']
    );
    assert.ok(sourceRows.every((row) => row.source_observed_at instanceof Date));

    const newVenueRollup = (
      await db.query(
        `SELECT exchange_count FROM public.market_reference_hourly
         WHERE symbol='BTC' AND ref_hour=date_trunc('hour', now())`
      )
    ).rows[0];
    assert.equal(Number(newVenueRollup.exchange_count), 2);

    const newVenueLatest = (
      await db.query(`SELECT exchange_count FROM public.get_latest_market_reference('btc')`)
    ).rows[0];
    assert.equal(Number(newVenueLatest.exchange_count), 2);

    await db.exec(`
      INSERT INTO public.market_reference_snapshots
        (snapshot_ts,symbol,exchange,ref_price,volume,bid_ask_spread_pct,
         data_age_seconds,is_success,source_observed_at)
      VALUES
        (date_trunc('hour', now()),'WBTC','binance',84050,25,0.15,1,true,now());
    `);

    const wbtcThreeVenueRollup = (
      await db.query(
        `SELECT exchange_count FROM public.market_reference_hourly
         WHERE symbol='WBTC' AND ref_hour=date_trunc('hour', now())`
      )
    ).rows[0];
    assert.equal(Number(wbtcThreeVenueRollup.exchange_count), 3);

    const wbtcThreeVenueLatest = (
      await db.query(`SELECT exchange_count FROM public.get_latest_market_reference('wbtc')`)
    ).rows[0];
    assert.equal(Number(wbtcThreeVenueLatest.exchange_count), 3);

    const binanceSourceTimestamp = (
      await db.query(
        `SELECT source_observed_at FROM public.market_reference_snapshots
         WHERE symbol='WBTC' AND exchange='binance'`
      )
    ).rows[0];
    assert.ok(binanceSourceTimestamp.source_observed_at instanceof Date);
  } finally {
    await db.close();
  }
});
