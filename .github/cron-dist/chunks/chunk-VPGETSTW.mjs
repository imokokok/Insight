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
    projection_attempts INTEGER NOT NULL DEFAULT 0,
    projection_last_error TEXT,
    projection_retry_after_ms INTEGER,
    projection_quarantined_at_ms INTEGER,
    created_at_ms INTEGER NOT NULL
  )`,`CREATE TABLE IF NOT EXISTS snapshot_ingest_leases (
    slot_ms INTEGER PRIMARY KEY,
    lease_id TEXT NOT NULL,
    lease_expires_at_ms INTEGER NOT NULL,
    trigger_source TEXT NOT NULL,
    completed_at_ms INTEGER,
    last_error TEXT,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
  )`,`CREATE INDEX IF NOT EXISTS snapshot_ingest_leases_active_idx
    ON snapshot_ingest_leases(completed_at_ms, lease_expires_at_ms)`,`CREATE TABLE IF NOT EXISTS feed_registry_snapshots (
    registry_key TEXT PRIMARY KEY,
    version_hash TEXT NOT NULL,
    canonical_payload TEXT NOT NULL,
    feed_count INTEGER NOT NULL,
    published_at_ms INTEGER NOT NULL
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
    ON snapshot_slots(supabase_acknowledged_at_ms, projection_quarantined_at_ms, slot_ms)`,`CREATE TABLE IF NOT EXISTS settlement_market_watch (
    market_slug TEXT PRIMARY KEY,
    gamma_id TEXT NOT NULL,
    question TEXT NOT NULL,
    asset TEXT NOT NULL,
    window_seconds INTEGER NOT NULL CHECK (window_seconds BETWEEN 60 AND 604800),
    window_start_ms INTEGER NOT NULL,
    window_end_ms INTEGER NOT NULL,
    settlement_venue TEXT NOT NULL,
    resolution_source_url TEXT,
    closed INTEGER NOT NULL CHECK (closed IN (0, 1)),
    declared_outcome TEXT CHECK (declared_outcome IN ('Up', 'Down')),
    outcome_prices_json TEXT,
    first_seen_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
  )`,`CREATE INDEX IF NOT EXISTS settlement_market_watch_window_idx
    ON settlement_market_watch(window_end_ms)`,`CREATE INDEX IF NOT EXISTS settlement_market_watch_closed_idx
    ON settlement_market_watch(closed, window_end_ms)`,`CREATE TABLE IF NOT EXISTS settlement_window_candles (
    market_slug TEXT NOT NULL,
    venue TEXT NOT NULL,
    interval_seconds INTEGER NOT NULL,
    bucket_ts INTEGER NOT NULL,
    open TEXT NOT NULL,
    high TEXT NOT NULL,
    low TEXT NOT NULL,
    close TEXT NOT NULL,
    volume TEXT,
    rights_scope TEXT NOT NULL,
    delivery_policy TEXT NOT NULL,
    collected_at_ms INTEGER NOT NULL,
    PRIMARY KEY (market_slug, venue, interval_seconds, bucket_ts)
  )`,`CREATE INDEX IF NOT EXISTS settlement_window_candles_market_idx
    ON settlement_window_candles(market_slug, bucket_ts)`,`CREATE TABLE IF NOT EXISTS settlement_evidence_packs (
    market_slug TEXT PRIMARY KEY,
    schema_version INTEGER NOT NULL,
    canonical_payload TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    uid TEXT,
    attester TEXT,
    signature TEXT,
    grade TEXT NOT NULL CHECK (grade IN ('consistent', 'inconsistent', 'insufficient_data')),
    created_at_ms INTEGER NOT NULL
  )`,`CREATE TABLE IF NOT EXISTS price_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    symbol TEXT NOT NULL,
    chain TEXT,
    price_e8 TEXT NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    confidence_e4 INTEGER,
    source TEXT,
    created_at_ms INTEGER NOT NULL,
    ttl_ms INTEGER NOT NULL,
    failure_mode TEXT,
    signal_vector_json TEXT,
    decimals INTEGER,
    verification_json TEXT,
    ingestion_timestamp_ms INTEGER,
    metadata_fallback INTEGER CHECK (metadata_fallback IN (0, 1))
  )`,`CREATE INDEX IF NOT EXISTS price_records_latest_idx
    ON price_records(provider, symbol, chain, timestamp_ms DESC)`,`CREATE INDEX IF NOT EXISTS price_records_ttl_idx
    ON price_records(ttl_ms)`,`CREATE INDEX IF NOT EXISTS price_records_timestamp_idx
    ON price_records(timestamp_ms DESC)`],migrationStatements={3:["ALTER TABLE snapshot_slots ADD COLUMN projection_attempts INTEGER NOT NULL DEFAULT 0","ALTER TABLE snapshot_slots ADD COLUMN projection_last_error TEXT","ALTER TABLE snapshot_slots ADD COLUMN projection_retry_after_ms INTEGER","ALTER TABLE snapshot_slots ADD COLUMN projection_quarantined_at_ms INTEGER","CREATE INDEX IF NOT EXISTS snapshot_slots_pending_retry_idx ON snapshot_slots(supabase_acknowledged_at_ms, projection_quarantined_at_ms, projection_retry_after_ms, slot_ms)"],4:[`CREATE TABLE IF NOT EXISTS snapshot_ingest_leases (
      slot_ms INTEGER PRIMARY KEY,
      lease_id TEXT NOT NULL,
      lease_expires_at_ms INTEGER NOT NULL,
      trigger_source TEXT NOT NULL,
      completed_at_ms INTEGER,
      last_error TEXT,
      created_at_ms INTEGER NOT NULL,
      updated_at_ms INTEGER NOT NULL
    )`,"CREATE INDEX IF NOT EXISTS snapshot_ingest_leases_active_idx ON snapshot_ingest_leases(completed_at_ms, lease_expires_at_ms)"],5:[`CREATE TABLE IF NOT EXISTS feed_registry_snapshots (
      registry_key TEXT PRIMARY KEY,
      version_hash TEXT NOT NULL,
      canonical_payload TEXT NOT NULL,
      feed_count INTEGER NOT NULL,
      published_at_ms INTEGER NOT NULL
    )`],6:[`CREATE TABLE IF NOT EXISTS settlement_market_watch (
      market_slug TEXT PRIMARY KEY,
      gamma_id TEXT NOT NULL,
      question TEXT NOT NULL,
      asset TEXT NOT NULL,
      window_seconds INTEGER NOT NULL CHECK (window_seconds BETWEEN 60 AND 604800),
      window_start_ms INTEGER NOT NULL,
      window_end_ms INTEGER NOT NULL,
      settlement_venue TEXT NOT NULL,
      resolution_source_url TEXT,
      closed INTEGER NOT NULL CHECK (closed IN (0, 1)),
      declared_outcome TEXT CHECK (declared_outcome IN ('Up', 'Down')),
      outcome_prices_json TEXT,
      first_seen_ms INTEGER NOT NULL,
      updated_at_ms INTEGER NOT NULL
    )`,"CREATE INDEX IF NOT EXISTS settlement_market_watch_window_idx ON settlement_market_watch(window_end_ms)","CREATE INDEX IF NOT EXISTS settlement_market_watch_closed_idx ON settlement_market_watch(closed, window_end_ms)",`CREATE TABLE IF NOT EXISTS settlement_window_candles (
      market_slug TEXT NOT NULL,
      venue TEXT NOT NULL,
      interval_seconds INTEGER NOT NULL,
      bucket_ts INTEGER NOT NULL,
      open TEXT NOT NULL,
      high TEXT NOT NULL,
      low TEXT NOT NULL,
      close TEXT NOT NULL,
      volume TEXT,
      rights_scope TEXT NOT NULL,
      delivery_policy TEXT NOT NULL,
      collected_at_ms INTEGER NOT NULL,
      PRIMARY KEY (market_slug, venue, interval_seconds, bucket_ts)
    )`,"CREATE INDEX IF NOT EXISTS settlement_window_candles_market_idx ON settlement_window_candles(market_slug, bucket_ts)",`CREATE TABLE IF NOT EXISTS settlement_evidence_packs (
      market_slug TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      canonical_payload TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      uid TEXT,
      attester TEXT,
      signature TEXT,
      grade TEXT NOT NULL CHECK (grade IN ('consistent', 'inconsistent', 'insufficient_data')),
      created_at_ms INTEGER NOT NULL
    )`],7:[`CREATE TABLE IF NOT EXISTS price_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      symbol TEXT NOT NULL,
      chain TEXT,
      price_e8 TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      confidence_e4 INTEGER,
      source TEXT,
      created_at_ms INTEGER NOT NULL,
      ttl_ms INTEGER NOT NULL,
      failure_mode TEXT,
      signal_vector_json TEXT,
      decimals INTEGER,
      verification_json TEXT,
      ingestion_timestamp_ms INTEGER,
      metadata_fallback INTEGER CHECK (metadata_fallback IN (0, 1))
    )`,"CREATE INDEX IF NOT EXISTS price_records_latest_idx ON price_records(provider, symbol, chain, timestamp_ms DESC)","CREATE INDEX IF NOT EXISTS price_records_ttl_idx ON price_records(ttl_ms)","CREATE INDEX IF NOT EXISTS price_records_timestamp_idx ON price_records(timestamp_ms DESC)"]},initializedClients=new WeakSet;async function applyAdditiveMigration(client,statements){for(let statement of statements)try{await client.execute(statement)}catch(error){let sql=typeof statement=="string"?statement:statement.sql,message=error instanceof Error?error.message:String(error);if(/^ALTER TABLE\s+snapshot_slots\s+ADD COLUMN/i.test(sql)&&/duplicate column name/i.test(message))continue;throw error}}async function ensureTursoPriceSchema(client,nowMs=Date.now()){if(initializedClients.has(client))return;let versionResult,initialized=!1;try{versionResult=await client.execute("SELECT max(version) AS version FROM _insight_schema_migrations")}catch(error){let message=error instanceof Error?error.message:String(error);if(!/no such table|does not exist/i.test(message))throw error;await client.batch(ddl,"write"),initialized=!0,versionResult=await client.execute("SELECT max(version) AS version FROM _insight_schema_migrations")}let rawVersion=versionResult.rows[0]?.version,version=rawVersion==null?0:Number(rawVersion);if(!Number.isInteger(version)||version>7)throw new Error("Turso price schema version is unsupported");if(version===7){initializedClients.add(client);return}if(!initialized&&version>0)for(let migration=version+1;migration<=7;migration++){let statements=migrationStatements[migration];statements?.length&&await applyAdditiveMigration(client,statements)}await client.batch(ddl,"write");let seedStatements=DEFAULT_TURSO_PRICE_POLICIES.map(policy=>({sql:`INSERT OR IGNORE INTO persistence_policies(
      policy_key,resolution,price_change_bps,deviation_change_bps,
      data_age_change_seconds,confidence_change_e4,updated_at_ms
    ) VALUES(?,?,?,?,?,?,?)`,args:[policy.policyKey,policy.resolution,policy.priceChangeBps,policy.deviationChangeBps,policy.dataAgeChangeSeconds,policy.confidenceChangeE4,nowMs]}));seedStatements.push({sql:`INSERT INTO _insight_schema_migrations(version,applied_at_ms) VALUES(?,?)
      ON CONFLICT(version) DO UPDATE SET applied_at_ms=excluded.applied_at_ms`,args:[7,nowMs]}),await client.batch(seedStatements,"write"),initializedClients.add(client)}export{ensureTursoPriceSchema};
