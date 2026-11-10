import { createRequire as __createRequire } from 'node:module'; import { fileURLToPath as __fileURLToPath } from 'node:url'; import { dirname as __pathDirname } from 'node:path'; const require = __createRequire(import.meta.url); const __filename = __fileURLToPath(import.meta.url); const __dirname = __pathDirname(__filename);
import{createClient}from"./chunk-HP6HVOT3.mjs";function readTursoOpsConfig(env=process.env){let url=(env.TURSO_OPS_DATABASE_URL??env.TURSO_PRICE_DATABASE_URL)?.trim(),authToken=(env.TURSO_OPS_AUTH_TOKEN??env.TURSO_PRICE_AUTH_TOKEN)?.trim();if(!url||!/^(libsql|https):\/\//.test(url))throw new Error("Missing or invalid TURSO_OPS_DATABASE_URL (or TURSO_PRICE_DATABASE_URL)");if(!authToken)throw new Error("Missing TURSO_OPS_AUTH_TOKEN (or TURSO_PRICE_AUTH_TOKEN)");return{url,authToken}}var cachedOpsClient;function getTursoOpsClient(){if(!cachedOpsClient){let{url,authToken}=readTursoOpsConfig();cachedOpsClient=createClient({url,authToken,concurrency:4})}return cachedOpsClient}var MARKET_REFERENCE_SNAPSHOTS_DDL=[`CREATE TABLE IF NOT EXISTS market_reference_snapshots (
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
     ON manip_cost_pool_snapshots (snapshot_ts)`],OPS_SCHEMA_META_DDL=[`CREATE TABLE IF NOT EXISTS ops_schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`],ALL_DDL=[...OPS_SCHEMA_META_DDL,...MARKET_REFERENCE_SNAPSHOTS_DDL,...HOURLY_PRICE_SNAPSHOTS_DDL,...PRICE_SLOT_PROJECTION_RUNS_DDL,...MANIP_COST_POOL_SNAPSHOTS_DDL];async function isTursoOpsSchemaCurrent(client){try{let result=await client.execute("SELECT value FROM ops_schema_meta WHERE key = 'schema_version'");return Number(result.rows[0]?.value)===3}catch{return!1}}async function ensureTursoOpsSchema(client){let current=!1;try{current=await isTursoOpsSchemaCurrent(client)}catch{current=!1}if(!current){for(let ddl of ALL_DDL)await client.execute(ddl);await client.execute(`INSERT INTO ops_schema_meta (key, value)
     VALUES ('schema_version', '3')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`)}}export{getTursoOpsClient,ensureTursoOpsSchema};
