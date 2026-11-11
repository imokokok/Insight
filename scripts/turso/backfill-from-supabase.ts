/* eslint-disable no-console */
/**
 * One-shot backfill: copy B/C-group history from Supabase into the Turso ops
 * data plane (Phase B of the egress retirement, 2026-11).
 *
 * Runs only when Supabase is reachable (i.e. after the egress quota reset —
 * while restricted every read 402s). Idempotent: every insert is
 * OR IGNORE against the same natural keys the Supabase tables enforce, so
 * re-runs and partial-run resumes are safe.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/turso/backfill-from-supabase.ts \
 *     [--dry-run] [--table=hourly_price_snapshots] [--page-size=1000]
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (reads) and
 * TURSO_OPS_DATABASE_URL + TURSO_OPS_AUTH_TOKEN (writes).
 */
import { createClient } from '@libsql/client';

// Local dev boxes may have polluted DNS for *.supabase.co; honor the standard
// proxy env vars (node fetch ignores them natively). GH runners have clean
// egress and skip this path entirely.
const proxyUrl = process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY;
const dispatcher = proxyUrl
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (new (require('undici') as typeof import('undici')).ProxyAgent(proxyUrl) as never)
  : undefined;

interface TableSpec {
  /** Supabase/Postgres table name (same name used in Turso ops schema). */
  table: string;
  /** Conflict keys matching the Turso UNIQUE/PRIMARY constraint. */
  conflictKeys: string[];
  /** Postgres boolean columns stored as INTEGER CHECK in Turso. */
  boolCols: string[];
  /** JSON-object columns stored as TEXT in Turso. */
  jsonCols: string[];
  /** Empty Turso tables skip reads entirely (fresh domain, nothing to copy). */
  fresh?: string[];
}

const TABLE_SPECS: TableSpec[] = [
  {
    table: 'hourly_price_snapshots',
    conflictKeys: ['provider', 'symbol', 'chain_id', 'snapshot_hour'],
    boolCols: ['is_success'],
    jsonCols: [],
  },
  {
    table: 'market_reference_snapshots',
    conflictKeys: ['snapshot_ts', 'symbol', 'quote', 'exchange'],
    boolCols: ['is_success'],
    jsonCols: [],
  },
  {
    table: 'manip_cost_pool_snapshots',
    conflictKeys: ['snapshot_ts', 'pool_key'],
    boolCols: ['is_success'],
    jsonCols: ['pool_state', 'cost_curve'],
  },
  {
    table: 'coverage_slo_samples',
    conflictKeys: ['target_id', 'slot'],
    boolCols: ['signed_ready'],
    jsonCols: ['reasons', 'proof'],
  },
  {
    table: 'feed_health_snapshots',
    conflictKeys: [], // append-only on Supabase too; copy every row
    boolCols: ['quorum_satisfied'],
    jsonCols: [],
  },
  {
    table: 'dex_market_swap_events',
    conflictKeys: ['chain_id', 'dex', 'pool_address', 'tx_hash', 'log_index'],
    boolCols: [],
    jsonCols: [],
  },
  {
    table: 'dex_market_sync_cursors',
    conflictKeys: ['chain_id', 'dex', 'pool_address'],
    boolCols: [],
    jsonCols: [],
  },
];

function parseArgs(): { dryRun: boolean; only?: string; pageSize: number } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const tableArg = args.find((a) => a.startsWith('--table='));
  const pageSizeArg = args.find((a) => a.startsWith('--page-size='));
  const pageSize = pageSizeArg ? Math.max(1, Number(pageSizeArg.split('=')[1])) : 1000;
  if (dryRun && !Number.isFinite(pageSize)) throw new Error('invalid --page-size');
  return { dryRun, only: tableArg ? tableArg.split('=')[1] : undefined, pageSize };
}

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

/** One PostgREST page; returns rows + whether more pages follow. */
async function fetchSupabasePage(
  base: string,
  key: string,
  table: string,
  offset: number,
  pageSize: number
): Promise<{ rows: Record<string, unknown>[]; hasMore: boolean; totalEstimate: number | null }> {
  const url = `${base}/rest/v1/${table}?select=*`;
  const response = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Range: `${offset}-${offset + pageSize - 1}`,
      Prefer: 'count=exact',
    },
    signal: AbortSignal.timeout(60_000),
    // @ts-expect-error undici dispatcher extension
    dispatcher,
  });
  if (response.status === 402) {
    throw new Error(`SUPABASE_STILL_RESTRICTED (402) — wait for the quota reset`);
  }
  if (!response.ok) {
    throw new Error(`Supabase read failed for ${table}: HTTP ${response.status}`);
  }
  const contentRange = response.headers.get('content-range');
  let totalEstimate: number | null = null;
  if (contentRange) {
    const total = contentRange.split('/')[1];
    if (total && total !== '*') totalEstimate = Number(total);
  }
  const rows = (await response.json()) as Record<string, unknown>[];
  return { rows, hasMore: rows.length === pageSize, totalEstimate };
}

function toTursoValue(
  value: unknown,
  spec: TableSpec,
  column: string
): string | number | null {
  if (value === null || value === undefined) return null;
  if (spec.boolCols.includes(column)) return value === true ? 1 : 0;
  if (spec.jsonCols.includes(column)) {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'string') return value;
  return String(value);
}

async function backfillTable(
  spec: TableSpec,
  turso: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  pageSize: number,
  dryRun: boolean
): Promise<{ copied: number; skipped: number }> {
  let offset = 0;
  let copied = 0;
  let skipped = 0;
  let insertStmt: { sql: string; columns: string[] } | null = null;

  for (;;) {
    const { rows, hasMore } = await fetchSupabasePage(
      supabaseUrl,
      serviceKey,
      spec.table,
      offset,
      pageSize
    );
    if (rows.length === 0) break;

    if (!dryRun) {
      const rowColumns = Object.keys(rows[0]).filter((c) => c !== 'id');
      if (!insertStmt || insertStmt.columns.join(',') !== rowColumns.join(',')) {
        const placeholders = rowColumns.map(() => '?').join(', ');
        const conflict =
          spec.conflictKeys.length > 0
            ? ` ON CONFLICT (${spec.conflictKeys.join(', ')}) DO NOTHING`
            : '';
        insertStmt = {
          columns: rowColumns,
          sql: `INSERT INTO ${spec.table} (${rowColumns.join(', ')}) VALUES (${placeholders})${conflict}`,
        };
      }
      const batch = rows.map((row) => ({
        sql: insertStmt!.sql,
        args: insertStmt!.columns.map((c) => toTursoValue(row[c], spec, c)),
      }));
      const results = await turso.batch(batch, 'write');
      // rowsAffected counts inserted rows only; the remainder were ignored
      // duplicates from earlier runs (or earlier pages).
      const inserted = results.reduce((sum, r) => sum + Number(r.rowsAffected ?? 0), 0);
      copied += inserted;
      skipped += rows.length - inserted;
    } else {
      copied += rows.length;
    }

    offset += rows.length;
    if (!hasMore) break;
    console.log(`[backfill] ${spec.table}: ${offset} rows scanned…`);
  }
  return { copied, skipped };
}

async function main(): Promise<void> {
  const { dryRun, only, pageSize } = parseArgs();
  const supabaseUrl = readEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  const tursoUrl = readEnv('TURSO_OPS_DATABASE_URL');
  const tursoToken = readEnv('TURSO_OPS_AUTH_TOKEN');

  const turso = createClient({ url: tursoUrl, authToken: tursoToken });
  const specs = only ? TABLE_SPECS.filter((s) => s.table === only) : TABLE_SPECS;
  if (specs.length === 0) throw new Error(`Unknown table: ${only}`);

  const summary: Record<string, { copied: number; skipped: number }> = {};
  for (const spec of specs) {
    const started = Date.now();
    const result = await backfillTable(spec, turso, supabaseUrl, serviceKey, pageSize, dryRun);
    summary[spec.table] = result;
    console.log(
      `[backfill] ${spec.table}: copied=${result.copied} skipped(dupes)=${result.skipped} in ${((Date.now() - started) / 1000).toFixed(1)}s`
    );
  }
  console.log(JSON.stringify({ dryRun, summary }, null, 2));
}

main().catch((error) => {
  console.error('[backfill] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
