import type { Client, InStatement } from '@libsql/client';

// Version 2 introduced the Turso primary raw-price stream. Versions 3–5 add
// the independent ingest control plane: an atomic slot lease, a mirrored feed
// registry, and durable projection retry/quarantine state. Keep this local to
// Turso so a degraded Supabase control plane cannot stop raw capture.
export const TURSO_PRICE_SCHEMA_VERSION = 5;

export const DEFAULT_TURSO_PRICE_POLICIES = [
  {
    policyKey: '__default__',
    resolution: 'adaptive' as const,
    priceChangeBps: 25,
    deviationChangeBps: 10,
    dataAgeChangeSeconds: 300,
    confidenceChangeE4: 500,
  },
  ...[
    'BTC',
    'ETH',
    'SOL',
    'BNB',
    'XRP',
    'ADA',
    'DOGE',
    'LINK',
    'USDC',
    'USDT',
    'DAI',
    'WBTC',
    'CBBTC',
    'TBTC',
    'STETH',
    'WSTETH',
    'CBETH',
  ].map((policyKey) => ({
    policyKey,
    resolution: 'full' as const,
    priceChangeBps: 25,
    deviationChangeBps: 10,
    dataAgeChangeSeconds: 300,
    confidenceChangeE4: 500,
  })),
] as const;

const ddl: InStatement[] = [
  `CREATE TABLE IF NOT EXISTS _insight_schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at_ms INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS persistence_policies (
    policy_key TEXT PRIMARY KEY,
    resolution TEXT NOT NULL CHECK (resolution IN ('full', 'adaptive')),
    price_change_bps INTEGER NOT NULL CHECK (price_change_bps BETWEEN 1 AND 100000),
    deviation_change_bps INTEGER NOT NULL CHECK (deviation_change_bps BETWEEN 1 AND 100000),
    data_age_change_seconds INTEGER NOT NULL CHECK (data_age_change_seconds BETWEEN 1 AND 2147483647),
    confidence_change_e4 INTEGER NOT NULL CHECK (confidence_change_e4 BETWEEN 1 AND 10000),
    updated_at_ms INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS persistence_state (
    provider TEXT NOT NULL,
    symbol TEXT NOT NULL,
    chain_id INTEGER NOT NULL CHECK (chain_id >= 0),
    last_snapshot_ms INTEGER NOT NULL,
    last_price_e8 TEXT NOT NULL,
    last_deviation_e4 INTEGER,
    last_data_age_seconds INTEGER,
    last_confidence_e4 INTEGER,
    last_is_success INTEGER NOT NULL CHECK (last_is_success IN (0, 1)),
    last_error_message TEXT,
    updated_at_ms INTEGER NOT NULL,
    PRIMARY KEY (provider, symbol, chain_id)
  )`,
  `CREATE TABLE IF NOT EXISTS snapshot_slots (
    slot_ms INTEGER PRIMARY KEY,
    input_hash TEXT NOT NULL,
    raw_digest TEXT NOT NULL,
    canonical_payload TEXT NOT NULL,
    policy_version INTEGER NOT NULL,
    received_count INTEGER NOT NULL,
    candidate_count INTEGER NOT NULL,
    persisted_count INTEGER NOT NULL,
    summary_json TEXT NOT NULL,
    supabase_acknowledged_at_ms INTEGER,
    projection_attempts INTEGER NOT NULL DEFAULT 0,
    projection_last_error TEXT,
    projection_retry_after_ms INTEGER,
    projection_quarantined_at_ms INTEGER,
    created_at_ms INTEGER NOT NULL
  )`,
  // A lease is acquired before an executor reads upstream oracles. GitHub's
  // fallback runner and the independent Cloudflare scheduler can therefore
  // overlap safely without capturing a different payload for the same slot.
  `CREATE TABLE IF NOT EXISTS snapshot_ingest_leases (
    slot_ms INTEGER PRIMARY KEY,
    lease_id TEXT NOT NULL,
    lease_expires_at_ms INTEGER NOT NULL,
    trigger_source TEXT NOT NULL,
    completed_at_ms INTEGER,
    last_error TEXT,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS snapshot_ingest_leases_active_idx
    ON snapshot_ingest_leases(completed_at_ms, lease_expires_at_ms)`,
  // This immutable, versioned payload is the collector's last-known-good
  // feed registry. It intentionally mirrors only active feed configuration;
  // Supabase remains authoritative for administration and discovery.
  `CREATE TABLE IF NOT EXISTS feed_registry_snapshots (
    registry_key TEXT PRIMARY KEY,
    version_hash TEXT NOT NULL,
    canonical_payload TEXT NOT NULL,
    feed_count INTEGER NOT NULL,
    published_at_ms INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS price_snapshots (
    slot_ms INTEGER NOT NULL,
    snapshot_hour_ms INTEGER NOT NULL,
    provider TEXT NOT NULL,
    symbol TEXT NOT NULL,
    chain_id INTEGER NOT NULL CHECK (chain_id >= 0),
    price_e8 TEXT NOT NULL,
    consensus_price_e8 TEXT,
    deviation_e4 INTEGER,
    latency_ms INTEGER,
    data_age_seconds INTEGER,
    confidence_e4 INTEGER,
    is_success INTEGER NOT NULL CHECK (is_success IN (0, 1)),
    error_message TEXT,
    write_reason TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    PRIMARY KEY (slot_ms, provider, symbol, chain_id)
  )`,
  `CREATE INDEX IF NOT EXISTS price_snapshots_latest_idx
    ON price_snapshots(provider, symbol, chain_id, slot_ms DESC)`,
  `CREATE INDEX IF NOT EXISTS price_snapshots_symbol_history_idx
    ON price_snapshots(symbol, slot_ms DESC, provider, chain_id)`,
  // `price_latest` is the hot read model. It prevents current-price callers
  // from scanning the immutable event stream just to find one observation.
  `CREATE TABLE IF NOT EXISTS price_latest (
    provider TEXT NOT NULL,
    symbol TEXT NOT NULL,
    chain_id INTEGER NOT NULL CHECK (chain_id >= 0),
    slot_ms INTEGER NOT NULL,
    snapshot_hour_ms INTEGER NOT NULL,
    price_e8 TEXT NOT NULL,
    consensus_price_e8 TEXT,
    deviation_e4 INTEGER,
    latency_ms INTEGER,
    data_age_seconds INTEGER,
    confidence_e4 INTEGER,
    is_success INTEGER NOT NULL CHECK (is_success IN (0, 1)),
    error_message TEXT,
    write_reason TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    PRIMARY KEY (provider, symbol, chain_id)
  )`,
  `CREATE INDEX IF NOT EXISTS price_latest_symbol_idx
    ON price_latest(symbol, slot_ms DESC, provider, chain_id)`,
  // Maintenance is intentionally local to Turso. The event stream has a
  // short, bounded retention window while Supabase keeps the hourly business
  // projection for reporting and relational workflows.
  `CREATE TABLE IF NOT EXISTS price_maintenance (
    task_key TEXT PRIMARY KEY,
    last_run_ms INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS snapshot_slots_pending_idx
    ON snapshot_slots(supabase_acknowledged_at_ms, projection_quarantined_at_ms, slot_ms)`,
];

const migrationStatements: Readonly<Record<number, readonly InStatement[]>> = {
  3: [
    'ALTER TABLE snapshot_slots ADD COLUMN projection_attempts INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE snapshot_slots ADD COLUMN projection_last_error TEXT',
    'ALTER TABLE snapshot_slots ADD COLUMN projection_retry_after_ms INTEGER',
    'ALTER TABLE snapshot_slots ADD COLUMN projection_quarantined_at_ms INTEGER',
    'CREATE INDEX IF NOT EXISTS snapshot_slots_pending_retry_idx ON snapshot_slots(supabase_acknowledged_at_ms, projection_quarantined_at_ms, projection_retry_after_ms, slot_ms)',
  ],
  4: [
    `CREATE TABLE IF NOT EXISTS snapshot_ingest_leases (
      slot_ms INTEGER PRIMARY KEY,
      lease_id TEXT NOT NULL,
      lease_expires_at_ms INTEGER NOT NULL,
      trigger_source TEXT NOT NULL,
      completed_at_ms INTEGER,
      last_error TEXT,
      created_at_ms INTEGER NOT NULL,
      updated_at_ms INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS snapshot_ingest_leases_active_idx ON snapshot_ingest_leases(completed_at_ms, lease_expires_at_ms)',
  ],
  5: [
    `CREATE TABLE IF NOT EXISTS feed_registry_snapshots (
      registry_key TEXT PRIMARY KEY,
      version_hash TEXT NOT NULL,
      canonical_payload TEXT NOT NULL,
      feed_count INTEGER NOT NULL,
      published_at_ms INTEGER NOT NULL
    )`,
  ],
};

const initializedClients = new WeakSet<Client>();

async function applyAdditiveMigration(
  client: Client,
  statements: readonly InStatement[]
): Promise<void> {
  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (error) {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      const message = error instanceof Error ? error.message : String(error);
      // A process can be interrupted after SQLite commits an ADD COLUMN but
      // before the version row is advanced. Treat only that exact replay as
      // complete so a resumed migration remains additive; any other DDL error
      // remains visible rather than being masked as a successful upgrade.
      if (
        /^ALTER TABLE\s+snapshot_slots\s+ADD COLUMN/i.test(sql) &&
        /duplicate column name/i.test(message)
      ) {
        continue;
      }
      throw error;
    }
  }
}

export async function ensureTursoPriceSchema(
  client: Client,
  nowMs: number = Date.now()
): Promise<void> {
  if (initializedClients.has(client)) return;

  let versionResult;
  let initialized = false;
  try {
    // Once a database is initialized, a cheap version read replaces a batch of
    // CREATE IF NOT EXISTS statements on every collector invocation.
    versionResult = await client.execute(
      'SELECT max(version) AS version FROM _insight_schema_migrations'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/no such table|does not exist/i.test(message)) throw error;
    await client.batch(ddl, 'write');
    initialized = true;
    versionResult = await client.execute(
      'SELECT max(version) AS version FROM _insight_schema_migrations'
    );
  }
  const rawVersion = versionResult.rows[0]?.version;
  const version = rawVersion === null || rawVersion === undefined ? 0 : Number(rawVersion);
  if (!Number.isInteger(version) || version > TURSO_PRICE_SCHEMA_VERSION) {
    throw new Error('Turso price schema version is unsupported');
  }
  if (version === TURSO_PRICE_SCHEMA_VERSION) {
    initializedClients.add(client);
    return;
  }

  // A newly-created database already contains the newest table definitions.
  // Existing databases receive only the additive migrations after their
  // recorded version; SQLite's ADD COLUMN does not support IF NOT EXISTS.
  if (!initialized && version > 0) {
    for (let migration = version + 1; migration <= TURSO_PRICE_SCHEMA_VERSION; migration++) {
      const statements = migrationStatements[migration];
      if (statements?.length) await applyAdditiveMigration(client, statements);
    }
  }

  // CREATE IF NOT EXISTS closes concurrent first-initialization races and
  // protects installations that have a migration record but an incomplete
  // table set after an interrupted historical bootstrap.
  await client.batch(ddl, 'write');

  const seedStatements: InStatement[] = DEFAULT_TURSO_PRICE_POLICIES.map((policy) => ({
    sql: `INSERT OR IGNORE INTO persistence_policies(
      policy_key,resolution,price_change_bps,deviation_change_bps,
      data_age_change_seconds,confidence_change_e4,updated_at_ms
    ) VALUES(?,?,?,?,?,?,?)`,
    args: [
      policy.policyKey,
      policy.resolution,
      policy.priceChangeBps,
      policy.deviationChangeBps,
      policy.dataAgeChangeSeconds,
      policy.confidenceChangeE4,
      nowMs,
    ],
  }));
  seedStatements.push({
    sql: `INSERT INTO _insight_schema_migrations(version,applied_at_ms) VALUES(?,?)
      ON CONFLICT(version) DO UPDATE SET applied_at_ms=excluded.applied_at_ms`,
    args: [TURSO_PRICE_SCHEMA_VERSION, nowMs],
  });
  await client.batch(seedStatements, 'write');
  initializedClients.add(client);
}
