import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PGlite } from '@electric-sql/pglite';

test('market-reference rights gate quarantines legacy CEX rows and records delivery limits', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE TABLE public.market_reference_snapshots (
        snapshot_ts timestamptz NOT NULL,
        symbol text NOT NULL,
        quote text NOT NULL DEFAULT 'USD',
        exchange text NOT NULL,
        ref_price double precision,
        volume double precision,
        bid_ask_spread_pct double precision,
        data_age_seconds integer,
        is_success boolean NOT NULL
      );
      INSERT INTO public.market_reference_snapshots
        (snapshot_ts,symbol,exchange,ref_price,volume,bid_ask_spread_pct,data_age_seconds,is_success)
      VALUES (date_trunc('hour', now()),'ETH','legacy-venue',2000,10,0.1,1,true);
    `);

    const migration = await readFile(
      new URL('../../supabase/migrations/0090_market_reference_rights_gate.sql', import.meta.url),
      'utf8'
    );
    await db.exec(migration);

    const deliveryMigration = await readFile(
      new URL(
        '../../supabase/migrations/0093_market_reference_delivery_policy.sql',
        import.meta.url
      ),
      'utf8'
    );
    await db.exec(deliveryMigration);

    const legacy = (
      await db.query(
        `SELECT rights_scope, rights_reference, delivery_policy
         FROM public.market_reference_snapshots WHERE exchange='legacy-venue'`
      )
    ).rows[0];
    assert.deepEqual(legacy, {
      rights_scope: 'research-quarantined',
      rights_reference: null,
      delivery_policy: 'not-authorized',
    });
    assert.deepEqual(
      (
        await db.query(
          `SELECT * FROM public.market_reference_hourly WHERE symbol='ETH' AND ref_hour=date_trunc('hour', now())`
        )
      ).rows,
      []
    );

    await db.exec(`
      INSERT INTO public.market_reference_snapshots
        (snapshot_ts,symbol,exchange,ref_price,volume,bid_ask_spread_pct,data_age_seconds,is_success,rights_scope,rights_reference,delivery_policy)
      VALUES
        (date_trunc('hour', now()),'ETH','vendor-one',2001,10,0.1,1,true,'vendor-licensed','agreement-001','derived-analytics-only'),
        (date_trunc('hour', now()),'ETH','vendor-two',1999,12,0.2,1,true,'vendor-licensed','agreement-002','raw-data-permitted');
    `);

    const hourly = (
      await db.query(
        `SELECT exchange_count, ref_price FROM public.market_reference_hourly
         WHERE symbol='ETH' AND ref_hour=date_trunc('hour', now())`
      )
    ).rows[0];
    assert.equal(Number(hourly.exchange_count), 2);
    assert.equal(Number(hourly.ref_price), 2000);
    assert.equal(
      (await db.query(`SELECT * FROM public.get_latest_market_reference('eth')`)).rows.length,
      1
    );
    await assert.rejects(
      db.exec(`
        INSERT INTO public.market_reference_snapshots
          (snapshot_ts,symbol,exchange,ref_price,is_success,rights_scope,rights_reference,delivery_policy)
        VALUES (date_trunc('hour', now()),'ETH','invalid-vendor',2000,true,'vendor-licensed','agreement-003','not-authorized');
      `)
    );
  } finally {
    await db.close();
  }
});
