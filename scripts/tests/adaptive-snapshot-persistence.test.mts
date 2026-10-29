import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PGlite } from '@electric-sql/pglite';

function inputHash(label: string): string {
  return createHash('sha256').update(label).digest('hex');
}

function row(symbol: string, price: number, isSuccess = true, errorMessage: string | null = null) {
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
    is_success: isSuccess,
    error_message: errorMessage,
  };
}

async function persist(
  db: PGlite,
  timestamp: string,
  rows: unknown[],
  hashLabel = timestamp
): Promise<Record<string, number>> {
  const result = await db.query<{ summary: Record<string, number> }>(
    'SELECT public.persist_adaptive_price_snapshots($1::jsonb, $2::timestamptz, $3) AS summary',
    [JSON.stringify(rows), timestamp, inputHash(hashLabel)]
  );
  return result.rows[0].summary;
}

test('adaptive snapshot persistence keeps core resolution and suppresses stable raw writes', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
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
    `);
    const migration = await readFile(
      new URL('../../supabase/migrations/0105_adaptive_snapshot_persistence.sql', import.meta.url),
      'utf8'
    );
    await db.exec(migration);
    await db.exec('SET ROLE service_role');

    const first = await persist(db, '2026-10-30T10:00:00.000Z', [
      row('BTC', 100_000),
      row('AAVE', 200),
    ]);
    assert.deepEqual(first, {
      received: 2,
      candidates: 2,
      persisted: 2,
      fullResolution: 1,
      initial: 1,
      stateTransition: 0,
      errorChange: 0,
      hourlyBaseline: 0,
      priceChange: 0,
      deviationChange: 0,
      dataAgeChange: 0,
      confidenceChange: 0,
      stableSkipped: 0,
    });

    const stable = await persist(db, '2026-10-30T10:15:00.000Z', [
      row('BTC', 100_000),
      row('AAVE', 200),
    ]);
    assert.equal(stable.persisted, 1);
    assert.equal(stable.fullResolution, 1);
    assert.equal(stable.stableSkipped, 1);

    const repeatedStable = await persist(db, '2026-10-30T10:15:00.000Z', [
      row('BTC', 100_000),
      row('AAVE', 200),
    ]);
    assert.deepEqual(repeatedStable, stable);

    const materialMove = await persist(db, '2026-10-30T10:30:00.000Z', [
      row('BTC', 100_000),
      row('AAVE', 201),
    ]);
    assert.equal(materialMove.persisted, 2);
    assert.equal(materialMove.priceChange, 1);

    const failure = await persist(db, '2026-10-30T10:45:00.000Z', [
      row('BTC', 100_000),
      row('AAVE', 0, false, 'upstream timeout'),
    ]);
    assert.equal(failure.persisted, 2);
    assert.equal(failure.stateTransition, 1);

    const failedBaseline = await persist(db, '2026-10-30T11:00:00.000Z', [
      row('BTC', 100_000),
      row('AAVE', 0, false, 'upstream timeout'),
    ]);
    assert.equal(failedBaseline.persisted, 2);
    assert.equal(failedBaseline.hourlyBaseline, 1);

    const recovery = await persist(db, '2026-10-30T11:15:00.000Z', [
      row('BTC', 100_000),
      row('AAVE', 201),
    ]);
    assert.equal(recovery.persisted, 2);
    assert.equal(recovery.stateTransition, 1);

    await db.exec('RESET ROLE');
    assert.deepEqual(
      (
        await db.query(
          `SELECT symbol, count(*)::integer AS samples
           FROM public.price_snapshots
           GROUP BY symbol ORDER BY symbol`
        )
      ).rows,
      [
        { symbol: 'AAVE', samples: 5 },
        { symbol: 'BTC', samples: 6 },
      ]
    );
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::integer AS runs FROM public.price_snapshot_collection_runs'
        )
      ).rows[0].runs,
      6
    );
    assert.equal(
      (
        await db.query(`SELECT has_function_privilege('anon',
          'public.persist_adaptive_price_snapshots(jsonb,timestamp with time zone,text)',
          'EXECUTE') AS allowed`)
      ).rows[0].allowed,
      false
    );
    assert.equal(
      (
        await db.query(`SELECT has_function_privilege('service_role',
          'public.persist_adaptive_price_snapshots(jsonb,timestamp with time zone,text)',
          'EXECUTE') AS allowed`)
      ).rows[0].allowed,
      true
    );
  } finally {
    await db.close();
  }
});
