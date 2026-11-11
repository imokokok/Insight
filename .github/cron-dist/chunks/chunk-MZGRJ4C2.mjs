import { createRequire as __createRequire } from 'node:module'; import { fileURLToPath as __fileURLToPath } from 'node:url'; import { dirname as __pathDirname } from 'node:path'; const require = __createRequire(import.meta.url); const __filename = __fileURLToPath(import.meta.url); const __dirname = __pathDirname(__filename);
var TURSO_OPS_SCHEMA_VERSION=7,MARKET_REFERENCE_SNAPSHOTS_DDL=[`CREATE TABLE IF NOT EXISTS market_reference_snapshots (
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
  )`,`CREATE INDEX IF NOT EXISTS market_reference_symbol_ts_idx
     ON market_reference_snapshots (symbol, snapshot_ts DESC)`,`CREATE INDEX IF NOT EXISTS market_reference_ts_idx
     ON market_reference_snapshots (snapshot_ts DESC)`,`CREATE INDEX IF NOT EXISTS market_reference_success_symbol_ts_idx
     ON market_reference_snapshots (symbol, snapshot_ts DESC)
     WHERE is_success = 1`,`CREATE INDEX IF NOT EXISTS market_reference_retention_idx
     ON market_reference_snapshots (snapshot_ts)`],HOURLY_PRICE_SNAPSHOTS_DDL=[`CREATE TABLE IF NOT EXISTS hourly_price_snapshots (
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
  )`,`CREATE INDEX IF NOT EXISTS hourly_price_snapshots_symbol_hour_idx
     ON hourly_price_snapshots (symbol, snapshot_hour DESC)`,`CREATE INDEX IF NOT EXISTS hourly_price_snapshots_hour_idx
     ON hourly_price_snapshots (snapshot_hour DESC)`,`CREATE INDEX IF NOT EXISTS hourly_price_snapshots_retention_idx
     ON hourly_price_snapshots (snapshot_hour)`],PRICE_SLOT_PROJECTION_RUNS_DDL=[`CREATE TABLE IF NOT EXISTS price_slot_projection_runs (
    slot_ms INTEGER NOT NULL,
    input_hash TEXT NOT NULL,
    raw_digest TEXT NOT NULL,
    partition_key TEXT NOT NULL,
    hourly_written INTEGER NOT NULL,
    projected_at TEXT NOT NULL,
    PRIMARY KEY (slot_ms, input_hash)
  )`],MANIP_COST_POOL_SNAPSHOTS_DDL=[`CREATE TABLE IF NOT EXISTS manip_cost_pool_snapshots (
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
  )`,`CREATE INDEX IF NOT EXISTS manip_cost_pool_snapshots_ts_idx
     ON manip_cost_pool_snapshots (snapshot_ts DESC)`,`CREATE INDEX IF NOT EXISTS manip_cost_pool_snapshots_retention_idx
     ON manip_cost_pool_snapshots (snapshot_ts)`],COVERAGE_SLO_DDL=[`CREATE TABLE IF NOT EXISTS coverage_slo_targets (
    id TEXT PRIMARY KEY,
    asset TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    policy_id TEXT NOT NULL,
    objective_bps INTEGER NOT NULL,
    enrolled_at TEXT NOT NULL
  )`,`CREATE TABLE IF NOT EXISTS coverage_slo_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id TEXT NOT NULL,
    slot INTEGER NOT NULL,
    status TEXT NOT NULL,
    signed_ready INTEGER NOT NULL CHECK (signed_ready IN (0, 1)),
    reasons TEXT NOT NULL,
    proof TEXT,
    recorded_at TEXT NOT NULL,
    CONSTRAINT coverage_slo_samples_unique UNIQUE (target_id, slot)
  )`,`CREATE INDEX IF NOT EXISTS coverage_slo_samples_target_slot_idx
     ON coverage_slo_samples (target_id, slot DESC)`,`CREATE INDEX IF NOT EXISTS coverage_slo_samples_retention_idx
     ON coverage_slo_samples (recorded_at)`],FEED_HEALTH_SNAPSHOTS_DDL=[`CREATE TABLE IF NOT EXISTS feed_health_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    chain TEXT,
    evaluated_at TEXT NOT NULL,
    verdict TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    reason TEXT NOT NULL,
    max_deviation_pct REAL,
    agreement REAL NOT NULL,
    participant_count INTEGER NOT NULL,
    outlier_count INTEGER NOT NULL,
    stale_count INTEGER NOT NULL,
    consensus_price REAL,
    ml_risk_score REAL,
    ml_risk_level TEXT,
    avg_reputation REAL,
    min_reputation REAL,
    quorum_satisfied INTEGER,
    trust_score REAL,
    trust_level TEXT,
    created_at TEXT NOT NULL
  )`,`CREATE INDEX IF NOT EXISTS feed_health_snapshots_symbol_ts_idx
     ON feed_health_snapshots (symbol, chain, evaluated_at DESC)`,`CREATE INDEX IF NOT EXISTS feed_health_snapshots_retention_idx
     ON feed_health_snapshots (evaluated_at)`],DEX_MARKET_DDL=[`CREATE TABLE IF NOT EXISTS dex_market_sync_cursors (
    chain_id INTEGER NOT NULL,
    dex TEXT NOT NULL,
    pool_address TEXT NOT NULL,
    last_scanned_block TEXT NOT NULL,
    last_scanned_timestamp TEXT NOT NULL,
    coverage_started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (chain_id, dex, pool_address)
  )`,`CREATE TABLE IF NOT EXISTS dex_market_swap_events (
    chain_id INTEGER NOT NULL,
    dex TEXT NOT NULL,
    pool_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    log_index TEXT NOT NULL,
    block_number TEXT NOT NULL,
    block_hash TEXT NOT NULL,
    block_timestamp TEXT NOT NULL,
    amount0_raw TEXT NOT NULL,
    amount1_raw TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (chain_id, dex, pool_address, tx_hash, log_index)
  )`,`CREATE INDEX IF NOT EXISTS dex_market_swap_events_window_idx
     ON dex_market_swap_events (chain_id, dex, pool_address, block_timestamp DESC)`,`CREATE INDEX IF NOT EXISTS dex_market_swap_events_retention_idx
     ON dex_market_swap_events (block_timestamp)`],REPUTATION_HISTORY_DDL=[`CREATE TABLE IF NOT EXISTS reputation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    symbol TEXT NOT NULL,
    price REAL,
    consensus_price REAL,
    deviation_pct REAL,
    latency_ms INTEGER,
    confidence REAL,
    is_success INTEGER NOT NULL DEFAULT 1 CHECK (is_success IN (0, 1)),
    error_message TEXT,
    snapshot_time TEXT NOT NULL,
    created_at TEXT,
    data_age_seconds INTEGER,
    failure_mode TEXT NOT NULL DEFAULT 'none',
    signal_vector TEXT,
    consensus_context TEXT
  )`,`CREATE INDEX IF NOT EXISTS reputation_history_provider_ts_idx
     ON reputation_history (provider, snapshot_time)`,`CREATE INDEX IF NOT EXISTS reputation_history_retention_idx
     ON reputation_history (snapshot_time)`],ORACLE_REPUTATION_DDL=[`CREATE TABLE IF NOT EXISTS oracle_reputation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    overall_score REAL NOT NULL DEFAULT 0,
    accuracy_score REAL NOT NULL DEFAULT 0,
    uptime_percentage REAL NOT NULL DEFAULT 100,
    avg_latency_ms INTEGER NOT NULL DEFAULT 0,
    avg_deviation_pct REAL NOT NULL DEFAULT 0,
    reliability_score REAL NOT NULL DEFAULT 0,
    freshness_score REAL NOT NULL DEFAULT 0,
    total_queries INTEGER NOT NULL DEFAULT 0,
    failed_queries INTEGER NOT NULL DEFAULT 0,
    supported_symbols_count INTEGER NOT NULL DEFAULT 0,
    supported_chains_count INTEGER NOT NULL DEFAULT 0,
    last_calculated_at TEXT,
    created_at TEXT,
    updated_at TEXT,
    CONSTRAINT oracle_reputation_provider_unique UNIQUE (provider)
  )`],OPS_SCHEMA_META_DDL=[`CREATE TABLE IF NOT EXISTS ops_schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`],ALL_DDL=[...OPS_SCHEMA_META_DDL,...MARKET_REFERENCE_SNAPSHOTS_DDL,...HOURLY_PRICE_SNAPSHOTS_DDL,...PRICE_SLOT_PROJECTION_RUNS_DDL,...MANIP_COST_POOL_SNAPSHOTS_DDL,...COVERAGE_SLO_DDL,...FEED_HEALTH_SNAPSHOTS_DDL,...DEX_MARKET_DDL,...REPUTATION_HISTORY_DDL,...ORACLE_REPUTATION_DDL];function tursoOpsMigrations(){return ALL_DDL}async function isTursoOpsSchemaCurrent(client){try{let result=await client.execute("SELECT value FROM ops_schema_meta WHERE key = 'schema_version'");return Number(result.rows[0]?.value)===7}catch{return!1}}async function ensureCoverageTargetsEnrolledAt(client){let info=await client.execute("PRAGMA table_info(coverage_slo_targets)");if(info.rows.length===0)return;info.rows.some(row=>String(row.name)==="enrolled_at")||await client.execute(`ALTER TABLE coverage_slo_targets
       ADD COLUMN enrolled_at TEXT NOT NULL DEFAULT ''`)}async function ensureTursoOpsSchema(client){await ensureCoverageTargetsEnrolledAt(client);let current=!1;try{current=await isTursoOpsSchemaCurrent(client)}catch{current=!1}if(!current){for(let ddl of ALL_DDL)await client.execute(ddl);await client.execute(`INSERT INTO ops_schema_meta (key, value)
     VALUES ('schema_version', '7')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`)}}export{TURSO_OPS_SCHEMA_VERSION,tursoOpsMigrations,isTursoOpsSchemaCurrent,ensureTursoOpsSchema};
