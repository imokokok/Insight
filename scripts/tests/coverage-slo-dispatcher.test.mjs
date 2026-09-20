import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const baseMigrationUrl = new URL(
  '../../supabase/migrations/0045_reliable_github_dispatcher.sql',
  import.meta.url
);
const migrationUrl = new URL(
  '../../supabase/migrations/0057_coverage_slo_dispatcher.sql',
  import.meta.url
);
const workflowUrl = new URL('../../.github/workflows/coverage-slo.yml', import.meta.url);

test('Coverage SLO migration schedules, dispatches and removes the reliable job', async () => {
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
    await db.exec(await readFile(migrationUrl, 'utf8'));

    const jobs = await db.query(
      "SELECT jobname, schedule, command FROM cron.job WHERE jobname='github-dispatch-coverage-slo'"
    );
    assert.deepEqual(jobs.rows, [
      {
        jobname: 'github-dispatch-coverage-slo',
        schedule: '7,22,37,52 * * * *',
        command: "SELECT public.dispatch_github_workflow('coverage-slo.yml');",
      },
    ]);

    await db.query("SELECT public.dispatch_github_workflow('coverage-slo.yml')");
    const dispatch = await db.query(
      "SELECT workflow_file, source, status, request_id FROM cron_dispatch_runs WHERE workflow_file='coverage-slo.yml'"
    );
    assert.deepEqual(dispatch.rows, [
      {
        workflow_file: 'coverage-slo.yml',
        source: 'supabase_cron',
        status: 'dispatching',
        request_id: 42,
      },
    ]);
    await assert.rejects(db.query("SELECT public.dispatch_github_workflow('unknown.yml')"));

    await db.query('SELECT public.disable_github_workflow_dispatcher()');
    assert.equal((await db.query('SELECT * FROM cron.job')).rows.length, 0);
  } finally {
    await db.close();
  }
});

test('Coverage SLO migration keeps the dispatcher declarations explicit', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /v_allowed[\s\S]*'coverage-slo\.yml'/);
  assert.match(
    sql,
    /cron\.schedule\(\s*'github-dispatch-coverage-slo',\s*'7,22,37,52 \* \* \* \*'/
  );
  assert.match(sql, /'github-dispatch-coverage-slo'[\s\S]*cron\.unschedule\(v_job_name\)/);
  assert.match(sql, /PERFORM public\.enable_github_workflow_dispatcher\(\)/);
});

test('Coverage SLO workflow records dispatched runs and guards its delayed native fallback', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');

  assert.match(workflow, /cron: '12,27,42,57 \* \* \* \*'/);
  assert.match(workflow, /workflow_dispatch:[\s\S]*dispatch_id:[\s\S]*scheduled_for:/);
  assert.match(workflow, /CRON_WORKFLOW: coverage-slo\.yml/);
  assert.match(workflow, /FALLBACK_MAX_AGE_MINUTES: '10'/);
  assert.match(workflow, /node scripts\/cron-control\.mjs guard/);
  assert.match(workflow, /node scripts\/cron-control\.mjs start/);
  assert.match(workflow, /CRON_CONCLUSION: \$\{\{ steps\.collect\.outcome \}\}/);
  assert.match(workflow, /node scripts\/cron-control\.mjs finish/);
  assert.match(workflow, /Rolling coverage SLO needs attention/);
  assert.match(workflow, /r\.targets\.filter/);
  assert.match(workflow, /"PASS","ALREADY_RECORDED"/);
  assert.ok(
    workflow.indexOf('node scripts/cron-control.mjs finish') <
      workflow.indexOf('Report latest-sample failure or rolling SLO warning'),
    'collection must be marked successful before the latest-sample alert can fail the job'
  );
});
