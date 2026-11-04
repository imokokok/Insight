import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PGlite } from '@electric-sql/pglite';

const baseMigrationUrl = new URL(
  '../../supabase/migrations/0045_reliable_github_dispatcher.sql',
  import.meta.url
);
const migrationUrl = new URL(
  '../../supabase/migrations/0112_nano_io_backpressure.sql',
  import.meta.url
);

test('Nano backpressure coalesces only an overlapping high-frequency writer and retains recovery', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA vault;
      CREATE TABLE vault.decrypted_secrets (name text PRIMARY KEY, decrypted_secret text);
      CREATE SCHEMA net;
      CREATE TABLE net.request_log (workflow text NOT NULL);
      CREATE FUNCTION net.http_post(
        url text,
        headers jsonb,
        body jsonb,
        timeout_milliseconds integer
      ) RETURNS bigint LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO net.request_log(workflow) VALUES (url);
        RETURN 42;
      END;
      $$;
      CREATE SCHEMA cron;
      CREATE TABLE cron.job (
        jobid bigserial PRIMARY KEY,
        jobname text UNIQUE NOT NULL,
        schedule text NOT NULL,
        command text NOT NULL
      );
      CREATE FUNCTION cron.schedule(p_jobname text, p_schedule text, p_command text)
      RETURNS bigint LANGUAGE plpgsql AS $$
      DECLARE v_jobid bigint;
      BEGIN
        INSERT INTO cron.job (jobname, schedule, command)
        VALUES (p_jobname, p_schedule, p_command)
        RETURNING jobid INTO v_jobid;
        RETURN v_jobid;
      END;
      $$;
      CREATE FUNCTION cron.unschedule(p_jobname text)
      RETURNS boolean LANGUAGE plpgsql AS $$
      BEGIN
        DELETE FROM cron.job WHERE jobname = p_jobname;
        RETURN FOUND;
      END;
      $$;
      CREATE TABLE public.oracle_feeds (
        provider text NOT NULL,
        symbol text NOT NULL,
        chain_id integer NOT NULL,
        consecutive_failures integer NOT NULL DEFAULT 0,
        last_success_at timestamptz,
        last_failure_at timestamptz,
        updated_at timestamptz,
        PRIMARY KEY (provider, symbol, chain_id)
      );
      GRANT SELECT, INSERT, UPDATE ON public.oracle_feeds TO service_role;
      INSERT INTO public.oracle_feeds(provider, symbol, chain_id)
      VALUES ('chainlink', 'ETH', 1);
    `);
    await db.exec(await readFile(baseMigrationUrl, 'utf8'));
    await db.query(
      "INSERT INTO vault.decrypted_secrets VALUES ('github_workflow_dispatch_token', $1)",
      ['github_pat_fixture_longer_than_twenty_chars']
    );
    await db.exec(await readFile(migrationUrl, 'utf8'));

    await db.query(`
      INSERT INTO public.cron_dispatch_runs(workflow_file, scheduled_for, source, status, created_at)
      VALUES (
        'snapshot-collect.yml',
        date_trunc('minute', clock_timestamp()) - interval '1 minute',
        'supabase_cron',
        'running',
        clock_timestamp() - interval '1 minute'
      )
    `);
    await db.query("SELECT public.dispatch_github_workflow('snapshot-collect.yml')");

    const coalesced = await db.query<{
      status: string;
      conclusion: string | null;
    }>(`
      SELECT status, conclusion
      FROM public.cron_dispatch_runs
      WHERE workflow_file = 'snapshot-collect.yml'
        AND scheduled_for = date_trunc('minute', clock_timestamp())
    `);
    assert.deepEqual(coalesced.rows, [
      {
        status: 'cancelled',
        conclusion: 'coalesced: an earlier primary run remains open',
      },
    ]);
    assert.equal(
      (await db.query('SELECT count(*)::int AS count FROM net.request_log')).rows[0].count,
      0
    );

    await db.query(`
      INSERT INTO public.cron_dispatch_runs(workflow_file, scheduled_for, source, status, created_at)
      VALUES (
        'monad-dex-market.yml',
        date_trunc('minute', clock_timestamp()) - interval '21 minutes',
        'supabase_cron',
        'running',
        clock_timestamp() - interval '21 minutes'
      )
    `);
    await db.query("SELECT public.dispatch_github_workflow('monad-dex-market.yml')");
    assert.equal(
      (await db.query('SELECT count(*)::int AS count FROM net.request_log')).rows[0].count,
      1
    );

    const payload = JSON.stringify({
      successes: [{ provider: 'chainlink', symbol: 'ETH', chainId: 1 }],
      failures: [],
    });
    await db.query(
      "UPDATE public.oracle_feeds SET last_success_at = clock_timestamp() - interval '76 minutes'"
    );
    assert.deepEqual(
      (await db.query('SELECT public.batch_update_feed_health($1::jsonb) AS updated', [payload]))
        .rows,
      [{ updated: 0 }]
    );
    await db.query(
      "UPDATE public.oracle_feeds SET last_success_at = clock_timestamp() - interval '91 minutes'"
    );
    assert.deepEqual(
      (await db.query('SELECT public.batch_update_feed_health($1::jsonb) AS updated', [payload]))
        .rows,
      [{ updated: 1 }]
    );
  } finally {
    await db.close();
  }
});

test('Nano backpressure distributes the remaining hourly and daily database mutations', async () => {
  const migration = await readFile(migrationUrl, 'utf8');

  assert.match(migration, /'rate-limits-cleanup', '4,19,34,49 \* \* \* \*'/);
  assert.match(migration, /'price-records-cleanup', '20,50 \* \* \* \*'/);
  assert.match(migration, /'api-keys-deactivation', '7 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-reputation', '27 \*\/2 \* \* \*'/);
  assert.match(migration, /interval '90 minutes'/);
  assert.match(migration, /coalesced: an earlier primary run remains open/);
});
