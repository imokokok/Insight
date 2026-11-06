/**
 * Single registry for per-provider feed behavior in the sync-feeds cron:
 *
 * 1. `FEED_STALENESS_RULES` — declarative staleness bound per provider
 *    (metadata field, multiplier, floor, fallbacks), consumed by
 *    `maxFeedAgeMs` / `isFreshTimestamp`.
 * 2. `SHARED_PROBE_STRATEGIES` — the live-probe strategy per provider,
 *    shared verbatim by the active-feed probe (`probeFeed`) and the
 *    reactivation probe (`probeInactiveFeed`). The two callers differ only
 *    in timeout handling and in their fallback tails, which stay local to
 *    each caller (active feeds may use `fetchPriceWithDatabase`; inactive
 *    feeds must fail closed to the hardcoded client path).
 *
 * Adding a provider with a standard on-chain/data-service probe is now a
 * single registry entry instead of parallel edits across both probe
 * functions and the staleness switch.
 */

import { API3_MAX_DATA_AGE_SECONDS } from '@/lib/oracles/constants/api3Health';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { api3NetworkService } from '@/lib/oracles/services/api3NetworkService';
import { chainlinkOnChainService } from '@/lib/oracles/services/chainlinkOnChainService';
import { getReflectorDataService } from '@/lib/oracles/services/reflectorDataService';
import { getSupraDataService } from '@/lib/oracles/services/supraDataService';
import { getWINkLinkRealDataService } from '@/lib/oracles/services/winklinkRealDataService';
import { resolveOracleFeedBlockchain } from '@/lib/oracles/utils/feedChain';
import { type OracleFeed, type OracleFeedInsert } from '@/lib/supabase/queries';
import { Blockchain, OracleProvider } from '@/types/oracle';

type AnyFeed = OracleFeed | OracleFeedInsert;

// ---------------------------------------------------------------------------
// Staleness rules
// ---------------------------------------------------------------------------

export interface FeedStalenessRule {
  /** Metadata field (seconds) carrying the provider-configured staleness bound. */
  field?: 'heartbeat' | 'timeDifferenceSeconds' | 'maxStalenessSeconds';
  /** Multiplier over the metadata seconds (2 doubles the provider bound). */
  multiplier?: number;
  /** Hard floor (ms) for the metadata-derived bound. */
  floorMs?: number;
  /** Fallback (ms) when the metadata bound is missing or invalid. */
  fallbackMs: number;
  /** Category-specific fallback override (SUPRA equity/commodity rows are slow-moving). */
  fallbackByCategory?: { equity: number; commodity: number };
}

export const FEED_STALENESS_RULES: Record<OracleProvider, FeedStalenessRule> = {
  [OracleProvider.CHAINLINK]: {
    field: 'heartbeat',
    multiplier: 2,
    floorMs: 60 * 60 * 1000,
    fallbackMs: 2 * 60 * 60 * 1000,
  },
  [OracleProvider.PYTH]: {
    field: 'timeDifferenceSeconds',
    multiplier: 2,
    floorMs: 60 * 1000,
    fallbackMs: 2 * 60 * 60 * 1000,
  },
  [OracleProvider.STORK]: {
    field: 'maxStalenessSeconds',
    multiplier: 1,
    fallbackMs: 60 * 60 * 1000,
  },
  [OracleProvider.CHRONICLE]: {
    field: 'maxStalenessSeconds',
    multiplier: 1,
    fallbackMs: 30 * 60 * 1000,
  },
  [OracleProvider.API3]: { fallbackMs: API3_MAX_DATA_AGE_SECONDS * 1000 },
  [OracleProvider.DIA]: { fallbackMs: 72 * 60 * 60 * 1000 },
  [OracleProvider.SUPRA]: {
    field: 'maxStalenessSeconds',
    multiplier: 1,
    fallbackMs: 60 * 60 * 1000,
    fallbackByCategory: { equity: 72 * 60 * 60 * 1000, commodity: 72 * 60 * 60 * 1000 },
  },
  [OracleProvider.REDSTONE]: { fallbackMs: 30 * 60 * 1000 },
  [OracleProvider.REFLECTOR]: { fallbackMs: 60 * 60 * 1000 },
  [OracleProvider.WINKLINK]: { fallbackMs: 24 * 60 * 60 * 1000 },
  [OracleProvider.FLARE]: { fallbackMs: 30 * 60 * 1000 },
  [OracleProvider.TWAP]: { fallbackMs: 24 * 60 * 60 * 1000 },
  [OracleProvider.BAND]: { fallbackMs: 24 * 60 * 60 * 1000 },
};

const DEFAULT_FEED_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Maximum acceptable data age (ms) for a feed, honoring provider metadata bounds. */
export function maxFeedAgeMs(feed: AnyFeed): number {
  const rule = FEED_STALENESS_RULES[feed.provider as OracleProvider];
  if (!rule) return DEFAULT_FEED_MAX_AGE_MS;
  if (!rule.field) return rule.fallbackMs;
  const metadata = (feed.metadata || {}) as Record<string, unknown>;
  const configured = Number(metadata[rule.field]);
  if (Number.isFinite(configured) && configured > 0) {
    const bound = (rule.multiplier ?? 1) * configured * 1000;
    return rule.floorMs !== undefined ? Math.max(rule.floorMs, bound) : bound;
  }
  if (rule.fallbackByCategory && (feed.category === 'equity' || feed.category === 'commodity')) {
    return rule.fallbackByCategory[feed.category];
  }
  return rule.fallbackMs;
}

/** A feed timestamp (s or ms epoch) is fresh when its age fits the provider bound. */
export function isFreshTimestamp(feed: AnyFeed, timestamp: unknown): boolean {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) return false;
  const timestampMs = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  const age = Date.now() - timestampMs;
  return age >= -5 * 60 * 1000 && age <= maxFeedAgeMs(feed);
}

// ---------------------------------------------------------------------------
// Probe strategies
// ---------------------------------------------------------------------------

const EVM_AGGREGATOR_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const SUPRA_INDEX_ADDRESS_PATTERN = /^\d+$/;

/**
 * RedStone symbols are case-sensitive (e.g. `etrUSD_FUNDAMENTAL` / `CELO/EUR`);
 * the price API returns HTTP 500 when a symbol is uppercased. Probing directly
 * through the RedStone client with the original-case symbol keeps
 * newly-discovered mixed-case feeds verifiable before upsert (mirroring the
 * API3 strategy below, which bypasses the DB active-feed gate the same way).
 */
export async function probeRedStoneFeed(feed: AnyFeed, signal?: AbortSignal): Promise<boolean> {
  try {
    const provider = OracleProvider.REDSTONE;
    const chain = resolveOracleFeedBlockchain(feed);
    const client = getDefaultFactory().getClient(provider);
    const price = await client.getPrice(feed.symbol, chain, { signal });
    return (
      !!price && typeof price.price === 'number' && Number.isFinite(price.price) && price.price > 0
    );
  } catch {
    return false;
  }
}

export interface FeedProbeStrategy {
  provider: OracleProvider;
  /** Whether this strategy handles the feed (provider plus address-shape gate). */
  applies(feed: AnyFeed): boolean;
  /** Execute the live probe. Throws are handled by the caller's catch/timeout. */
  probe(
    feed: AnyFeed,
    chain: Blockchain | null | undefined,
    signal?: AbortSignal
  ): Promise<boolean>;
}

/**
 * Ordered list of provider probe strategies shared by both probe callers.
 * Order is irrelevant for correctness (entries are matched by provider), but
 * keep provider-grouped for readability. The SUPRA Monad DORA Push identity
 * probe is reactivation-specific and therefore lives in the runner, not here.
 */
export const SHARED_PROBE_STRATEGIES: readonly FeedProbeStrategy[] = [
  {
    provider: OracleProvider.REDSTONE,
    applies: () => true,
    probe: (feed, _chain, signal) => probeRedStoneFeed(feed, signal),
  },
  {
    provider: OracleProvider.CHAINLINK,
    applies: (feed) => EVM_AGGREGATOR_ADDRESS_PATTERN.test(feed.address),
    probe: async (feed, _chain, signal) => {
      const price = await chainlinkOnChainService.getPrice(
        feed.symbol,
        feed.chain_id,
        signal,
        feed.address as `0x${string}`
      );
      return (
        price !== null &&
        Number.isFinite(price.price) &&
        price.price > 0 &&
        isFreshTimestamp(feed, price.timestamp)
      );
    },
  },
  {
    provider: OracleProvider.SUPRA,
    applies: (feed) => SUPRA_INDEX_ADDRESS_PATTERN.test(feed.address),
    probe: async (feed, _chain, signal) => {
      const price = await getSupraDataService().fetchLatestPriceByIndex(
        Number(feed.address),
        feed.symbol,
        signal
      );
      return !!price && price.price > 0 && isFreshTimestamp(feed, price.timestamp);
    },
  },
  {
    provider: OracleProvider.REFLECTOR,
    applies: (feed) => !!feed.address,
    probe: async (feed, _chain, signal) => {
      const price = await getReflectorDataService().fetchLatestPrice(
        feed.symbol,
        signal,
        feed.address
      );
      return !!price && price.price > 0 && isFreshTimestamp(feed, price.timestamp);
    },
  },
  {
    provider: OracleProvider.WINKLINK,
    applies: (feed) => !!feed.address,
    probe: async (feed, _chain, signal) => {
      const price = await getWINkLinkRealDataService().getPriceFromContract(
        feed.symbol,
        undefined,
        signal,
        feed.address
      );
      return !!price && price.price > 0 && isFreshTimestamp(feed, price.timestamp);
    },
  },
  {
    provider: OracleProvider.API3,
    applies: (feed) => !!feed.address,
    probe: async (feed, chain, signal) => {
      // API3 dAPIs are cross-chain and their per-chain activation can only be
      // confirmed by reading the communal proxy contract. The candidate feed
      // carries the dAPI name in `address`; read it directly via the network
      // service (bypassing fetchPriceWithDatabase's active-feed gate, which
      // would reject dAPIs not yet in the DB) so newly-discovered dAPIs can be
      // verified before upsert.
      const reading = await api3NetworkService.getPrice(
        feed.symbol,
        chain ?? Blockchain.ETHEREUM,
        signal,
        feed.address
      );
      if (
        typeof reading?.price !== 'number' ||
        !Number.isFinite(reading.price) ||
        reading.price <= 0
      ) {
        return false;
      }
      // API3NetworkService reports dataAge in seconds. Drop stale dAPIs whose
      // proxy still serves an expired last-written price.
      if (typeof reading.dataAge === 'number' && reading.dataAge > API3_MAX_DATA_AGE_SECONDS) {
        return false;
      }
      return true;
    },
  },
];

/** First strategy that handles this feed, or null when the caller tail applies. */
export function resolveSharedProbeStrategy(feed: AnyFeed): FeedProbeStrategy | null {
  const provider = feed.provider as OracleProvider;
  return (
    SHARED_PROBE_STRATEGIES.find(
      (strategy) => strategy.provider === provider && strategy.applies(feed)
    ) ?? null
  );
}
