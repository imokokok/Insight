import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PGlite } from '@electric-sql/pglite';

test('hourly snapshot writes preserve a repaired success without repeated updates', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE hourly_price_snapshots (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        snapshot_hour timestamptz NOT NULL,
        provider text NOT NULL,
        symbol text NOT NULL,
        chain_id integer NOT NULL,
        price numeric(24,8) NOT NULL,
        consensus_price numeric(24,8),
        deviation_pct numeric(10,4),
        latency_ms integer,
        data_age_seconds integer,
        confidence numeric(6,4),
        is_success boolean NOT NULL DEFAULT true,
        error_message text
      );
      CREATE UNIQUE INDEX hourly_price_snapshots_hour_provider_symbol_chain_uq
        ON hourly_price_snapshots(snapshot_hour,provider,symbol,chain_id);
      GRANT INSERT,UPDATE,SELECT ON hourly_price_snapshots TO service_role;
    `);

    const migration = await readFile(
      new URL('../../supabase/migrations/0099_sustain_nano_io_budget.sql', import.meta.url),
      'utf8'
    );
    const functionStart = migration.indexOf(
      'CREATE OR REPLACE FUNCTION public.upsert_hourly_price_snapshots'
    );
    const functionEnd = migration.indexOf('REVOKE ALL ON FUNCTION', functionStart);
    await db.exec(migration.slice(functionStart, functionEnd));
    await db.exec('SET ROLE service_role');

    const hour = '2026-10-25T13:00:00.000Z';
    const failed = JSON.stringify([
      {
        snapshot_hour: hour,
        provider: 'dia',
        symbol: 'ETH',
        chain_id: 1,
        price: 0,
        is_success: false,
        error_message: 'timeout',
      },
    ]);
    const success = JSON.stringify([
      {
        snapshot_hour: hour,
        provider: 'dia',
        symbol: 'ETH',
        chain_id: 1,
        price: 3210.5,
        consensus_price: 3210.5,
        latency_ms: 42,
        is_success: true,
      },
    ]);
    const laterSuccess = JSON.stringify([
      {
        snapshot_hour: hour,
        provider: 'dia',
        symbol: 'ETH',
        chain_id: 1,
        price: 3220.5,
        is_success: true,
      },
    ]);

    assert.deepEqual(
      (await db.query('SELECT upsert_hourly_price_snapshots($1::jsonb) AS written', [failed])).rows,
      [{ written: 1 }]
    );
    // A second failed probe cannot churn the existing evidence row.
    assert.deepEqual(
      (await db.query('SELECT upsert_hourly_price_snapshots($1::jsonb) AS written', [failed])).rows,
      [{ written: 0 }]
    );
    // A later success repairs the failed observation once.
    assert.deepEqual(
      (await db.query('SELECT upsert_hourly_price_snapshots($1::jsonb) AS written', [success]))
        .rows,
      [{ written: 1 }]
    );
    // Subsequent successful samples in the same hour are no-ops.
    assert.deepEqual(
      (await db.query('SELECT upsert_hourly_price_snapshots($1::jsonb) AS written', [laterSuccess]))
        .rows,
      [{ written: 0 }]
    );
    assert.deepEqual(
      (
        await db.query(
          'SELECT price::text,is_success,error_message,latency_ms FROM hourly_price_snapshots'
        )
      ).rows,
      [{ price: '3210.50000000', is_success: true, error_message: null, latency_ms: 42 }]
    );

    await assert.rejects(
      db.query('SELECT upsert_hourly_price_snapshots(\'{"not":"an array"}\'::jsonb)'),
      /batch array/
    );
  } finally {
    await db.close();
  }
});
