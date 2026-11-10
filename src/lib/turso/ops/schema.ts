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

export const TURSO_OPS_SCHEMA_VERSION = 5;

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

// Projection target for the Turso price-slot outbox (egress retirement v2).
// Mirrors Supabase public.hourly_price_snapshots: the independent projector
// (turso-price-project.yml) used to deliver business hourly rows back to
// Supabase via project_turso_price_slot; under TURSO_PRICE_PROJECTION_MODE=turso
// it lands here instead. Unique key matches the Postgres table.
const HOURLY_PRICE_SNAPSHOTS_DDL = [
  `CREATE TABLE IF NOT EXISTS hourly_price_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    symbol TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    price REAL NOT NULL,
    consensus_price REAL,
    deviation_pct REAL,
    latency_ms INTEGER,
    data_age_seconds INTEGER,
    confidence REAL,
    is_success INTEGER NOT NULL CHECK (is_success IN (0, 1)),
    error_message TEXT,
    snapshot_hour TEXT NOT NULL,
    created_at TEXT NOT NULL,
    CONSTRAINT hourly_price_snapshots_unique
      UNIQUE (provider, symbol, chain_id, snapshot_hour)
  )`,
  `CREATE INDEX IF NOT EXISTS hourly_price_snapshots_symbol_hour_idx
     ON hourly_price_snapshots (symbol, snapshot_hour DESC)`,
  `CREATE INDEX IF NOT EXISTS hourly_price_snapshots_hour_idx
     ON hourly_price_snapshots (snapshot_hour DESC)`,
  // 120-day retention window (matches Supabase hourly retention).
  `CREATE INDEX IF NOT EXISTS hourly_price_snapshots_retention_idx
     ON hourly_price_snapshots (snapshot_hour)`,
];

// Delivery ledger for projected slots (audit + replay detection). One row per
// (slot_ms, input_hash); re-projection of the same immutable payload is
// idempotent and flips the replayed flag on the response.
const PRICE_SLOT_PROJECTION_RUNS_DDL = [
  `CREATE TABLE IF NOT EXISTS price_slot_projection_runs (
    slot_ms INTEGER NOT NULL,
    input_hash TEXT NOT NULL,
    raw_digest TEXT NOT NULL,
    partition_key TEXT NOT NULL,
    hourly_written INTEGER NOT NULL,
    projected_at TEXT NOT NULL,
    PRIMARY KEY (slot_ms, input_hash)
  )`,
];

// Manipulation-cost domain (egress retirement v3). Mirrors Supabase
// public.manip_cost_pool_snapshots (migration 0082): one row per
// (snapshot_ts, pool_key), 365-day retention. JSON columns (pool_state,
// cost_curve) are stored as TEXT — the repository stringifies on write and
// parses on read.
const MANIP_COST_POOL_SNAPSHOTS_DDL = [
  `CREATE TABLE IF NOT EXISTS manip_cost_pool_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_ts TEXT NOT NULL,
    pool_key TEXT NOT NULL,
    chain TEXT NOT NULL,
    pool_addr TEXT NOT NULL,
    dex TEXT NOT NULL,
    fee_tier TEXT,
    block_number INTEGER,
    mid_price REAL,
    tvl_usd REAL,
    eth_usd_mid REAL,
    pool_state TEXT,
    cost_curve TEXT,
    is_success INTEGER NOT NULL CHECK (is_success IN (0, 1)),
    error_message TEXT,
    collector_version TEXT,
    CONSTRAINT manip_cost_pool_snapshots_unique
      UNIQUE (snapshot_ts, pool_key)
  )`,
  `CREATE INDEX IF NOT EXISTS manip_cost_pool_snapshots_ts_idx
     ON manip_cost_pool_snapshots (snapshot_ts DESC)`,
  // 365-day retention support (collector trims past-window rows per run).
  `CREATE INDEX IF NOT EXISTS manip_cost_pool_snapshots_retention_idx
     ON manip_cost_pool_snapshots (snapshot_ts)`,
];

// Coverage-SLO domain (egress retirement v4). Mirrors Supabase
// public.coverage_slo_targets (enrollment baseline) and
// public.coverage_slo_samples (one row per (target_id, slot), slot = 15-min
// grid). reasons/proof are JSON payloads stored as TEXT.
const COVERAGE_SLO_DDL = [
  `CREATE TABLE IF NOT EXISTS coverage_slo_targets (
    id TEXT PRIMARY KEY,
    asset TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    policy_id TEXT NOT NULL,
    objective_bps INTEGER NOT NULL,
    enrolled_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS coverage_slo_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id TEXT NOT NULL,
    slot INTEGER NOT NULL,
    status TEXT NOT NULL,
    signed_ready INTEGER NOT NULL CHECK (signed_ready IN (0, 1)),
    reasons TEXT NOT NULL,
    proof TEXT,
    recorded_at TEXT NOT NULL,
    CONSTRAINT coverage_slo_samples_unique UNIQUE (target_id, slot)
  )`,
  `CREATE INDEX IF NOT EXISTS coverage_slo_samples_target_slot_idx
     ON coverage_slo_samples (target_id, slot DESC)`,
  // 90-day retention support (migration 0138, keyed on recorded_at).
  `CREATE INDEX IF NOT EXISTS coverage_slo_samples_retention_idx
     ON coverage_slo_samples (recorded_at)`,
];

const OPS_SCHEMA_META_DDL = [
  `CREATE TABLE IF NOT EXISTS ops_schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

const ALL_DDL: string[] = [
  ...OPS_SCHEMA_META_DDL,
  ...MARKET_REFERENCE_SNAPSHOTS_DDL,
  ...HOURLY_PRICE_SNAPSHOTS_DDL,
  ...PRICE_SLOT_PROJECTION_RUNS_DDL,
  ...MANIP_COST_POOL_SNAPSHOTS_DDL,
  ...COVERAGE_SLO_DDL,
];

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
 * Column-level evolution step for v5: `CREATE TABLE IF NOT EXISTS` cannot add
 * a column to a table that already exists from v4, so the enrolled_at column
 * is checked via PRAGMA and added idempotently. The empty default keeps v4
 * rows valid; enrollment writes the real timestamp on first insert.
 */
async function ensureCoverageTargetsEnrolledAt(client: Client): Promise<void> {
  const info = await client.execute('PRAGMA table_info(coverage_slo_targets)');
  // An empty PRAGMA result means the table itself does not exist yet (fresh
  // database); the CREATE TABLE DDL below then already includes the column.
  if (info.rows.length === 0) return;
  const hasColumn = info.rows.some((row) => String(row.name) === 'enrolled_at');
  if (!hasColumn) {
    await client.execute(
      `ALTER TABLE coverage_slo_targets
       ADD COLUMN enrolled_at TEXT NOT NULL DEFAULT ''`
    );
  }
}

/**
 * Idempotent schema application with the price-domain fast path: a cheap
 * version read short-circuits convergent databases, and DDL only runs when
 * the meta table is missing or behind.
 */
export async function ensureTursoOpsSchema(client: Client): Promise<void> {
  // Column evolution runs even when the version marker looks current: a
  // previous release could have stamped the marker before its evolution step
  // existed (that is exactly how production lost the enrolled_at column).
  await ensureCoverageTargetsEnrolledAt(client);

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
