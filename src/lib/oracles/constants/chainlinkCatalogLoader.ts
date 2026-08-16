// ─────────────────────────────────────────────────────────────────────────
// Chainlink feed *directory* (versioned, committed to the repo).
//
// This is the canonical, machine-readable snapshot of the Chainlink official
// feed universe that we actually serve. It is:
//   - seeded from the curated CHAINLINK_PRICE_FEEDS map (95 feeds / 7 chains),
//   - expanded to the full on-chain universe by `scripts/sync-chainlink-catalog.ts`
//     (run manually in an env with reliable RPC — the official feeds UI is NOT
//     machine-readable and the on-chain Feed Registry is rate-limited / unreachable
//     from the sandbox).
//
// WHY a committed directory instead of live Feed Registry enumeration at request
// time: reading a feed must be *free and unconditional* (only gas). But *resolving
// which feed exists* previously depended on the on-chain Feed Registry being
// reachable at request time, which is fragile. The directory makes resolution
// deterministic and offline-capable; the Feed Registry is now only a best-effort
// freshness supplement (see feedSyncService.syncChainlinkFeedsFromRegistry).
//
// Resolution priority (see chainlinkDataSources/index.ts):
//   DB cache  →  catalog directory  →  curated hardcoded map
// ─────────────────────────────────────────────────────────────────────────

import { type ChainlinkPriceFeed } from '../services/chainlinkDataSources/priceFeedConfig';

import chainlinkCatalog from './chainlinkCatalog.json';

export interface CatalogFeed {
  base: string;
  quote: string;
  proxyAddress: string;
  decimals: number;
  category: ChainlinkPriceFeed['category'];
}

interface ChainlinkCatalogFile {
  version: string;
  source: string;
  networks: Record<string, CatalogFeed[]>;
}

const catalog = chainlinkCatalog as unknown as ChainlinkCatalogFile;

export const CHAINLINK_CATALOG_VERSION = catalog.version;
export const CHAINLINK_CATALOG_SOURCE = catalog.source;

function toChainlinkPriceFeed(entry: CatalogFeed, symbol: string): ChainlinkPriceFeed {
  return {
    address: entry.proxyAddress as `0x${string}`,
    name: `${entry.base} / ${entry.quote}`,
    symbol,
    decimals: entry.decimals,
    category: entry.category,
  };
}

/** Look up a single (symbol, chainId) feed in the committed catalog directory. */
export function getFeedFromCatalog(symbol: string, chainId: number): ChainlinkPriceFeed | null {
  const netFeeds = catalog.networks[String(chainId)];
  if (!netFeeds) return null;
  const upper = symbol.toUpperCase();
  const entry = netFeeds.find((f) => f.base.toUpperCase() === upper);
  return entry ? toChainlinkPriceFeed(entry, symbol) : null;
}

/** Unique base symbols across every network in the catalog (uppercased). */
export function getCatalogSupportedSymbols(): string[] {
  const symbols = new Set<string>();
  for (const feeds of Object.values(catalog.networks)) {
    for (const f of feeds) symbols.add(f.base.toUpperCase());
  }
  return Array.from(symbols).sort();
}

/** Networks on which a given base symbol has a feed in the catalog. */
export function getCatalogSupportedChainIds(symbol: string): number[] {
  const chainIds: number[] = [];
  const upper = symbol.toUpperCase();
  for (const [chainIdStr, feeds] of Object.entries(catalog.networks)) {
    if (feeds.some((f) => f.base.toUpperCase() === upper)) {
      chainIds.push(Number(chainIdStr));
    }
  }
  return chainIds;
}

/** Flattened universe: every (symbol, chainId) feed in the catalog. */
export function getAllCatalogFeeds(): Array<{
  symbol: string;
  chainId: number;
  entry: CatalogFeed;
}> {
  const out: Array<{ symbol: string; chainId: number; entry: CatalogFeed }> = [];
  for (const [chainIdStr, feeds] of Object.entries(catalog.networks)) {
    const chainId = Number(chainIdStr);
    for (const f of feeds) {
      out.push({ symbol: f.base.toUpperCase(), chainId, entry: f });
    }
  }
  return out;
}
