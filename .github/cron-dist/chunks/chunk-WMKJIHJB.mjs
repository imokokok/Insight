import { createRequire as __createRequire } from 'node:module'; import { fileURLToPath as __fileURLToPath } from 'node:url'; import { dirname as __pathDirname } from 'node:path'; const require = __createRequire(import.meta.url); const __filename = __fileURLToPath(import.meta.url); const __dirname = __pathDirname(__filename);
var DEFAULT_TURSO_PRICE_POLICIES=[{policyKey:"__default__",resolution:"adaptive",priceChangeBps:25,deviationChangeBps:10,dataAgeChangeSeconds:300,confidenceChangeE4:500},...["BTC","ETH","SOL","BNB","XRP","ADA","DOGE","LINK","USDC","USDT","DAI","WBTC","CBBTC","TBTC","STETH","WSTETH","CBETH"].map(policyKey=>({policyKey,resolution:"full",priceChangeBps:25,deviationChangeBps:10,dataAgeChangeSeconds:300,confidenceChangeE4:500}))],ddl=[`CREATE TABLE IF NOT EXISTS _insight_schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at_ms INTEGER NOT NULL
  )`,`CREATE TABLE IF NOT EXISTS persistence_policies (
    policy_key TEXT PRIMARY KEY,
    resolution TEXT NOT NULL CHECK (resolution IN ('full', 'adaptive')),
    price_change_bps INTEGER NOT NULL CHECK (price_change_bps BETWEEN 1 AND 100000),
    deviation_change_bps INTEGER NOT NULL CHECK (deviation_change_bps BETWEEN 1 AND 100000),
    data_age_change_seconds INTEGER NOT NULL CHECK (data_age_change_seconds BETWEEN 1 AND 2147483647),
    confidence_change_e4 INTEGER NOT NULL CHECK (confidence_change_e4 BETWEEN 1 AND 10000),
    updated_at_ms INTEGER NOT NULL
  )`,`CREATE TABLE IF NOT EXISTS persistence_state (
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
  )`,`CREATE TABLE IF NOT EXISTS snapshot_slots (
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
    created_at_ms INTEGER NOT NULL
  )`,`CREATE TABLE IF NOT EXISTS price_snapshots (
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
  )`,`CREATE INDEX IF NOT EXISTS price_snapshots_latest_idx
    ON price_snapshots(provider, symbol, chain_id, slot_ms DESC)`,`CREATE INDEX IF NOT EXISTS price_snapshots_symbol_history_idx
    ON price_snapshots(symbol, slot_ms DESC, provider, chain_id)`,`CREATE TABLE IF NOT EXISTS price_latest (
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
  )`,`CREATE INDEX IF NOT EXISTS price_latest_symbol_idx
    ON price_latest(symbol, slot_ms DESC, provider, chain_id)`,`CREATE TABLE IF NOT EXISTS price_maintenance (
    task_key TEXT PRIMARY KEY,
    last_run_ms INTEGER NOT NULL
  )`,`CREATE INDEX IF NOT EXISTS snapshot_slots_pending_idx
    ON snapshot_slots(supabase_acknowledged_at_ms, slot_ms)`],initializedClients=new WeakSet;async function ensureTursoPriceSchema(client,nowMs=Date.now()){if(initializedClients.has(client))return;let versionResult;try{versionResult=await client.execute("SELECT max(version) AS version FROM _insight_schema_migrations")}catch(error){let message=error instanceof Error?error.message:String(error);if(!/no such table|does not exist/i.test(message))throw error;await client.batch(ddl,"write"),versionResult=await client.execute("SELECT max(version) AS version FROM _insight_schema_migrations")}let rawVersion=versionResult.rows[0]?.version,version=rawVersion==null?0:Number(rawVersion);if(!Number.isInteger(version)||version>2)throw new Error("Turso price schema version is unsupported");if(version===2){initializedClients.add(client);return}await client.batch(ddl,"write");let seedStatements=DEFAULT_TURSO_PRICE_POLICIES.map(policy=>({sql:`INSERT OR IGNORE INTO persistence_policies(
      policy_key,resolution,price_change_bps,deviation_change_bps,
      data_age_change_seconds,confidence_change_e4,updated_at_ms
    ) VALUES(?,?,?,?,?,?,?)`,args:[policy.policyKey,policy.resolution,policy.priceChangeBps,policy.deviationChangeBps,policy.dataAgeChangeSeconds,policy.confidenceChangeE4,nowMs]}));seedStatements.push({sql:"INSERT OR IGNORE INTO _insight_schema_migrations(version,applied_at_ms) VALUES(?,?)",args:[2,nowMs]}),await client.batch(seedStatements,"write"),initializedClients.add(client)}export{ensureTursoPriceSchema};
