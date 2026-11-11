/* eslint-disable no-console */
/**
 * Phase B backfill, direct-pg variant: copies the same B/C-group history as
 * backfill-from-supabase.ts, but reads the source tables over a raw Postgres
 * (Supavisor pooler) connection instead of the PostgREST REST gateway.
 *
 * Why this exists: while the Supabase org is egress-restricted every REST
 * request 402s, but direct pg connections keep working (verified 2026-11-11,
 * org "Insight v1.0" FREE plan). This lets Phase B run before the quota
 * reset instead of waiting for it.
 *
 * Fidelity: each row is fetched as `to_jsonb(row)` — the exact server-side
 * JSON encoder Supabase REST uses — so timestamptz strings ("…T…+00:00"),
 * numerics, booleans and jsonb payloads arrive byte-identical to the REST
 * path. `SET TIME ZONE 'UTC'` pins timestamptz rendering to UTC regardless
 * of the pooler session defaults. Writes go through the same
 * INSERT … ON CONFLICT DO NOTHING machinery, so re-runs stay idempotent.
 *
 * Transport: shells out to the Supabase CLI (`supabase db query --db-url …
 * -o json`) because the repo has no `pg` client dependency and the pooler
 * hostname is outside the local DNS-pollution zone (*.supabase.co is
 * polluted on dev boxes; *.pooler.supabase.com is not).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/turso/backfill-from-supabase-pg.ts \
 *     [--dry-run] [--table=hourly_price_snapshots]
 *
 * Requires: SUPABASE_DB_PASSWORD (pooler auth), SUPABASE_URL (ref extraction)
 * and TURSO_OPS_DATABASE_URL + TURSO_OPS_AUTH_TOKEN (writes).
 */
import { createClient } from '@libsql/client';
import { execFileSync } from 'node:child_process';

const POOLER_HOST = 'aws-1-ap-south-1.pooler.supabase.com:5432';

interface TableSpec {
  /** Supabase/Postgres table name (same name used in Turso ops schema). */
  table: string;
  /** Conflict keys matching the Turso UNIQUE/PRIMARY constraint. */
  conflictKeys: string[];
  /** Postgres boolean columns stored as INTEGER CHECK in Turso. */
  boolCols: string[];
  /** JSON-object columns stored as TEXT in Turso. */
  jsonCols: string[];
  /** Supabase columns with no counterpart in the Turso ops schema (dropped on
   * copy; the source data stays intact in Supabase).
   */
  dropCols: string[];
  /**
   * When set, conflicts become DO UPDATE refreshing only these columns —
   * used to repair rows an earlier run inserted with those columns NULL.
   * Rows that exist only in Turso (post-cutover collector output) never
   * conflict, so the update never touches them.
   */
  upsertRefreshCols?: string[];
}

const TABLE_SPECS: TableSpec[] = [
  {
    table: 'hourly_price_snapshots',
    conflictKeys: ['provider', 'symbol', 'chain_id', 'snapshot_hour'],
    boolCols: ['is_success'],
    jsonCols: [],
    dropCols: [],
  },
  {
    table: 'market_reference_snapshots',
    conflictKeys: ['snapshot_ts', 'symbol', 'quote', 'exchange'],
    boolCols: ['is_success'],
    jsonCols: [],
    dropCols: [],
  },
  {
    table: 'manip_cost_pool_snapshots',
    conflictKeys: ['snapshot_ts', 'pool_key'],
    boolCols: ['is_success'],
    jsonCols: ['pool_state', 'cost_curve'],
    dropCols: ['created_at'],
    upsertRefreshCols: ['mid_price', 'tvl_usd', 'eth_usd_mid'],
  },
  {
    table: 'coverage_slo_samples',
    conflictKeys: ['target_id', 'slot'],
    boolCols: ['signed_ready'],
    jsonCols: ['reasons', 'proof'],
    dropCols: [],
  },
  {
    table: 'feed_health_snapshots',
    conflictKeys: [], // append-only on Supabase too; copy every row
    boolCols: ['quorum_satisfied'],
    jsonCols: [],
    dropCols: [],
  },
  {
    table: 'dex_market_swap_events',
    conflictKeys: ['chain_id', 'dex', 'pool_address', 'tx_hash', 'log_index'],
    boolCols: [],
    jsonCols: [],
    dropCols: [],
  },
  {
    table: 'dex_market_sync_cursors',
    conflictKeys: ['chain_id', 'dex', 'pool_address'],
    boolCols: [],
    jsonCols: [],
    dropCols: [],
  },
];

function parseArgs(): { dryRun: boolean; only?: string } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const tableArg = args.find((a) => a.startsWith('--table='));
  return { dryRun, only: tableArg ? tableArg.split('=')[1] : undefined };
}

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function readSupabaseUrl(): string {
  return process.env.SUPABASE_URL ?? readEnv('NEXT_PUBLIC_SUPABASE_URL');
}

function buildPoolerUrl(): string {
  const ref = readSupabaseUrl()
    .replace(/^https?:\/\//, '')
    .split('.')[0];
  const password = readEnv('SUPABASE_DB_PASSWORD');
  const encoded = encodeURIComponent(password);
  return `postgresql://postgres.${ref}:${encoded}@${POOLER_HOST}/postgres`;
}

/**
 * Fetch a whole table as an array of to_jsonb row objects, via the Supabase
 * CLI. The inner payload is a JSON text column, so `-o json` wraps it as
 * {payload: "[…]"} — one outer and one inner JSON.parse.
 */
function fetchTableRows(table: string, dbUrl: string): Record<string, unknown>[] {
  const sql =
    // Single statement (the CLI runs it as one prepared statement): a
    // MATERIALIZED CTE pins the session TimeZone to UTC before to_jsonb
    // renders any timestamptz, matching Supabase REST's UTC rendering.
    `WITH tz AS MATERIALIZED (SELECT set_config('TimeZone', 'UTC', true)) ` +
    `SELECT coalesce(jsonb_agg(j), '[]'::jsonb)::text AS payload ` +
    `FROM (SELECT to_jsonb(t.*) AS j FROM ${table} t) s;`;
  const stdout = execFileSync('supabase', ['db', 'query', '--db-url', dbUrl, '-o', 'json', sql], {
    maxBuffer: 256 * 1024 * 1024,
    timeout: 5 * 60_000,
    encoding: 'utf8',
  });
  const outer = JSON.parse(stdout) as Array<{ payload?: string }>;
  const row = outer[0];
  if (!row || typeof row.payload !== 'string') {
    throw new Error(`Unexpected CLI output shape for ${table}`);
  }
  return JSON.parse(row.payload) as Record<string, unknown>[];
}

function toTursoValue(value: unknown, spec: TableSpec, column: string): string | number | null {
  if (value === null || value === undefined) return null;
  if (spec.boolCols.includes(column)) return value === true ? 1 : 0;
  if (spec.jsonCols.includes(column)) {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'string') return value;
  return String(value);
}

/** Transient Turso/network failures (fetch failed, timeouts) retry with backoff. */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= attempts) throw error;
      const delayMs = 1000 * 2 ** (attempt - 1);
      console.log(
        `[backfill-pg] retry ${attempt}/${attempts - 1} for ${label} after error: ${error instanceof Error ? error.message : String(error)} — waiting ${delayMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function backfillTable(
  spec: TableSpec,
  turso: ReturnType<typeof createClient>,
  dbUrl: string,
  dryRun: boolean
): Promise<{ copied: number; skipped: number; scanned: number }> {
  const rows = fetchTableRows(spec.table, dbUrl);
  if (rows.length === 0) return { copied: 0, skipped: 0, scanned: 0 };

  if (dryRun) return { copied: rows.length, skipped: 0, scanned: rows.length };

  const rowColumns = Object.keys(rows[0]).filter((c) => c !== 'id' && !spec.dropCols.includes(c));
  const placeholders = rowColumns.map(() => '?').join(', ');
  let conflict: string;
  if (spec.upsertRefreshCols && spec.upsertRefreshCols.length > 0) {
    const updates = spec.upsertRefreshCols.map((c) => `${c} = excluded.${c}`).join(', ');
    conflict = ` ON CONFLICT (${spec.conflictKeys.join(', ')}) DO UPDATE SET ${updates}`;
  } else if (spec.conflictKeys.length > 0) {
    conflict = ` ON CONFLICT (${spec.conflictKeys.join(', ')}) DO NOTHING`;
  } else {
    conflict = '';
  }
  const sql = `INSERT INTO ${spec.table} (${rowColumns.join(', ')}) VALUES (${placeholders})${conflict}`;

  let copied = 0;
  let skipped = 0;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const batch = chunk.map((row) => ({
      sql,
      args: rowColumns.map((c) => toTursoValue(row[c], spec, c)),
    }));
    const results = await withRetry(`${spec.table} batch@${i}`, () => turso.batch(batch, 'write'));
    // rowsAffected counts inserted rows only; the remainder were ignored
    // duplicates from earlier runs.
    const inserted = results.reduce((sum, r) => sum + Number(r.rowsAffected ?? 0), 0);
    copied += inserted;
    skipped += chunk.length - inserted;
  }
  return { copied, skipped, scanned: rows.length };
}

async function main(): Promise<void> {
  const { dryRun, only } = parseArgs();
  const dbUrl = buildPoolerUrl();
  const tursoUrl = readEnv('TURSO_OPS_DATABASE_URL');
  const tursoToken = readEnv('TURSO_OPS_AUTH_TOKEN');

  const turso = createClient({ url: tursoUrl, authToken: tursoToken });
  const specs = only ? TABLE_SPECS.filter((s) => s.table === only) : TABLE_SPECS;
  if (specs.length === 0) throw new Error(`Unknown table: ${only}`);

  const summary: Record<string, { copied: number; skipped: number; scanned: number }> = {};
  for (const spec of specs) {
    const started = Date.now();
    const result = await backfillTable(spec, turso, dbUrl, dryRun);
    summary[spec.table] = result;
    console.log(
      `[backfill-pg] ${spec.table}: scanned=${result.scanned} copied=${result.copied} skipped(dupes)=${result.skipped} in ${((Date.now() - started) / 1000).toFixed(1)}s`
    );
  }

  if (!dryRun) {
    const counts: Record<string, number> = {};
    for (const spec of specs) {
      const result = await withRetry(`${spec.table} count`, () =>
        turso.execute(`SELECT COUNT(*) AS n FROM ${spec.table}`)
      );
      counts[spec.table] = Number(result.rows[0]?.n ?? 0);
    }
    console.log(JSON.stringify({ dryRun, summary, tursoCounts: counts }, null, 2));
  } else {
    console.log(JSON.stringify({ dryRun, summary }, null, 2));
  }
}

main().catch((error) => {
  console.error('[backfill-pg] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
