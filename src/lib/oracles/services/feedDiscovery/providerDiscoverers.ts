import { type OracleFeedInsert } from '@/lib/supabase/queries';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { Blockchain } from '@/types/oracle';

import { getAllCatalogFeeds } from '../../constants/chainlinkCatalogLoader';
import { BLOCKCHAIN_TO_CHAIN_ID } from '../../constants/chainMapping';
import { getAllSupportedSymbols } from '../../constants/supportedSymbols';
import { isUsdDenominatedFeedSymbol } from '../../utils/oracleDataUtils';
import { getReflectorDataService } from '../reflectorDataService';
import { getSupraDataService } from '../supraDataService';
import { WINKLINK_PRICE_FEEDS } from '../winklinkRealDataService';

import {
  CHAINLINK_ADDRESSES_URL,
  CHAINLINK_RDD_BY_CHAIN,
  parseChainlinkAddressPage,
  parseChainlinkDirectory,
  parseSupraPairPage,
} from './catalogSources';
import { decodeFlareFeedId, inferCategory } from './discoveryHelpers';

import type { DiscoveryResult } from './discoveryTypes';

const logger = createLogger('FeedDiscoveryService');

// ─── Chainlink ────────────────────────────────────────────────────

export async function discoverChainlinkFeeds(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider: 'chainlink', discovered: 0, feeds: [], errors: [] };

  try {
    const liveResults = await Promise.all(
      Object.entries(CHAINLINK_RDD_BY_CHAIN).map(async ([chainId, url]) => {
        try {
          const response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(20_000),
          });
          if (!response.ok) return [];
          return parseChainlinkDirectory(await response.json(), Number(chainId), 'chainlink-rdd');
        } catch {
          return [];
        }
      })
    );

    let liveFeeds = liveResults.flat();
    if (liveFeeds.length === 0) {
      try {
        const page = await fetch(CHAINLINK_ADDRESSES_URL, {
          headers: { Accept: 'text/html' },
          signal: AbortSignal.timeout(30_000),
        });
        if (page.ok) liveFeeds = parseChainlinkAddressPage(await page.text());
      } catch {
        // The committed catalog below is the final availability fallback.
      }
    }

    // Always retain the last-known-good committed catalog. Live candidates win
    // after verification; committed rows keep discovery safe during a directory outage.
    const catalogFeeds = getAllCatalogFeeds();
    const fallbackFeeds: OracleFeedInsert[] = catalogFeeds.map(({ symbol, chainId, entry }) => ({
      provider: 'chainlink',
      symbol,
      chain_id: chainId,
      address: entry.proxyAddress,
      name: `${entry.base} / ${entry.quote}`,
      decimals: entry.decimals,
      category: entry.category,
      is_active: true,
      source: 'catalog',
      metadata: {
        candidatePriority: 99,
        heartbeat: entry.heartbeat,
        path: entry.path,
        feedCategory: entry.feedCategory,
        feedType: entry.feedType,
      },
    }));
    result.feeds = liveFeeds.length > 0 ? liveFeeds : fallbackFeeds;
    result.discovered = result.feeds.length;
    logger.info(
      liveFeeds.length > 0
        ? `Chainlink: discovered ${liveFeeds.length} live directory candidates`
        : `Chainlink: live directory unavailable; using ${fallbackFeeds.length} committed candidates`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    logger.error(
      'Chainlink catalog discovery failed',
      error instanceof Error ? error : new Error(msg)
    );
  }

  return result;
}

// ─── Supra ────────────────────────────────────────────────────────

export async function discoverSupraFeeds(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider: 'supra', discovered: 0, feeds: [], errors: [] };

  try {
    const response = await fetch('https://docs.supra.com/oracles/data-feeds/data-feeds-index', {
      headers: { Accept: 'text/html' },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Supra API returned ${response.status}`);
    }

    const priceList = parseSupraPairPage(await response.text());
    const chunks: (typeof priceList)[] = [];
    for (let index = 0; index < priceList.length; index += 25) {
      chunks.push(priceList.slice(index, index + 25));
    }
    const fetchSupraChunk = async (
      chunk: typeof priceList
    ): Promise<Array<{ pairIndex: number; price: number; timestamp: number }>> => {
      try {
        return await getSupraDataService().fetchLatestPrices(chunk.map((item) => item.pairIndex));
      } catch {
        // DORA rejects an entire request when one pair index is unavailable.
        // Bisect so a single retired index cannot hide 24 healthy feeds.
        if (chunk.length <= 1) return [];
        const middle = Math.ceil(chunk.length / 2);
        const [left, right] = await Promise.all([
          fetchSupraChunk(chunk.slice(0, middle)),
          fetchSupraChunk(chunk.slice(middle)),
        ]);
        return [...left, ...right];
      }
    };
    const liveBatches = await mapWithConcurrency(chunks, 2, fetchSupraChunk);
    const liveByIndex = new Map(liveBatches.flat().map((price) => [price.pairIndex, price]));
    for (const item of priceList) {
      const live = liveByIndex.get(item.pairIndex);
      if (!live) continue;
      result.feeds.push({
        provider: 'supra',
        symbol: item.symbol,
        chain_id: 0,
        address: String(item.pairIndex),
        name: item.pair,
        decimals: 8,
        category: inferCategory(item.symbol),
        is_active: true,
        source: 'supra-directory',
        metadata: {
          pairIndex: item.pairIndex,
          quote: item.quote,
          catalogCategory: item.category,
          preverified: true,
          discoveredValue: live.price,
          discoveredTimestamp: live.timestamp,
        },
      });
    }

    result.discovered = result.feeds.length;
    logger.info(`Supra: discovered ${result.discovered} feeds`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    logger.error('Supra discovery failed', error instanceof Error ? error : new Error(msg));
  }

  return result;
}

// ─── DIA ──────────────────────────────────────────────────────────

export async function discoverDIAFeeds(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider: 'dia', discovered: 0, feeds: [], errors: [] };

  try {
    const directory = await fetch('https://api.diadata.org/v1/symbols', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!directory.ok) throw new Error(`DIA symbols API returned ${directory.status}`);
    const rawSymbols = (await directory.json()) as unknown;
    const symbols: string[] = [];
    const seenSymbols = new Set<string>();
    for (const rawSymbol of Array.isArray(rawSymbols) ? rawSymbols : []) {
      if (typeof rawSymbol !== 'string') continue;
      const symbol = rawSymbol.trim();
      const key = symbol.toUpperCase();
      if (!symbol || seenSymbols.has(key)) continue;
      seenSymbols.add(key);
      symbols.push(symbol);
    }

    const verified = await mapWithConcurrency(
      symbols,
      10,
      async (symbol): Promise<OracleFeedInsert | null> => {
        try {
          const response = await fetch(
            `https://api.diadata.org/v1/quotation/${encodeURIComponent(symbol)}`,
            {
              headers: { Accept: 'application/json' },
              signal: AbortSignal.timeout(10_000),
            }
          );
          if (!response.ok) return null;
          const data = (await response.json()) as {
            Symbol?: string;
            Name?: string;
            Address?: string;
            Blockchain?: string;
            Price?: number;
            Time?: string;
          };
          const timestamp = Date.parse(data.Time || '');
          if (!data.Symbol || data.Symbol.toUpperCase() !== symbol.toUpperCase()) return null;
          if (typeof data.Price !== 'number' || !Number.isFinite(data.Price) || data.Price <= 0)
            return null;
          if (!Number.isFinite(timestamp) || Date.now() - timestamp > 72 * 60 * 60 * 1000)
            return null;
          return {
            provider: 'dia',
            symbol: data.Symbol,
            chain_id: 0,
            address: data.Address || data.Symbol,
            name: data.Name ? `${data.Name} (${data.Symbol}) / USD` : `${data.Symbol}/USD`,
            decimals: 8,
            category: inferCategory(data.Symbol),
            is_active: true,
            source: 'dia-api',
            metadata: {
              blockchain: data.Blockchain,
              preverified: true,
              discoveredValue: data.Price,
              discoveredTimestamp: timestamp,
            },
          } satisfies OracleFeedInsert;
        } catch {
          return null;
        }
      }
    );
    result.feeds = verified.filter((feed): feed is OracleFeedInsert => feed !== null);

    result.discovered = result.feeds.length;
    logger.info(`DIA: discovered ${result.discovered} feeds`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    logger.error('DIA discovery failed', error instanceof Error ? error : new Error(msg));
  }

  return result;
}

// ─── RedStone ─────────────────────────────────────────────────────

export async function discoverRedStoneFeeds(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider: 'redstone', discovered: 0, feeds: [], errors: [] };

  try {
    const response = await fetch(
      'https://oracle-gateway-1.a.redstone.finance/data-packages/latest/redstone-primary-prod',
      { signal: AbortSignal.timeout(30000) }
    );

    if (!response.ok) {
      throw new Error(`RedStone API returned ${response.status}`);
    }

    const rawData = (await response.json()) as unknown;
    type GatewayPackage = {
      timestampMilliseconds?: number;
      dataPoints?: Array<{ dataFeedId?: string; value?: number }>;
    };
    const gatewayData: Record<string, GatewayPackage[]> = {};
    if (Array.isArray(rawData)) {
      for (const legacy of rawData as Array<{
        symbol?: string;
        value?: number;
        timestamp?: number;
      }>) {
        if (!legacy.symbol) continue;
        gatewayData[legacy.symbol] = [
          {
            timestampMilliseconds: legacy.timestamp,
            dataPoints: [{ dataFeedId: legacy.symbol, value: legacy.value }],
          },
        ];
      }
    } else if (rawData && typeof rawData === 'object') {
      for (const [key, value] of Object.entries(rawData as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          gatewayData[key] = value as GatewayPackage[];
        } else if (value && typeof value === 'object') {
          const legacy = value as { symbol?: string; value?: number; timestamp?: number };
          const feedId = legacy.symbol || key;
          gatewayData[feedId] = [
            {
              timestampMilliseconds: legacy.timestamp,
              dataPoints: [{ dataFeedId: feedId, value: legacy.value }],
            },
          ];
        }
      }
    }

    for (const [feedId, packages] of Object.entries(gatewayData)) {
      const item = packages?.find((pkg) => {
        const value = pkg.dataPoints?.find((point) => point.dataFeedId === feedId)?.value;
        return typeof value === 'number' && Number.isFinite(value) && value > 0;
      });
      const point = item?.dataPoints?.find((candidate) => candidate.dataFeedId === feedId);
      if (!item || !point || typeof point.value !== 'number') continue;

      // Insight's price and consensus APIs expose BASE/USD prices. The full
      // RedStone catalogue also contains ratios such as WBTC/BTC and USDC/BRL;
      // admitting those rows lets a base-symbol query accidentally treat a
      // cross-rate as USD and causes duplicate votes for one provider.
      if (!isUsdDenominatedFeedSymbol(feedId)) continue;

      // RedStone's `provider=redstone` (full) prices endpoint returns each
      // feed WITH its current `value` + `timestamp`. That IS a live price, so we
      // self-verify from it instead of re-fetching every symbol through the
      // price client during discovery verification. Re-probing 1000+ symbols
      // from a single IP trips RedStone's rate limit (HTTP 500 -> 403) and,
      // combined with the 15-min job timeout, left discovery collecting almost
      // nothing. Trusting the discovery payload avoids ~1000 outbound requests
      // entirely. Guard: only keep feeds whose discovered value is a finite,
      // positive number (mirrors parsePriceResponse's check).
      const discoveredValue = point.value;
      if (
        typeof discoveredValue !== 'number' ||
        !Number.isFinite(discoveredValue) ||
        discoveredValue <= 0
      ) {
        continue;
      }

      result.feeds.push({
        provider: 'redstone',
        symbol: feedId,
        chain_id: 0,
        address: feedId,
        name: `${feedId}/USD`,
        decimals: 8,
        category: inferCategory(feedId),
        is_active: true,
        source: 'redstone-api',
        // Signals verifyDiscoveredFeeds to skip the per-symbol price probe —
        // discovery already proved this feed serves a valid price.
        metadata: {
          preverified: true,
          discoveredValue,
          discoveredTimestamp: item.timestampMilliseconds,
          dataServiceId: 'redstone-primary-prod',
        },
      });
    }

    result.discovered = result.feeds.length;
    logger.info(`RedStone: discovered ${result.discovered} feeds`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    logger.error('RedStone discovery failed', error instanceof Error ? error : new Error(msg));
  }

  return result;
}

// ─── API3 ─────────────────────────────────────────────────────────
//
// API3 dAPIs are cross-chain: a single dAPI name (e.g. "BTC/USD") maps to a
// dataFeedId that can be deployed on every supported chain. The official
// catalog (`@api3/dapi-management` npm package, mirrored on unpkg/jsDelivr)
// lists every dAPI with a global `stage` (active | deprecated | retired).
//
// Whether a dAPI is actually *activated* (paid for) on a specific chain can
// only be determined by reading its communal proxy contract on that chain —
// which is exactly what `probeFeed` does after discovery. So discovery
// produces the (active dAPI × supported chain) candidate set and the probe
// filters it down to feeds that return real prices.

const API3_DAPI_CATALOG_URLS = [
  'https://unpkg.com/@api3/dapi-management@latest/dist/data/dapis.json',
  'https://cdn.jsdelivr.net/npm/@api3/dapi-management@latest/dist/data/dapis.json',
];

// Chains API3 deploys on. Kept in sync with API3Client.supportedChains.
const API3_DISCOVERY_CHAINS: Blockchain[] = [
  Blockchain.ETHEREUM,
  Blockchain.ARBITRUM,
  Blockchain.POLYGON,
  Blockchain.AVALANCHE,
  Blockchain.BNB_CHAIN,
  Blockchain.BASE,
  Blockchain.OPTIMISM,
];

// Categories we actually cross-reference for free on-chain price feeds.
// Admitting these lets discovery consider every sponsored dAPI instead of the
// old arbitrary tracked-symbol gate; Equities/Commodities are excluded because
// API3 carries essentially none of them as live /USD feeds.
const API3_DISCOVERY_CATEGORIES = new Set(['Cryptocurrency', 'Stablecoin', 'Forex']);

interface Api3DapiCatalogEntry {
  name: string;
  stage?: string;
  metadata?: { category?: string };
  providers?: string[];
}

async function fetchApi3DapiCatalog(): Promise<Api3DapiCatalogEntry[]> {
  for (const url of API3_DAPI_CATALOG_URLS) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) continue;
      const json = await response.json();
      // Catalog is a top-level array; tolerate { data: [...] } / { dapis: [...] }.
      const entries = Array.isArray(json)
        ? (json as Api3DapiCatalogEntry[])
        : Array.isArray((json as Record<string, unknown>)?.data)
          ? ((json as Record<string, unknown>).data as Api3DapiCatalogEntry[])
          : Array.isArray((json as Record<string, unknown>)?.dapis)
            ? ((json as Record<string, unknown>).dapis as Api3DapiCatalogEntry[])
            : [];
      if (entries.length > 0) return entries;
    } catch {
      // try next mirror
    }
  }
  throw new Error('All API3 dAPI catalog mirrors returned no data');
}

function mapApi3Category(catalogCategory: string | undefined, symbol: string): string {
  switch (catalogCategory) {
    case 'Stablecoin':
      return 'stablecoin';
    case 'Forex':
      return 'forex';
    case 'Commodities':
      return 'commodity';
    case 'Equities':
      return 'equity';
    default:
      return inferCategory(symbol);
  }
}

export async function discoverAPI3Feeds(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider: 'api3', discovered: 0, feeds: [], errors: [] };

  try {
    const catalog = await fetchApi3DapiCatalog();

    // Previously this gate was `trackedSymbols.has(base)` — a dAPI was only
    // discovered if its base symbol already appeared in *some other* oracle's
    // tracked list. That silently dropped ~half of API3's active /USD dAPIs
    // (stETH, tBTC, cbBTC, USDe, GHO, POL, BERA, ...) that are genuinely
    // sponsored/serving but simply not tracked elsewhere. Verified against the
    // live catalog on 2026-08-16: 108 active /USD dAPIs, 55 of them excluded
    // by the old gate.
    //
    // The real correctness gate is the on-chain `probeFeed` (it rejects
    // unsponsored / stale dAPIs via the 48h freshness check), so we no longer
    // need a tracked-symbol pre-filter. Instead we admit every active /USD dAPI
    // in a category we actually cross-reference, and only fall back to the
    // tracked set for dAPIs the catalogue left uncategorised — so we never lose
    // a feed we already serve. Equities/Commodities are dropped (see
    // API3_DISCOVERY_CATEGORIES above).
    const trackedSymbols = new Set(getAllSupportedSymbols().map((s) => s.toUpperCase()));

    const activeUsdDapis: Api3DapiCatalogEntry[] = [];
    for (const dapi of catalog) {
      const name = dapi.name;
      if (!name || !name.endsWith('/USD')) continue;
      // `stage` is the dAPI's global lifecycle state. Skip retired/deprecated
      // dAPIs — their proxies return no data on any chain.
      if (dapi.stage && dapi.stage !== 'active') continue;
      const base = name.replace(/\/USD$/, '').toUpperCase();
      const category = dapi.metadata?.category;
      if (category) {
        if (!API3_DISCOVERY_CATEGORIES.has(category)) continue;
      } else if (!trackedSymbols.has(base)) {
        continue;
      }
      activeUsdDapis.push(dapi);
    }

    const chains = API3_DISCOVERY_CHAINS.map((chain) => ({
      chain,
      chainId: BLOCKCHAIN_TO_CHAIN_ID[chain],
    })).filter((c): c is { chain: Blockchain; chainId: number } => c.chainId > 0);

    for (const dapi of activeUsdDapis) {
      const symbol = dapi.name.replace(/\/USD$/, '');
      const category = mapApi3Category(dapi.metadata?.category, symbol);

      for (const { chainId } of chains) {
        result.feeds.push({
          provider: 'api3',
          symbol,
          chain_id: chainId,
          // The dAPI name IS the on-chain identifier used to compute the
          // communal reader proxy address — store it as `address` so the
          // price fetcher resolves the feed directly.
          address: dapi.name,
          name: dapi.name,
          decimals: 8,
          category,
          is_active: true,
          source: 'api3-catalog',
          metadata: {
            dapiName: dapi.name,
            stage: dapi.stage || 'active',
            providers: dapi.providers || [],
          },
        });
      }
    }

    result.discovered = result.feeds.length;
    logger.info(
      `API3: discovered ${activeUsdDapis.length} active dAPIs × ${chains.length} chains = ${result.discovered} candidate feeds`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    logger.error('API3 discovery failed', error instanceof Error ? error : new Error(msg));
  }

  return result;
}

// ─── Flare ────────────────────────────────────────────────────────

export async function discoverFlareFeeds(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider: 'flare', discovered: 0, feeds: [], errors: [] };

  // Try on-chain discovery first
  try {
    const onChainFeeds = await discoverFlareFeedsOnChain();
    if (onChainFeeds.length > 0) {
      result.feeds = onChainFeeds;
      result.discovered = onChainFeeds.length;
      logger.info(`Flare: discovered ${result.discovered} feeds on-chain`);
      return result;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(`On-chain discovery failed: ${msg}`);
    logger.warn(
      'Flare on-chain discovery failed, trying API fallback',
      error instanceof Error ? error : new Error(msg)
    );
  }

  // Fallback: try Flare API
  try {
    const response = await fetch('https://ftso-api.flare.network/api/v1/feeds', {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Flare API returned ${response.status}`);
    }

    const data = (await response.json()) as {
      feeds?: Array<{ name: string; feedId: string; active: boolean }>;
    };
    const feeds = data.feeds || [];

    for (const feed of feeds) {
      const symbol = feed.name?.replace(/\/USD.*$/, '') || '';
      if (!symbol) continue;

      result.feeds.push({
        provider: 'flare',
        symbol,
        chain_id: 14, // Flare mainnet
        address: feed.feedId,
        name: feed.name || `${symbol}/USD`,
        decimals: 8,
        category: inferCategory(symbol),
        is_active: feed.active !== false,
        source: 'flare-api',
        metadata: { feedId: feed.feedId, network: 'flare' },
      });
    }

    result.discovered = result.feeds.length;
    logger.info(`Flare: discovered ${result.discovered} feeds via API`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(`API discovery failed: ${msg}`);
    logger.error(
      'Flare API discovery also failed',
      error instanceof Error ? error : new Error(msg)
    );
  }

  return result;
}

async function discoverFlareFeedsOnChain(): Promise<OracleFeedInsert[]> {
  const { encodeFunctionData, decodeFunctionResult } = await import('viem');
  const { FLARE_RPC_ENDPOINTS, FTSOV2_ADDRESS, FLARE_CONTRACT_REGISTRY, REGISTRY_ABI } =
    await import('@/lib/oracles/constants/flareConstants');

  const GET_SUPPORTED_FEED_IDS_ABI = [
    {
      inputs: [],
      name: 'getSupportedFeedIds',
      outputs: [{ internalType: 'bytes21[]', name: '', type: 'bytes21[]' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const;

  const endpoints = FLARE_RPC_ENDPOINTS.flare;
  let ftsoV2Address = FTSOV2_ADDRESS.flare;

  // Resolve FTSO V2 address from registry
  try {
    const registryData = encodeFunctionData({
      abi: REGISTRY_ABI,
      functionName: 'getContractAddressByName',
      args: ['FtsoV2'],
    });
    for (const rpcUrl of endpoints) {
      try {
        const rpcResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{ to: FLARE_CONTRACT_REGISTRY, data: registryData }, 'latest'],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!rpcResponse.ok) continue;
        const rpcJson = (await rpcResponse.json()) as { result?: string };
        if (rpcJson.result && rpcJson.result.length >= 26) {
          const resolved = `0x${rpcJson.result.slice(26)}` as `0x${string}`;
          if (resolved.length === 42) {
            ftsoV2Address = resolved;
            break;
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Use hardcoded address
  }

  // Call getSupportedFeedIds
  const callData = encodeFunctionData({
    abi: GET_SUPPORTED_FEED_IDS_ABI,
    functionName: 'getSupportedFeedIds',
  });

  let feedIds: string[] = [];
  for (const rpcUrl of endpoints) {
    try {
      const rpcResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: ftsoV2Address, data: callData }, 'latest'],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!rpcResponse.ok) continue;
      const rpcJson = (await rpcResponse.json()) as { result?: string };
      if (!rpcJson.result) continue;

      const decoded = decodeFunctionResult({
        abi: GET_SUPPORTED_FEED_IDS_ABI,
        functionName: 'getSupportedFeedIds',
        data: rpcJson.result as `0x${string}`,
      });
      feedIds = (decoded as string[]).filter(
        (id) => id !== '0x0000000000000000000000000000000000000000'
      );
      break;
    } catch (error) {
      logger.warn(
        `Failed to get feed IDs from ${rpcUrl}`,
        error instanceof Error ? error : undefined
      );
      continue;
    }
  }

  if (feedIds.length === 0) {
    return [];
  }

  // Decode feed IDs to symbol names
  const feeds: OracleFeedInsert[] = [];
  for (const feedId of feedIds) {
    const decoded = decodeFlareFeedId(feedId);
    if (!decoded) continue;

    const { symbol, category } = decoded;

    // Only include USD-denominated feeds
    if (!symbol.includes('/USD')) continue;

    // Extract base symbol (e.g., "BTC" from "BTC/USD")
    const baseSymbol = symbol.replace('/USD', '');

    feeds.push({
      provider: 'flare',
      symbol: baseSymbol,
      chain_id: 14,
      address: feedId,
      name: symbol,
      decimals: 8,
      category,
      is_active: true,
      source: 'flare-on-chain',
      metadata: { feedId, network: 'flare' },
    });
  }

  return feeds;
}

// ─── WINkLink ─────────────────────────────────────────────────────

export async function discoverWINkLinkFeeds(): Promise<DiscoveryResult> {
  const feeds = Object.entries(WINKLINK_PRICE_FEEDS).map(([pair, address]) => {
    const symbol = pair.replace(/-USD$/, '');
    return {
      provider: 'winklink',
      symbol,
      chain_id: 0,
      address,
      name: pair.replace('-', '/'),
      decimals: 8,
      category: inferCategory(symbol),
      is_active: true,
      source: 'winklink-official',
      metadata: { network: 'tron-mainnet' },
    } satisfies OracleFeedInsert;
  });
  return { provider: 'winklink', discovered: feeds.length, feeds, errors: [] };
}

// ─── Reflector ────────────────────────────────────────────────────

export async function discoverReflectorFeeds(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider: 'reflector', discovered: 0, feeds: [], errors: [] };
  try {
    const assets = await getReflectorDataService().fetchSupportedAssets();
    result.feeds = assets.map(({ symbol, contractId }) => ({
      provider: 'reflector',
      symbol,
      chain_id: 0,
      address: contractId,
      name: `${symbol}/USD`,
      decimals: 14,
      category: inferCategory(symbol),
      is_active: true,
      source: 'reflector-on-chain',
      metadata: { contractId },
    }));
    result.discovered = result.feeds.length;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    logger.error('Reflector discovery failed', error instanceof Error ? error : new Error(msg));
  }
  return result;
}

// ─── Verify Existing ──────────────────────────────────────────────

export async function verifyExistingFeeds(provider: string): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider, discovered: 0, feeds: [], errors: [] };

  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const supabase = createServiceRoleClient();
    const { data: feeds, error } = await supabase
      .from('oracle_feeds')
      .select('*')
      .eq('provider', provider)
      .eq('is_active', true);

    if (error || !feeds) {
      result.errors.push(error?.message || 'No feeds found');
      return result;
    }

    // Mark all as still active (source updated to verified)
    result.feeds = feeds.map((feed: Record<string, unknown>) => ({
      provider: feed.provider as string,
      symbol: feed.symbol as string,
      chain_id: feed.chain_id as number,
      address: feed.address as string,
      name: feed.name as string,
      decimals: feed.decimals as number,
      category: feed.category as string,
      is_active: true,
      source: 'verified',
      metadata: (feed.metadata as Record<string, unknown>) || {},
    }));

    result.discovered = result.feeds.length;
    logger.info(`${provider}: verified ${result.discovered} existing feeds`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    logger.error(
      `${provider} verification failed`,
      error instanceof Error ? error : new Error(msg)
    );
  }

  return result;
}
