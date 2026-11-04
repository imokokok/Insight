import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PGlite } from '@electric-sql/pglite';

test('cron fallback guard migration creates a narrow ordered partial index', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE public.cron_dispatch_runs (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        workflow_file text NOT NULL,
        source text NOT NULL,
        status text NOT NULL,
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO public.cron_dispatch_runs(workflow_file,source,status,completed_at)
      VALUES
        ('coverage-slo.yml','supabase_cron','succeeded','2026-10-29T01:00:00Z'),
        ('coverage-slo.yml','github_fallback','succeeded','2026-10-29T01:01:00Z'),
        ('coverage-slo.yml','supabase_cron','failed','2026-10-29T01:02:00Z');
    `);

    const migration = await readFile(
      new URL(
        '../../supabase/migrations/0103_index_cron_dispatch_fallback_guard.sql',
        import.meta.url
      ),
      'utf8'
    );
    await db.exec(migration);

    const index = await db.query<{ indexdef: string }>(
      "SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND indexname='cron_dispatch_runs_fallback_guard_idx'"
    );
    assert.equal(index.rows.length, 1);
    assert.match(index.rows[0].indexdef, /workflow_file, completed_at DESC/);
    assert.match(index.rows[0].indexdef, /source = 'supabase_cron'/);
    assert.match(index.rows[0].indexdef, /status = 'succeeded'/);
    assert.match(index.rows[0].indexdef, /completed_at IS NOT NULL/);
  } finally {
    await db.close();
  }
});
