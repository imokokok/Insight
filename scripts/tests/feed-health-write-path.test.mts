import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PGlite } from '@electric-sql/pglite';

test('feed-health success writes are throttled without delaying failure recovery', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE oracle_feeds(
        provider text NOT NULL, symbol text NOT NULL, chain_id integer NOT NULL,
        consecutive_failures integer NOT NULL DEFAULT 0,
        last_success_at timestamptz, last_failure_at timestamptz, updated_at timestamptz
      );
      CREATE TABLE oracle_rpc_metadata_cache(id integer);
      CREATE TABLE snapshot_archives(
        kind text NOT NULL, archive_day date NOT NULL, archive_id bigint NOT NULL,
        PRIMARY KEY(kind, archive_day, archive_id)
      );
      GRANT SELECT,UPDATE ON oracle_feeds TO service_role;
      INSERT INTO oracle_feeds(provider,symbol,chain_id,consecutive_failures)
        VALUES ('dia','ETH',1,0);
    `);

    const migration = await readFile(
      new URL(
        '../../supabase/migrations/0100_reduce_feed_health_write_amplification.sql',
        import.meta.url
      ),
      'utf8'
    );
    await db.exec(migration);
    const ioBudgetMigration = await readFile(
      new URL('../../supabase/migrations/0101_reduce_realtime_health_io.sql', import.meta.url),
      'utf8'
    );
    await db.exec(ioBudgetMigration);
    await db.exec('SET ROLE service_role');

    const at = '2026-10-25T15:00:00.000Z';
    assert.deepEqual(
      (
        await db.query('SELECT touch_oracle_feed_success($1,$2,$3,$4::timestamptz) AS wrote', [
          'dia',
          'ETH',
          1,
          at,
        ])
      ).rows,
      [{ wrote: true }]
    );
    assert.deepEqual(
      (
        await db.query('SELECT touch_oracle_feed_success($1,$2,$3,$4::timestamptz) AS wrote', [
          'dia',
          'ETH',
          1,
          '2026-10-25T15:29:59.999Z',
        ])
      ).rows,
      [{ wrote: false }]
    );
    assert.deepEqual(
      (
        await db.query('SELECT touch_oracle_feed_success($1,$2,$3,$4::timestamptz) AS wrote', [
          'dia',
          'ETH',
          1,
          '2026-10-25T15:30:00.001Z',
        ])
      ).rows,
      [{ wrote: true }]
    );

    await db.exec(
      "UPDATE oracle_feeds SET consecutive_failures=3,last_failure_at='2026-10-25T15:31:00Z' WHERE provider='dia'"
    );
    assert.deepEqual(
      (
        await db.query('SELECT touch_oracle_feed_success($1,$2,$3,$4::timestamptz) AS wrote', [
          'dia',
          'ETH',
          1,
          '2026-10-25T15:31:01Z',
        ])
      ).rows,
      [{ wrote: true }]
    );
    assert.deepEqual(
      (
        await db.query(
          "SELECT consecutive_failures,(last_success_at AT TIME ZONE 'UTC')::text AS success FROM oracle_feeds WHERE provider='dia'"
        )
      ).rows,
      [{ consecutive_failures: 0, success: '2026-10-25 15:31:01' }]
    );

    const payload = JSON.stringify({
      successes: [{ provider: 'dia', symbol: 'ETH', chainId: 1 }],
      failures: [],
    });
    await db.query(
      "UPDATE oracle_feeds SET last_success_at=clock_timestamp() WHERE provider='dia'"
    );
    assert.deepEqual(
      (await db.query('SELECT batch_update_feed_health($1::jsonb) AS updated', [payload])).rows,
      [{ updated: 0 }]
    );
    await db.query(
      "UPDATE oracle_feeds SET last_success_at=clock_timestamp()-interval '31 minutes' WHERE provider='dia'"
    );
    assert.deepEqual(
      (await db.query('SELECT batch_update_feed_health($1::jsonb) AS updated', [payload])).rows,
      [{ updated: 1 }]
    );
  } finally {
    await db.close();
  }
});
