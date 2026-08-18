/**
 * Shared oracle price-snapshot collection logic.
 *
 * Extracted from `src/app/api/cron/daily-report/route.ts` so the same pipeline
 * runs from BOTH the Vercel cron route AND the GitHub Actions
 * `scripts/collect-snapshot.ts` job. The GH Actions job escapes Vercel's 60s
 * serverless timeout and runs at 15-minute cadence, dual-writing to
 * `hourly_price_snapshots` (upsert, for the daily report) and the new
 * `price_snapshots` table (append, 15-min grain, for ML/anomaly detection).
 *
 * The route's behaviour is unchanged: `collectSnapshot()` performs exactly the
 * steps the old GET handler did (fetch → consensus → build inputs → upsert
 * hourly → feed health → deactivate stale). The fine-grained `price_snapshots`
 * insert is intentionally left to the script caller so the route's writes stay
 * identical to before.
 */
import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { resolveOracleAgeSeconds } from '@/lib/oracles/oracleAge';
import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';
import { extractBaseSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import {
  reportService,
  REPORT_ASSETS,
  REPORT_PROVIDERS,
  type HourlySnapshotInput,
} from '@/lib/reports/reportService';
import { getAdminQueries } from '@/lib/supabase/server';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, type OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('DailyReportSnapshot');

// Bound parallel upstream oracle fetches so the daily cron does not fan out
// hundreds of simultaneous HTTP/RPC requests + DB writes, which previously
// saturated the event loop and tripped upstream rate limits.
const REPORT_FETCH_CONCURRENCY = 8;

// DECIMAL(24, 8) max absolute value
const MAX_SNAPSHOT_PRICE = 9_999_999_999_999_999.99999999;
// DECIMAL(10, 4) max absolute value
const MAX_DEVIATION_PCT = 9_999.9999;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizePriceForSnapshot(
  price: number
): { valid: true; price: number } | { valid: false; reason: string } {
  if (!isFiniteNumber(price) || price <= 0) {
    return { valid: false, reason: 'price is not a positive finite number' };
  }
  if (price > MAX_SNAPSHOT_PRICE) {
    return { valid: false, reason: `price ${price} exceeds DECIMAL(24,8) range` };
  }
  return { valid: true, price };
}

function sanitizeDeviationPct(value: number): number {
  if (!isFiniteNumber(value)) return 0;
  return Math.max(-MAX_DEVIATION_PCT, Math.min(MAX_DEVIATION_PCT, value));
}

export interface BatchResultItem {
  provider: string;
  symbol: string;
  chain?: string;
  // Numeric chain_id of the feed this result was sampled from, used to
  // update feed health against the correct DB row.
  feedChainId?: number;
  // The feed's actual `symbol` as stored in oracle_feeds (e.g. api3 stores
  // "BTC/USD" while chainlink stores "BTC"). Health updates must match the
  // DB row by this exact symbol — passing the base symbol (REPORT_ASSETS)
  // would silently no-op for providers that suffix the quote currency,
  // leaving broken feeds' consecutive_failures stuck at 0 so they never
  // auto-deactivate. Falls back to `symbol` when the result did not come
  // from a matched DB feed (unseeded-provider fallback path).
  feedSymbol?: string;
  price: PriceData | null;
  error: string | null;
  skipped: boolean;
}

async function fetchBatchPrices(): Promise<BatchResultItem[]> {
  const factory = getDefaultFactory();
  const queries: {
    provider: OracleProvider;
    symbol: string;
    chain?: Blockchain;
    feedChainId?: number;
    feedSymbol?: string;
  }[] = [];
  const skipped: BatchResultItem[] = [];

  // Load ALL active feeds in a single DB query (cached 5 minutes) instead
  // of issuing one `getActiveFeeds(provider)` call per provider. The
  // previous loop fanned out to N parallel DB queries on every cron tick.
  const activeFeedsByProvider = await getAllActiveFeedsByProvider();

  for (const symbol of REPORT_ASSETS) {
    for (const provider of REPORT_PROVIDERS) {
      const upperSymbol = symbol.toUpperCase();
      const activeFeeds = activeFeedsByProvider.get(provider) ?? [];
      const client = factory.getClient(provider);

      // Match every active feed for this symbol across ALL chains so
      // multi-chain providers (e.g. API3 on BSC/Polygon/Arbitrum) are
      // sampled per-chain instead of only on the client's default chain.
      //
      // We trust the DB as the source of truth: sync-feeds cron verifies
      // each feed by probing a live price before upserting is_active=true,
      // and auto-deactivates feeds with 3+ consecutive failures. So if a
      // feed is active in the DB, it should be safe to query. We do NOT
      // gate on client.isSymbolSupported(symbol, chain) here because the
      // hardcoded per-chain support lists (e.g. API3_AVAILABLE_PAIRS) can
      // lag behind the DB — the discovery cron may find new feeds that
      // aren't yet reflected in the constants file, and filtering them
      // out would block legitimate, verified feeds from being sampled.
      const matchedFeeds = activeFeeds.filter((feed) => {
        return extractBaseSymbol(feed.symbol).toUpperCase() === upperSymbol;
      });

      if (matchedFeeds.length > 0) {
        for (const feed of matchedFeeds) {
          queries.push({
            provider,
            symbol,
            chain: getBlockchainByChainId(feed.chain_id),
            feedChainId: feed.chain_id,
            feedSymbol: feed.symbol,
          });
        }
      } else if (activeFeeds.length === 0) {
        // DB has no feeds at all for this provider (unseeded / DB down) —
        // fall back to the client-level curated hardcoded list to decide
        // support so the cron remains usable.
        if (client.isSymbolSupported(symbol)) {
          queries.push({ provider, symbol });
        } else {
          skipped.push({
            provider,
            symbol,
            price: null,
            error: 'Symbol not supported by provider',
            skipped: true,
          });
        }
      } else {
        // DB has active feeds for this provider but none match this symbol.
        // The feed was either never discovered or was auto-deactivated due
        // to persistent failures. Skip it instead of adding a query that
        // fetchPriceWithDatabase → checkSymbolActive will reject anyway,
        // which would record a false "fail" instead of a clean "skip".
        skipped.push({
          provider,
          symbol,
          price: null,
          error: 'Symbol not in active feeds',
          skipped: true,
        });
      }
    }
  }

  logger.info(
    `Price batch: ${queries.length} queries, ${skipped.length} unsupported pairs skipped`
  );

  const fetched = await mapWithConcurrency(
    queries,
    REPORT_FETCH_CONCURRENCY,
    async ({ provider, symbol, chain, feedChainId, feedSymbol }): Promise<BatchResultItem> => {
      try {
        const price = await fetchPriceWithDatabase(provider, symbol, chain, true, true);
        const check = sanitizePriceForSnapshot(price.price);
        if (!check.valid) {
          logger.warn(`Price validation failed for ${provider}/${symbol}: ${check.reason}`);
          return {
            provider,
            symbol,
            feedChainId,
            feedSymbol,
            price: null,
            error: `Price validation failed: ${check.reason}`,
            skipped: false,
          };
        }
        return { provider, symbol, feedChainId, feedSymbol, price, error: null, skipped: false };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`Price fetch failed for ${provider}/${symbol}: ${message}`);
        return {
          provider,
          symbol,
          feedChainId,
          feedSymbol,
          price: null,
          error: message,
          skipped: false,
        };
      }
    }
  );

  return [...fetched, ...skipped];
}

function calculateConsensusBySymbol(results: BatchResultItem[]): Record<string, { price: number }> {
  const bySymbol = new Map<string, BatchResultItem[]>();

  for (const item of results) {
    if (!item.price || item.price.price <= 0) continue;
    const list = bySymbol.get(item.symbol) ?? [];
    list.push(item);
    bySymbol.set(item.symbol, list);
  }

  const consensusBySymbol: Record<string, { price: number }> = {};

  for (const [symbol, items] of bySymbol) {
    const inputs = items.map((item) => ({
      provider: item.provider,
      price: item.price!.price,
      timestamp: item.price!.timestamp,
      ingestionTimestamp: item.price!.ingestionTimestamp,
      confidence: item.price!.confidence,
    }));

    try {
      const consensus = calculateConsensusPrice(inputs, 'weighted_median', `${symbol}/USD`);
      if (consensus.price > 0) {
        consensusBySymbol[symbol] = { price: consensus.price };
      }
    } catch {
      logger.warn(`Failed to calculate consensus for ${symbol}`);
    }
  }

  return consensusBySymbol;
}

/**
 * Map raw batch-fetch results into the `HourlySnapshotInput` rows that
 * `reportService.upsertHourlySnapshots` consumes.
 *
 * Extracted from the route handler so the most intricate pure logic —
 * consensus-price gating, deviation calculation + clamping, data-age, and
 * success determination — is unit-testable without booting the full cron
 * pipeline (DB, oracle factory, network). `now` is injectable for deterministic
 * `dataAgeSeconds` assertions in tests.
 */
export function buildSnapshotInputs(
  results: BatchResultItem[],
  consensusBySymbol: Record<string, { price: number }>,
  snapshotHour: Date,
  now: number = Date.now()
): HourlySnapshotInput[] {
  return results
    .filter((item) => !item.skipped)
    .map((item): HourlySnapshotInput => {
      const rawConsensus = item.symbol ? consensusBySymbol[item.symbol] : undefined;
      const consensusPrice =
        rawConsensus && rawConsensus.price > 0 && rawConsensus.price <= MAX_SNAPSHOT_PRICE
          ? rawConsensus.price
          : null;

      let deviationPct: number | null = null;
      if (consensusPrice && item.price && item.price.price > 0) {
        const rawDeviation = ((item.price.price - consensusPrice) / consensusPrice) * 100;
        deviationPct = sanitizeDeviationPct(rawDeviation);
        if (rawDeviation !== deviationPct) {
          logger.warn(
            `Deviation clamped for ${item.provider}/${item.symbol}: ${rawDeviation} -> ${deviationPct}`
          );
        }
      }

      // Use the shared oracle-age resolver so snapshot writes and live
      // pre-trade agree on what "age" means. It prefers an explicit per-oracle
      // `dataAge`, trusts `item.price.timestamp` only for on-chain providers
      // (their timestamp IS the oracle update time), and returns null for
      // off-chain aggregators whose `timestamp` is a publish time — so their
      // cadence baseline stays null instead of being fabricated as "seconds old".
      const dataAgeSeconds = item.price ? resolveOracleAgeSeconds(item.price, now) : null;

      const priceCheck = item.price ? sanitizePriceForSnapshot(item.price.price) : null;
      const isSuccess = item.error === null && priceCheck?.valid === true;

      return {
        snapshotHour,
        provider: item.provider as OracleProvider,
        symbol: item.symbol,
        chainId: item.feedChainId ?? 0,
        price: priceCheck?.valid ? priceCheck.price : 0,
        consensusPrice,
        deviationPct,
        latencyMs: null,
        dataAgeSeconds,
        confidence: item.price?.confidence ?? null,
        isSuccess,
        errorMessage: item.error,
      };
    });
}

/**
 * Collapse snapshot inputs to at most ONE row per
 * `(provider, symbol, chain_id)` — the unique key of `hourly_price_snapshots`
 * (`hourly_price_snapshots_hour_provider_symbol_chain_uq`, migration 0017).
 *
 * WHY this is needed: `oracle_feeds` is keyed per feed
 * (`provider, symbol, chain_id`), so a single asset can have several ACTIVE
 * feeds that all resolve to the SAME base symbol at the snapshot layer — e.g.
 * RedStone's chain-agnostic "ETH" and "ETH/USDC" both collapse to base "ETH" on
 * `chain_id = 0` (via `extractBaseSymbol`). `fetchBatchPrices` legitimately
 * pushes one query per matched feed, so without this collapse `upsert(...)`
 * inside `upsertHourlySnapshots` would target the same unique row twice in a
 * single statement and PostgreSQL throws
 * "ON CONFLICT DO UPDATE command cannot affect row a second time", failing the
 * whole collection run. This is a latent bug exposed when feed discovery started
 * producing quote-suffixed chain-agnostic feeds.
 *
 * The chosen row keeps the most useful price: prefer a successful fetch; among
 * successes the first seen wins (prices for the same asset are near-identical,
 * so the row *identity* — not the exact value — is what must stay stable). A
 * failed row is still kept when no success exists, so the hourly table still
 * records the failure signal for that (provider, asset, chain).
 *
 * Feed health (`buildFeedHealthUpdates`) and consensus
 * (`calculateConsensusBySymbol`) are computed from the RAW `results` array, so
 * they are completely unaffected — every matched feed is still sampled, its
 * health updated, and its price counted toward consensus.
 *
 * Pure + deterministic → unit-testable without DB or network.
 */
export function dedupeHourlySnapshotInputs(inputs: HourlySnapshotInput[]): HourlySnapshotInput[] {
  const best = new Map<string, HourlySnapshotInput>();
  for (const input of inputs) {
    const key = `${input.provider}|${input.symbol}|${input.chainId}`;
    const current = best.get(key);
    // Prefer a successful row; once we hold a success, keep the first one
    // (stable, near-identical asset price keeps the upserted row identity fixed).
    if (!current || (!current.isSuccess && input.isSuccess)) {
      best.set(key, input);
    }
  }
  return [...best.values()];
}

/**
 * Map raw batch-fetch results into the feed-health update payload consumed by
 * `batchUpdateFeedHealth`.
 *
 * Extracted from the route handler so the symbol-matching logic is unit-
 * testable. Each result carries the `feedChainId` and `feedSymbol` of the DB
 * feed it was sampled from (populated in `fetchBatchPrices`), so health is
 * updated against the correct DB row.
 *
 * CRITICAL: `feedSymbol` (the feed's actual stored symbol, e.g. api3's
 * "BTC/USD") must be used — not the base `symbol` from REPORT_ASSETS — because
 * `batch_update_feed_health` matches the oracle_feeds row by exact symbol.
 * Passing the base symbol ("BTC") for a provider that stores "BTC/USD" would
 * match no row, leaving consecutive_failures stuck at 0 so broken feeds can
 * never auto-deactivate. Falls back to `symbol` only for results that did not
 * come from a matched DB feed (unseeded-provider fallback path).
 */
export function buildFeedHealthUpdates(
  results: BatchResultItem[]
): Array<{ provider: string; symbol: string; chainId: number; isSuccess: boolean }> {
  return results
    .filter((r) => !r.skipped)
    .map((r) => ({
      provider: r.provider,
      symbol: r.feedSymbol ?? r.symbol,
      chainId: r.feedChainId ?? 0,
      isSuccess: r.error === null && r.price !== null,
    }));
}

/** Error carrying the pipeline stage that failed, for structured logging. */
export class SnapshotCollectionError extends Error {
  readonly stage: string;
  constructor(stage: string, message: string) {
    super(message);
    this.name = 'SnapshotCollectionError';
    this.stage = stage;
  }
}

export interface SnapshotCollectionResult {
  snapshotDate: string;
  snapshotHour: Date;
  /** Precise run timestamp; the script uses this as `price_snapshots.snapshot_ts`. */
  snapshotTs: Date;
  results: BatchResultItem[];
  inputs: HourlySnapshotInput[];
  insertedHourly: number;
  updatedHealth: number;
  deactivated: number;
}

/**
 * Run the full snapshot collection pipeline:
 *   fetch all active feeds → consensus → build inputs → upsert hourly
 *   snapshots → update feed health → auto-deactivate stale feeds.
 *
 * Mirrors the previous `GET /api/cron/daily-report` handler exactly. Does NOT
 * write `price_snapshots` (the fine-grained table) — that is the caller's
 * responsibility, so the Vercel route's writes stay unchanged while the GH
 * Actions script adds the 15-min append on top.
 *
 * Throws `SnapshotCollectionError` if the hourly upsert fails (matching the
 * route's previous 500-on-upsert-failure behaviour); feed-health/deactivate
 * are skipped in that case, exactly as before.
 */
export async function collectSnapshot(): Promise<SnapshotCollectionResult> {
  const now = new Date();
  const snapshotDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .split('T')[0];
  const snapshotHour = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
  );

  const results = await fetchBatchPrices();
  const consensusBySymbol = calculateConsensusBySymbol(results);

  const inputs = buildSnapshotInputs(results, consensusBySymbol, snapshotHour);
  // Collapse to one row per (provider, symbol, chain_id) BEFORE the upsert so a
  // single asset backed by several active feeds (e.g. RedStone chain-agnostic
  // "ETH" + "ETH/USDC") can't violate hourly_price_snapshots' unique key and
  // crash the whole run. See dedupeHourlySnapshotInputs for the full rationale.
  const hourlyInputs = dedupeHourlySnapshotInputs(inputs);

  const successCount = inputs.filter((i) => i.isSuccess).length;
  const failedCount = inputs.length - successCount;
  const skippedCount = results.filter((r) => r.skipped).length;
  logger.info(
    `Price batch completed for ${snapshotDate}: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped out of ${results.length}`
  );

  let insertedHourly = 0;
  try {
    insertedHourly = await reportService.upsertHourlySnapshots(hourlyInputs);
    logger.info(`Upserted ${insertedHourly} hourly snapshots for ${snapshotDate}`);
  } catch (upsertError) {
    const error = upsertError instanceof Error ? upsertError : new Error(String(upsertError));
    logger.error(`Failed to upsert hourly snapshots for ${snapshotDate}: ${error.message}`, error, {
      sampleInputs: inputs.slice(0, 5).map((i) => ({
        provider: i.provider,
        symbol: i.symbol,
        chainId: i.chainId,
        price: i.price,
        consensusPrice: i.consensusPrice,
        deviationPct: i.deviationPct,
      })),
    });
    throw new SnapshotCollectionError('upsert_snapshots', error.message);
  }

  // Update feed health based on this batch's results. Each result carries
  // the chain_id of the feed it was sampled from (one result per feed).
  let updatedHealth = 0;
  try {
    const adminQueries = getAdminQueries();
    const healthUpdates = buildFeedHealthUpdates(results);
    const { updated } = await adminQueries.batchUpdateFeedHealth(healthUpdates);
    updatedHealth = updated;
    logger.info(`Updated feed health for ${updatedHealth} feeds`);
  } catch (healthError) {
    // Feed health tracking is non-critical; don't fail the cron on error.
    // NOTE: deactivation (below) is in a separate try block so a failure
    // here cannot prevent stale feeds from being taken offline — that was
    // the historical cause of cf climbing to 20+ before deactivation.
    logger.warn(
      'Failed to update feed health (non-critical)',
      healthError instanceof Error ? healthError : undefined
    );
  }

  // Auto-deactivate feeds with 3+ consecutive failures. Isolated from the
  // health-update try above so it still runs even if batchUpdateFeedHealth
  // threw, ensuring persistently-broken feeds are taken offline promptly.
  let deactivated = 0;
  try {
    deactivated = await getAdminQueries().deactivateStaleFeeds(3);
    if (deactivated > 0) {
      logger.info(`Auto-deactivated ${deactivated} feeds with persistent failures`);
    }
  } catch (deactivateError) {
    logger.warn(
      'Failed to deactivate stale feeds (non-critical)',
      deactivateError instanceof Error ? deactivateError : undefined
    );
  }

  return {
    snapshotDate,
    snapshotHour,
    snapshotTs: now,
    results,
    inputs: hourlyInputs,
    insertedHourly,
    updatedHealth,
    deactivated,
  };
}
