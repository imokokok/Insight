import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PGlite } from '@electric-sql/pglite';

function hash(label: string): string {
  return createHash('sha256').update(label).digest('hex');
}

function row(symbol: string, price: number) {
  return {
    provider: 'chainlink',
    symbol,
    chain_id: 1,
    price,
    consensus_price: price,
    deviation_pct: 0.01,
    latency_ms: 20,
    data_age_seconds: 10,
    confidence: 0.99,
    is_success: true,
    error_message: null,
  };
}

test('atomic snapshot slot commits hourly and adaptive evidence together and is retry-safe', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE public.hourly_price_snapshots (
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
        error_message text,
        UNIQUE (snapshot_hour, provider, symbol, chain_id)
      );
      CREATE TABLE public.price_snapshots (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        snapshot_ts timestamptz NOT NULL,
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
        error_message text,
        UNIQUE (snapshot_ts, provider, symbol, chain_id)
      );
      CREATE OR REPLACE FUNCTION public.upsert_hourly_price_snapshots(p_rows jsonb)
      RETURNS integer LANGUAGE sql AS $$
        WITH inserted AS (
          INSERT INTO public.hourly_price_snapshots (
            snapshot_hour, provider, symbol, chain_id, price, consensus_price,
            deviation_pct, latency_ms, data_age_seconds, confidence, is_success, error_message
          )
          SELECT rec.snapshot_hour, rec.provider, rec.symbol,
            rec.chain_id, rec.price, rec.consensus_price, rec.deviation_pct,
            rec.latency_ms, rec.data_age_seconds, rec.confidence, rec.is_success, rec.error_message
          FROM jsonb_to_recordset(p_rows) AS rec(
            snapshot_hour timestamptz, provider text, symbol text, chain_id integer,
            price numeric, consensus_price numeric, deviation_pct numeric,
            latency_ms integer, data_age_seconds integer, confidence numeric,
            is_success boolean, error_message text
          )
          ON CONFLICT (snapshot_hour, provider, symbol, chain_id) DO NOTHING
          RETURNING 1
        ) SELECT count(*)::integer FROM inserted;
      $$;
      GRANT ALL ON public.hourly_price_snapshots, public.price_snapshots TO service_role;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
    `);

    const adaptive = await readFile(
      new URL('../../supabase/migrations/0106_adaptive_snapshot_persistence.sql', import.meta.url),
      'utf8'
    );
    const atomic = await readFile(
      new URL('../../supabase/migrations/0107_atomic_snapshot_slot.sql', import.meta.url),
      'utf8'
    );
    await db.exec(adaptive);
    await db.exec(atomic);
    await db.exec('SET ROLE service_role');

    const firstTimestamp = '2026-10-30T10:00:00.000Z';
    const firstRows = [
      { ...row('BTC', 100_000), snapshot_hour: firstTimestamp },
      { ...row('AAVE', 200), snapshot_hour: firstTimestamp },
    ];
    const first = await db.query<{
      summary: { hourlyWritten: number; persistence: Record<string, number> };
    }>(
      'SELECT public.commit_snapshot_data_slot($1::jsonb, $1::jsonb, $2::timestamptz, $3) AS summary',
      [JSON.stringify(firstRows), firstTimestamp, hash(firstTimestamp)]
    );
    assert.equal(first.rows[0].summary.hourlyWritten, 2);
    assert.equal(first.rows[0].summary.persistence.persisted, 2);

    const retry = await db.query<{
      summary: { hourlyWritten: number; persistence: Record<string, number> };
    }>(
      'SELECT public.commit_snapshot_data_slot($1::jsonb, $1::jsonb, $2::timestamptz, $3) AS summary',
      [JSON.stringify(firstRows), firstTimestamp, hash(firstTimestamp)]
    );
    assert.equal(retry.rows[0].summary.hourlyWritten, 0);
    assert.equal(retry.rows[0].summary.persistence.persisted, 2);

    const badTimestamp = '2026-10-30T10:15:00.000Z';
    const badRows = [{ ...row('ETH', 3_000), snapshot_hour: badTimestamp }];
    await assert.rejects(
      db.query(
        'SELECT public.commit_snapshot_data_slot($1::jsonb, $1::jsonb, $2::timestamptz, $3)',
        [JSON.stringify(badRows), badTimestamp, 'not-a-sha256']
      )
    );
    assert.equal(
      (await db.query('SELECT count(*)::integer AS count FROM public.hourly_price_snapshots'))
        .rows[0].count,
      2,
      'adaptive validation failure must roll back the preceding hourly write'
    );

    await db.exec('RESET ROLE');
    assert.equal(
      (
        await db.query(`SELECT has_function_privilege('anon',
          'public.commit_snapshot_data_slot(jsonb,jsonb,timestamp with time zone,text)',
          'EXECUTE') AS allowed`)
      ).rows[0].allowed,
      false
    );
  } finally {
    await db.close();
  }
});
