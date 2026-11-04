import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PGlite } from '@electric-sql/pglite';

const heartbeatMigrationUrl = new URL(
  '../../supabase/migrations/0102_reduce_healthy_feed_heartbeat_io.sql',
  import.meta.url
);
const atomicLifecycleMigrationUrl = new URL(
  '../../supabase/migrations/0109_atomic_feed_health_lifecycle.sql',
  import.meta.url
);

test('atomic feed-health lifecycle preserves batch semantics and deactivates in the same transaction', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE TABLE public.oracle_feeds (
        provider text NOT NULL,
        symbol text NOT NULL,
        chain_id integer NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        consecutive_failures integer NOT NULL DEFAULT 0,
        last_success_at timestamptz,
        last_failure_at timestamptz,
        updated_at timestamptz,
        deactivated_reason text,
        deactivated_at timestamptz,
        PRIMARY KEY (provider, symbol, chain_id)
      );
      GRANT SELECT, UPDATE ON public.oracle_feeds TO service_role;
      INSERT INTO public.oracle_feeds (provider, symbol, chain_id, consecutive_failures)
      VALUES ('chainlink', 'ETH', 1, 0), ('pyth', 'SOL', 1, 2);
    `);
    await db.exec(await readFile(heartbeatMigrationUrl, 'utf8'));
    await db.exec(await readFile(atomicLifecycleMigrationUrl, 'utf8'));
    await db.exec('SET ROLE service_role');

    const summary = await db.query<{ summary: { updated: number; deactivated: number } }>(
      'SELECT public.apply_feed_health_batch($1::jsonb, 3) AS summary',
      [
        JSON.stringify({
          successes: [{ provider: 'chainlink', symbol: 'ETH', chainId: 1 }],
          failures: [{ provider: 'pyth', symbol: 'SOL', chainId: 1 }],
        }),
      ]
    );
    assert.deepEqual(summary.rows[0].summary, { updated: 2, deactivated: 1 });

    const feeds = await db.query<{
      symbol: string;
      is_active: boolean;
      consecutive_failures: number;
      last_success_at: Date | null;
      deactivated_reason: string | null;
    }>(
      'SELECT symbol, is_active, consecutive_failures, last_success_at, deactivated_reason FROM public.oracle_feeds ORDER BY symbol'
    );
    assert.deepEqual(
      feeds.rows.map((feed) => ({ ...feed, last_success_at: !!feed.last_success_at })),
      [
        {
          symbol: 'ETH',
          is_active: true,
          consecutive_failures: 0,
          last_success_at: true,
          deactivated_reason: null,
        },
        {
          symbol: 'SOL',
          is_active: false,
          consecutive_failures: 3,
          last_success_at: false,
          deactivated_reason: 'health_failed',
        },
      ]
    );

    await assert.rejects(
      db.query('SELECT public.apply_feed_health_batch($1::jsonb, 0)', [JSON.stringify({})])
    );

    await db.exec('RESET ROLE');
    assert.equal(
      (
        await db.query(`SELECT has_function_privilege('anon',
          'public.apply_feed_health_batch(jsonb,integer)', 'EXECUTE') AS allowed`)
      ).rows[0].allowed,
      false
    );
  } finally {
    await db.close();
  }
});
