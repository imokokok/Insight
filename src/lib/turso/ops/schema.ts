// Versioned DDL for the operational data plane that is migrating off Supabase
// (egress-quota retirement, 2026-11). Applied by scripts/turso/migrate-ops.mts
// and by ensureTursoOpsSchema() at run time when allowed.
//
// Postgres → SQLite transcription rules used throughout:
//   timestamptz        → TEXT (ISO-8601 UTC strings; comparisons stay lexicographic)
//   boolean            → INTEGER CHECK (col IN (0, 1))
//   double precision   → REAL
//   bigint identity    → INTEGER PRIMARY KEY AUTOINCREMENT
//   Postgres view with percentile_cont(0.5) is NOT ported (SQLite has no
//   ordered-set aggregate); hourly aggregates are computed on read by the
//   repository instead (see marketReferenceRepository.readHourlyAggregates).
// House typing convention (cf. price/schema.ts): type against the node
// entry's Client — the web client used at runtime is structurally compatible,
// and tests use the node client against file::memory: databases.
import type { Client } from '@libsql/client';

export const TURSO_OPS_SCHEMA_VERSION = 1;

const MARKET_REFERENCE_SNAPSHOTS_DDL = [
  `CREATE TABLE IF NOT EXISTS market_reference_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_ts TEXT NOT NULL,
    symbol TEXT NOT NULL,
    quote TEXT NOT NULL DEFAULT 'USD',
    exchange TEXT NOT NULL,
    ref_price REAL,
    volume REAL,
    bid REAL,
    ask REAL,
    bid_ask_spread_pct REAL,
    data_age_seconds INTEGER,
    source_observed_at TEXT,
    rights_scope TEXT NOT NULL DEFAULT 'research-quarantined',
    rights_reference TEXT,
    delivery_policy TEXT NOT NULL DEFAULT 'not-authorized',
    is_success INTEGER NOT NULL CHECK (is_success IN (0, 1)),
    error_message TEXT,
    collector_version TEXT,
    created_at TEXT NOT NULL,
    CONSTRAINT market_reference_snapshots_unique
      UNIQUE (snapshot_ts, symbol, quote, exchange)
  )`,
  `CREATE INDEX IF NOT EXISTS market_reference_symbol_ts_idx
     ON market_reference_snapshots (symbol, snapshot_ts DESC)`,
  `CREATE INDEX IF NOT EXISTS market_reference_ts_idx
     ON market_reference_snapshots (snapshot_ts DESC)`,
  `CREATE INDEX IF NOT EXISTS market_reference_success_symbol_ts_idx
     ON market_reference_snapshots (symbol, snapshot_ts DESC)
     WHERE is_success = 1`,
  // Retention support (90-day window per migration 0138) without a nightly
  // Postgres cron: the collector trims past-window rows on each run.
  `CREATE INDEX IF NOT EXISTS market_reference_retention_idx
     ON market_reference_snapshots (snapshot_ts)`,
];

const OPS_SCHEMA_META_DDL = [
  `CREATE TABLE IF NOT EXISTS ops_schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

const ALL_DDL: string[] = [...OPS_SCHEMA_META_DDL, ...MARKET_REFERENCE_SNAPSHOTS_DDL];

export function tursoOpsMigrations(): readonly string[] {
  return ALL_DDL;
}

/** True when every statement is already reflected in the live schema. */
export async function isTursoOpsSchemaCurrent(client: Client): Promise<boolean> {
  try {
    const result = await client.execute(
      `SELECT value FROM ops_schema_meta WHERE key = 'schema_version'`
    );
    return Number(result.rows[0]?.value) === TURSO_OPS_SCHEMA_VERSION;
  } catch {
    return false;
  }
}

/**
 * Idempotent schema application with the price-domain fast path: a cheap
 * version read short-circuits convergent databases, and DDL only runs when
 * the meta table is missing or behind.
 */
export async function ensureTursoOpsSchema(client: Client): Promise<void> {
  let current = false;
  try {
    current = await isTursoOpsSchemaCurrent(client);
  } catch {
    current = false;
  }
  if (current) return;

  for (const ddl of ALL_DDL) {
    await client.execute(ddl);
  }
  await client.execute(
    `INSERT INTO ops_schema_meta (key, value)
     VALUES ('schema_version', '${TURSO_OPS_SCHEMA_VERSION}')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
}
