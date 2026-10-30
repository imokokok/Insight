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
const migrationUrl = new URL(
  '../../supabase/migrations/0104_reliable_monad_dex_dispatcher.sql',
  import.meta.url
);
const cadenceAlignmentMigrationUrl = new URL(
  '../../supabase/migrations/0110_align_dispatcher_cadence.sql',
  import.meta.url
);
const workflowUrl = new URL('../../.github/workflows/monad-dex-market.yml', import.meta.url);

test('Monad DEX migration registers the reliable primary dispatcher and removes it cleanly', async () => {
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
      RETURNS bigint LANGUAGE plpgsql AS $function$
      DECLARE v_jobid bigint;
      BEGIN
        INSERT INTO cron.job (jobname, schedule, command)
        VALUES (p_jobname, p_schedule, p_command)
        RETURNING jobid INTO v_jobid;
        RETURN v_jobid;
      END;
      $function$;
      CREATE FUNCTION cron.unschedule(p_jobname text)
      RETURNS boolean LANGUAGE plpgsql AS $function$
      BEGIN
        DELETE FROM cron.job WHERE jobname = p_jobname;
        RETURN FOUND;
      END;
      $function$;
    `);
    await db.exec(await readFile(baseMigrationUrl, 'utf8'));
    await db.query(
      "INSERT INTO vault.decrypted_secrets VALUES ('github_workflow_dispatch_token', $1)",
      ['github_pat_fixture_longer_than_twenty_chars']
    );
    await db.exec(await readFile(coverageMigrationUrl, 'utf8'));
    await db.exec(await readFile(migrationUrl, 'utf8'));
    await db.exec(await readFile(cadenceAlignmentMigrationUrl, 'utf8'));

    const jobs = await db.query(
      "SELECT jobname, schedule, command FROM cron.job WHERE jobname='github-dispatch-monad-dex-market'"
    );
    assert.deepEqual(jobs.rows, [
      {
        jobname: 'github-dispatch-monad-dex-market',
        schedule: '2,12,22,32,42,52 * * * *',
        command: "SELECT public.dispatch_github_workflow('monad-dex-market.yml');",
      },
    ]);

    const correctedCadences = await db.query(
      "SELECT jobname, schedule FROM cron.job WHERE jobname IN ('github-dispatch-oracle-watch', 'github-dispatch-reputation') ORDER BY jobname"
    );
    assert.deepEqual(correctedCadences.rows, [
      { jobname: 'github-dispatch-oracle-watch', schedule: '8 * * * *' },
      { jobname: 'github-dispatch-reputation', schedule: '12 */2 * * *' },
    ]);

    await db.query("SELECT public.dispatch_github_workflow('monad-dex-market.yml')");
    const dispatch = await db.query(
      "SELECT workflow_file, source, status, request_id FROM cron_dispatch_runs WHERE workflow_file='monad-dex-market.yml'"
    );
    assert.deepEqual(dispatch.rows, [
      {
        workflow_file: 'monad-dex-market.yml',
        source: 'supabase_cron',
        status: 'dispatching',
        request_id: 42,
      },
    ]);

    await db.query('SELECT public.disable_github_workflow_dispatcher()');
    assert.equal((await db.query('SELECT * FROM cron.job')).rows.length, 0);
  } finally {
    await db.close();
  }
});

test('Monad DEX workflow records dispatched runs and guards the delayed fallback', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');

  assert.match(workflow, /cron: '7,17,27,37,47,57 \* \* \* \*'/);
  assert.match(workflow, /workflow_dispatch:[\s\S]*dispatch_id:[\s\S]*scheduled_for:/);
  assert.match(workflow, /CRON_WORKFLOW: monad-dex-market\.yml/);
  assert.match(workflow, /FALLBACK_MAX_AGE_MINUTES: '10'/);
  assert.match(workflow, /node scripts\/cron-control\.mjs guard/);
  assert.match(workflow, /node scripts\/cron-control\.mjs start/);
  assert.match(workflow, /node scripts\/cron-control\.mjs finish/);
  assert.match(workflow, /CRON_CONCLUSION: \$\{\{ steps\.index\.outcome \}\}/);
});
