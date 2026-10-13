/**
 * Chainlink Data Feed reference adapter for local market-data validation.
 *
 * This reads an official feed from the committed Chainlink catalog through
 * Insight's existing RPC service. It is deliberately separate from the CEX
 * collector so oracle observations never inflate exchange coverage statistics.
 */

import { getAllCatalogFeeds } from '@/lib/oracles/constants/chainlinkCatalogLoader';
import {
  chainlinkOnChainService,
  type ChainlinkPriceData,
} from '@/lib/oracles/services/chainlinkOnChainService';

export interface ChainlinkMarketReference {
  provider: 'chainlink-data-feed';
  symbol: string;
  quote: 'USD';
  chainId: number;
  feedAddress: `0x${string}`;
  feedPath: string | null;
  feedCategory: string | null;
  heartbeatSeconds: number;
  price: number;
  decimals: number;
  updatedAt: string;
  ageSeconds: number;
  isFresh: boolean;
  roundId: string;
}

export interface FetchChainlinkMarketReferenceOptions {
  symbol: string;
  chainId: number;
  signal?: AbortSignal;
  getPrice?: (
    symbol: string,
    chainId: number,
    signal?: AbortSignal,
    feedAddressOverride?: `0x${string}`
  ) => Promise<ChainlinkPriceData | null>;
  now?: () => number;
}

function normalizeSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,15}$/.test(normalized)) {
    throw new Error(`Invalid Chainlink reference symbol: ${symbol}`);
  }
  return normalized;
}

/**
 * Read one catalogued Chainlink USD feed and classify freshness against that
 * feed's published heartbeat. Stale observations are returned as evidence but
 * marked `isFresh: false`, allowing callers to fail closed without losing the
 * diagnostic value.
 */
export async function fetchChainlinkMarketReference(
  options: FetchChainlinkMarketReferenceOptions
): Promise<ChainlinkMarketReference> {
  const symbol = normalizeSymbol(options.symbol);
  if (!Number.isSafeInteger(options.chainId) || options.chainId <= 0) {
    throw new Error('Chainlink reference chainId must be a positive safe integer');
  }

  const catalogFeed = getAllCatalogFeeds().find(
    ({ symbol: catalogSymbol, chainId, entry }) =>
      catalogSymbol === symbol && chainId === options.chainId && entry.quote.toUpperCase() === 'USD'
  );
  if (!catalogFeed) {
    throw new Error(`No catalogued Chainlink ${symbol}/USD feed on chain ${options.chainId}`);
  }

  const heartbeatSeconds = catalogFeed.entry.heartbeat;
  if (
    typeof heartbeatSeconds !== 'number' ||
    !Number.isSafeInteger(heartbeatSeconds) ||
    heartbeatSeconds <= 0
  ) {
    throw new Error(
      `Chainlink ${symbol}/USD feed on chain ${options.chainId} has no valid heartbeat metadata`
    );
  }

  const getPrice =
    options.getPrice ?? chainlinkOnChainService.getPrice.bind(chainlinkOnChainService);
  const priceData = await getPrice(
    symbol,
    options.chainId,
    options.signal,
    catalogFeed.entry.proxyAddress as `0x${string}`
  );
  if (!priceData) {
    throw new Error(
      `Chainlink returned no usable price for ${symbol}/USD on chain ${options.chainId}`
    );
  }

  if (
    priceData.symbol.toUpperCase() !== symbol ||
    priceData.chainId !== options.chainId ||
    !Number.isFinite(priceData.price) ||
    priceData.price <= 0 ||
    !Number.isSafeInteger(priceData.decimals) ||
    priceData.decimals < 0 ||
    !Number.isFinite(priceData.timestamp) ||
    priceData.timestamp <= 0
  ) {
    throw new Error(`Chainlink returned invalid ${symbol}/USD feed data`);
  }

  const nowMs = (options.now ?? Date.now)();
  if (!Number.isFinite(nowMs) || priceData.timestamp > nowMs) {
    throw new Error(`Chainlink returned an invalid update time for ${symbol}/USD`);
  }

  const ageSeconds = Math.floor((nowMs - priceData.timestamp) / 1000);
  return {
    provider: 'chainlink-data-feed',
    symbol,
    quote: 'USD',
    chainId: options.chainId,
    feedAddress: catalogFeed.entry.proxyAddress as `0x${string}`,
    feedPath: catalogFeed.entry.path ?? null,
    feedCategory: catalogFeed.entry.feedCategory ?? null,
    heartbeatSeconds,
    price: priceData.price,
    decimals: priceData.decimals,
    updatedAt: new Date(priceData.timestamp).toISOString(),
    ageSeconds,
    isFresh: ageSeconds <= heartbeatSeconds,
    roundId: priceData.roundId.toString(),
  };
}
