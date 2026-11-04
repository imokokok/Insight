import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PGlite } from '@electric-sql/pglite';

const baseMigrationUrl = new URL(
  '../../supabase/migrations/0045_reliable_github_dispatcher.sql',
  import.meta.url
);
const coverageMigrationUrl = new URL(
  '../../supabase/migrations/0057_coverage_slo_dispatcher.sql',
  import.meta.url
);
const monadMigrationUrl = new URL(
  '../../supabase/migrations/0104_reliable_monad_dex_dispatcher.sql',
  import.meta.url
);
const reductionMigrationUrl = new URL(
  '../../supabase/migrations/0108_dispatch_ledger_write_reduction.sql',
  import.meta.url
);

test('primary dispatch retains its idempotency row without a request-id rewrite', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA vault;
      CREATE TABLE vault.decrypted_secrets (name text PRIMARY KEY, decrypted_secret text);
      CREATE SCHEMA net;
      CREATE FUNCTION net.http_post(
        url text,
        headers jsonb,
        body jsonb,
        timeout_milliseconds integer
      ) RETURNS bigint LANGUAGE sql AS 'SELECT 42::bigint';
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
    `);
    await db.exec(await readFile(baseMigrationUrl, 'utf8'));
    await db.query(
      "INSERT INTO vault.decrypted_secrets VALUES ('github_workflow_dispatch_token', $1)",
      ['github_pat_fixture_longer_than_twenty_chars']
    );
    await db.exec(await readFile(coverageMigrationUrl, 'utf8'));
    await db.exec(await readFile(monadMigrationUrl, 'utf8'));
    await db.exec(await readFile(reductionMigrationUrl, 'utf8'));

    await db.query("SELECT public.dispatch_github_workflow('snapshot-collect.yml')");
    const dispatched = await db.query(
      "SELECT workflow_file, source, status, request_id FROM public.cron_dispatch_runs WHERE workflow_file='snapshot-collect.yml'"
    );
    assert.deepEqual(dispatched.rows, [
      {
        workflow_file: 'snapshot-collect.yml',
        source: 'supabase_cron',
        status: 'dispatching',
        request_id: null,
      },
    ]);
  } finally {
    await db.close();
  }
});

test('write-reduction migration keeps the dispatch allowlist and omits the immediate update', async () => {
  const sql = await readFile(reductionMigrationUrl, 'utf8');

  assert.match(sql, /v_allowed[\s\S]*'monad-dex-market\.yml'/);
  assert.match(sql, /PERFORM net\.http_post/);
  assert.doesNotMatch(sql, /SET request_id\s*=/);
  assert.match(sql, /request_id remains nullable/);
});
