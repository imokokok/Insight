import {
  readTursoFeedRegistryPolicy,
  type TursoFeedRegistryPolicy,
} from '@/lib/turso/price/client';
import { readTursoFeedRegistry } from '@/lib/turso/price/controlPlaneRepository';
import { ensureTursoPriceSchema } from '@/lib/turso/price/schema';

import type { Client, InValue } from '@libsql/client';

/**
 * Collector-side mirror of the Supabase
 * `refresh_oracle_feed_cadence_baselines` RPC (migrations 0044/0072).
 *
 * The egress-restricted Supabase project cannot serve the RPC any more, so the
 * feed-cadence cron computes the same statistic directly from the Turso raw
 * stream: p90 of `price_snapshots.data_age_seconds` over the trailing window,
 * per (provider, symbol, chain_id), restricted to the trusted provider
 * allow-list, gated by a minimum sample count, and written back for every
 * active feed (NULL for feeds without enough evidence, exactly like the RPC's
 * LEFT JOIN baseline set).
 *
 * The active-feed enumeration comes from the mirrored feed registry instead of
 * `oracle_feeds.is_active` — the registry is the Turso-side authority that
 * collection already trusts, and it only ever contains active feeds.
 */
export const TRUSTED_CADENCE_PROVIDERS: readonly string[] = [
  'chainlink',
  'api3',
  'supra',
  'twap',
  'flare',
  'switchboard',
  'winklink',
];

export interface TursoFeedCadenceBaselineResult {
  /** Active feeds written this run (parity with the RPC's updated_count). */
  updated: number;
  /** Active feeds scanned this run (parity with the RPC's scanned_count). */
  scanned: number;
}

export interface TursoFeedCadenceOptions {
  lookbackHours?: number;
  minSamples?: number;
  nowMs?: number;
}

const DEFAULT_LOOKBACK_HOURS = 48;
const DEFAULT_MIN_SAMPLES = 12;

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  const source = value === undefined || value === null ? fallback : value;
  if (!Number.isFinite(source)) throw new Error('Invalid feed-cadence parameter');
  return Math.max(min, Math.min(max, Math.round(source)));
}

/**
 * PG `percentile_cont(0.9) WITHIN GROUP (ORDER BY ...)` — continuous
 * interpolation between adjacent order statistics.
 */
function percentileCont(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) throw new Error('percentileCont of empty sample set');
  if (sorted.length === 1) return sorted[0];
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const fraction = index - lower;
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

interface WindowAggregate {
  sampleCount: number;
  ages: number[];
}

/**
 * Scan the lookback window once and aggregate data-age samples per feed. The
 * window is bounded by the raw-stream retention (30 days default), so the
 * default 48-hour lookback always has its data available in Turso.
 */
async function collectWindowAggregates(
  client: Client,
  sinceMs: number
): Promise<Map<string, WindowAggregate>> {
  const result = await client.execute({
    sql: `SELECT provider, symbol, chain_id, data_age_seconds
      FROM price_snapshots
      WHERE slot_ms >= ? AND data_age_seconds IS NOT NULL AND data_age_seconds >= 0`,
    args: [sinceMs],
  });
  const aggregates = new Map<string, WindowAggregate>();
  for (const row of result.rows) {
    const record = row as unknown as {
      provider: string;
      symbol: string;
      chain_id: number | string;
      data_age_seconds: number | string;
    };
    const key = `${record.provider}\u0000${record.symbol}\u0000${record.chain_id}`;
    let aggregate = aggregates.get(key);
    if (!aggregate) {
      aggregate = { sampleCount: 0, ages: [] };
      aggregates.set(key, aggregate);
    }
    aggregate.sampleCount += 1;
    aggregate.ages.push(Number(record.data_age_seconds));
  }
  return aggregates;
}

/**
 * Recompute cadence baselines for every active feed from the Turso raw stream
 * and persist them to `feed_cadence_baselines`. Rows for feeds that have left
 * the active registry are removed by the full-refresh sweep, keeping the table
 * aligned with the registry rather than accumulating orphans.
 *
 * Throws when the registry mirror is missing or stale: a silently-degraded
 * active-feed list would write baselines for feeds the control plane has
 * deactivated, and the cron run should surface the impairment instead.
 */
export async function refreshTursoFeedCadenceBaselines(
  client: Client,
  options: TursoFeedCadenceOptions = {},
  policy: TursoFeedRegistryPolicy = readTursoFeedRegistryPolicy()
): Promise<TursoFeedCadenceBaselineResult> {
  await ensureTursoPriceSchema(client);

  const nowMs = options.nowMs ?? Date.now();
  const lookbackHours = clampInt(options.lookbackHours, DEFAULT_LOOKBACK_HOURS, 1, 720);
  const minSamples = clampInt(options.minSamples, DEFAULT_MIN_SAMPLES, 1, 10_000);

  const registry = await readTursoFeedRegistry(client);
  if (!registry) {
    throw new Error('Turso feed registry missing; cannot enumerate active feeds');
  }
  const registryAgeMs = nowMs - registry.publishedAtMs;
  if (registryAgeMs < 0 || registryAgeMs > policy.maxAgeMs) {
    throw new Error(
      `Turso feed registry mirror is stale (ageMs=${registryAgeMs}, maxAgeMs=${policy.maxAgeMs})`
    );
  }

  const trusted = new Set(TRUSTED_CADENCE_PROVIDERS);
  const sinceMs = nowMs - lookbackHours * 3_600_000;
  const aggregates = await collectWindowAggregates(client, sinceMs);

  const statements: { sql: string; args: InValue[] }[] = [];
  for (const feed of registry.feeds) {
    const key = `${feed.provider}\u0000${feed.symbol}\u0000${feed.chain_id}`;
    const aggregate = aggregates.get(key);
    let p90Seconds: number | null = null;
    if (trusted.has(feed.provider) && aggregate && aggregate.sampleCount >= minSamples) {
      aggregate.ages.sort((a, b) => a - b);
      // PG round() is half-away-from-zero; every sample is non-negative, so
      // Math.round matches exactly here.
      p90Seconds = Math.round(percentileCont(aggregate.ages, 0.9));
    }
    statements.push({
      sql: `INSERT INTO feed_cadence_baselines(provider,symbol,chain_id,p90_seconds,updated_at_ms)
        VALUES(?,?,?,?,?)
        ON CONFLICT(provider,symbol,chain_id) DO UPDATE SET
          p90_seconds=excluded.p90_seconds,
          updated_at_ms=excluded.updated_at_ms`,
      args: [feed.provider, feed.symbol, feed.chain_id, p90Seconds, nowMs],
    });
  }
  statements.push({
    sql: 'DELETE FROM feed_cadence_baselines WHERE updated_at_ms < ?',
    args: [nowMs],
  });

  // Chunked batch keeps the statement count per round trip bounded for large
  // registries while preserving single-run atomicity per chunk.
  const chunkSize = 200;
  for (let start = 0; start < statements.length; start += chunkSize) {
    await client.batch(statements.slice(start, start + chunkSize), 'write');
  }

  return { updated: registry.feeds.length, scanned: registry.feeds.length };
}

export interface TursoFeedCadenceBaselineRow {
  provider: string;
  symbol: string;
  chain_id: number;
  p90_seconds: number | null;
  updated_at_ms: number;
}

/** Phase-B read helper: baselines for one symbol, most lenient per provider. */
export async function readTursoFeedCadenceBaselines(
  client: Client,
  symbol: string
): Promise<Map<string, number | null>> {
  const result = await client.execute({
    sql: `SELECT provider, p90_seconds
      FROM feed_cadence_baselines
      WHERE symbol = ?`,
    args: [symbol],
  });
  const map = new Map<string, number | null>();
  for (const row of result.rows) {
    const record = row as unknown as { provider: string; p90_seconds: number | string | null };
    const value = record.p90_seconds === null ? null : Number(record.p90_seconds);
    const existing = map.get(record.provider);
    if (existing == null || (value != null && value > existing)) {
      map.set(record.provider, value);
    }
  }
  return map;
}
