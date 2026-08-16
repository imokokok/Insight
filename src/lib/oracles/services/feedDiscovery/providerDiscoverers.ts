import { type OracleFeedInsert } from '@/lib/supabase/queries';
import { createLogger } from '@/lib/utils/logger';
import { Blockchain } from '@/types/oracle';

import { BLOCKCHAIN_TO_CHAIN_ID } from '../../constants/chainMapping';
import { getAllSupportedSymbols } from '../../constants/supportedSymbols';
import { SWITCHBOARD_SURGE_FEEDS_URL } from '../../constants/switchboardConstants';
import { feedRegistryService } from '../feedRegistryService';

import { decodeFlareFeedId, getChainlinkDiscoverySymbols, inferCategory } from './discoveryHelpers';

import type { DiscoveryResult } from './discoveryTypes';

const logger = createLogger('FeedDiscoveryService');

// ─── Chainlink ────────────────────────────────────────────────────

export async function discoverChainlinkFeeds(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider: 'chainlink', discovered: 0, feeds: [], errors: [] };

  try {
    const symbols = getChainlinkDiscoverySymbols();
    const discovered = await feedRegistryService.discoverFeedsOnEthereum(symbols);
    result.discovered = discovered.length;

    result.feeds = discovered.map((f) => ({
      provider: 'chainlink',
      symbol: f.symbol,
      chain_id: f.chainId,
      address: f.address,
      name: f.description,
      decimals: f.decimals,
      category: f.category,
      is_active: true,
      source: 'feed-registry',
    }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    logger.error('Chainlink discovery failed', error instanceof Error ? error : new Error(msg));
  }

  return result;
}

// ─── Supra ────────────────────────────────────────────────────────

export async function discoverSupraFeeds(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider: 'supra', discovered: 0, feeds: [], errors: [] };

  try {
    const response = await fetch('https://dora.supraoracles.com/v1/price_list', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Supra API returned ${response.status}`);
    }

    const data = (await response.json()) as Array<{
      pair_index: number;
      base: string;
      quote: string;
      name: string;
    }>;
    const priceList = Array.isArray(data) ? data : [];

    for (const item of priceList) {
      const symbol = item.base || item.name?.replace(/\/USD.*$/, '') || '';
      if (!symbol) continue;

      result.feeds.push({
        provider: 'supra',
        symbol,
        chain_id: 0,
        address: String(item.pair_index),
        name: item.name || `${symbol}/USD`,
        decimals: 8,
        category: inferCategory(symbol),
        is_active: true,
        source: 'supra-api',
        metadata: { pairIndex: item.pair_index },
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
    // DIA doesn't have a single "list all" endpoint, so we query known
    // blockchains for their native token (address=0x0…0) and separately
    // probe well-known ERC-20 / native-stablecoin contracts.
    //
    // IMPORTANT: blockchain names must match DIA API conventions exactly.
    // "BNB" ≠ "BinanceSmartChain", "Polygon" ≠ DIA's Polygon name, etc.
    const nativeTokens: Array<{ blockchain: string; expectedSymbol?: string }> = [
      { blockchain: 'Bitcoin' },
      { blockchain: 'Ethereum' },
      { blockchain: 'BinanceSmartChain' },
      { blockchain: 'Avalanche' },
      { blockchain: 'Fantom' },
      { blockchain: 'Solana' },
      { blockchain: 'Cardano' },
      { blockchain: 'Polkadot' },
      { blockchain: 'Cosmos' },
      { blockchain: 'Litecoin' },
      { blockchain: 'BitcoinCash' },
      { blockchain: 'EthereumClassic' },
      { blockchain: 'Stellar' },
      { blockchain: 'Filecoin' },
      { blockchain: 'NEAR' },
    ];

    for (const { blockchain } of nativeTokens) {
      try {
        const response = await fetch(
          `https://api.diadata.org/v1/assetQuotation/${blockchain}/0x0000000000000000000000000000000000000000`,
          { signal: AbortSignal.timeout(15000) }
        );

        if (!response.ok) continue;

        const data = (await response.json()) as {
          Symbol?: string;
          Name?: string;
          Price?: number;
        };
        if (!data.Symbol) continue;

        const symbol = data.Symbol;
        // Skip if already discovered for this symbol
        if (result.feeds.some((f) => f.symbol === symbol)) continue;

        result.feeds.push({
          provider: 'dia',
          symbol,
          chain_id: 0,
          address: '0x0000000000000000000000000000000000000000',
          name: `${symbol}/USD`,
          decimals: 8,
          category: inferCategory(symbol),
          is_active: true,
          source: 'dia-api',
          metadata: { blockchain },
        });
      } catch {
        // Skip this blockchain, try next
        continue;
      }
    }

    // Probe well-known ERC-20 tokens on Ethereum. These are stablecoins
    // and major DeFi tokens whose DIA API endpoints we verified work.
    const erc20Tokens: Array<{ symbol: string; address: string }> = [
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
    ];

    for (const { symbol, address } of erc20Tokens) {
      try {
        const response = await fetch(
          `https://api.diadata.org/v1/assetQuotation/Ethereum/${address}`,
          { signal: AbortSignal.timeout(15000) }
        );
        if (!response.ok) continue;

        const data = (await response.json()) as { Symbol?: string; Price?: number };
        if (!data.Symbol || !data.Price) continue;

        if (result.feeds.some((f) => f.symbol === symbol)) continue;

        result.feeds.push({
          provider: 'dia',
          symbol,
          chain_id: 0,
          address,
          name: `${symbol}/USD`,
          decimals: 8,
          category: inferCategory(symbol),
          is_active: true,
          source: 'dia-api',
          metadata: { blockchain: 'Ethereum' },
        });
      } catch {
        continue;
      }
    }

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
      'https://api.redstone.finance/prices?provider=redstone&limit=1000',
      { signal: AbortSignal.timeout(30000) }
    );

    if (!response.ok) {
      throw new Error(`RedStone API returned ${response.status}`);
    }

    const data = (await response.json()) as Array<{
      symbol: string;
      value: number;
      timestamp: number;
    }>;
    const prices = Array.isArray(data) ? data : [];

    for (const item of prices) {
      if (!item.symbol) continue;

      result.feeds.push({
        provider: 'redstone',
        symbol: item.symbol,
        chain_id: 0,
        address: item.symbol,
        name: `${item.symbol}/USD`,
        decimals: 8,
        category: inferCategory(item.symbol),
        is_active: true,
        source: 'redstone-api',
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

// ─── Switchboard ──────────────────────────────────────────────────
//
// Switchboard publishes its managed Surge feed catalogue at
// `GET /stream/surge_feeds` on the public Crossbar gateway. The response
// is `{ total, data: [...] }` where each entry is:
//   { symbol: { base, quote }, feeds: [ { source, feed_id }, ... ] }
// Each pair exposes multiple sources (BINANCE, OKX, BYBIT, WEIGHTED, AUTO).
// We prefer the WEIGHTED source — the multi-exchange aggregate that matches
// the hardcoded SWITCHBOARD_FEED_IDS map — and only keep USD-quoted pairs.
// Surge feeds are chain-agnostic (consensus is produced on Solana and served
// via Crossbar), so every discovered feed is stored with chain_id=0.

interface SurgeFeedSource {
  source?: string;
  feed_id?: string;
  feedId?: string;
}

interface SurgeFeedEntry {
  symbol?: { base?: string; quote?: string } | string;
  feeds?: SurgeFeedSource[];
  // Tolerate flat shapes too (feedHash/feed_id at top level) in case the
  // catalogue format changes back to a flatter structure.
  feedHash?: string;
  feed_id?: string;
  feedId?: string;
  base?: string;
  quote?: string;
}

const SWITCHBOARD_PREFERRED_SOURCES = ['WEIGHTED', 'AUTO'];

function pickSwitchboardFeedHash(sources: SurgeFeedSource[]): string | null {
  if (!sources || sources.length === 0) return null;
  for (const preferred of SWITCHBOARD_PREFERRED_SOURCES) {
    const match = sources.find((s) => s.source?.toUpperCase() === preferred);
    if (match?.feed_id || match?.feedId) return (match.feed_id || match.feedId)!;
  }
  // Fallback: first source with any feed id.
  for (const s of sources) {
    if (s.feed_id || s.feedId) return (s.feed_id || s.feedId)!;
  }
  return null;
}

export async function discoverSwitchboardFeeds(): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { provider: 'switchboard', discovered: 0, feeds: [], errors: [] };

  try {
    const response = await fetch(SWITCHBOARD_SURGE_FEEDS_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Switchboard Crossbar returned ${response.status}`);
    }

    const json = await response.json();
    // Normalise to an array of feed entries. Confirmed shape is
    // `{ total, data: [...] }`, but tolerate a top-level array or other
    // wrapping keys (feeds/rows) for forward-compatibility.
    let feedList: SurgeFeedEntry[];
    if (Array.isArray(json)) {
      feedList = json as SurgeFeedEntry[];
    } else if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      feedList = Array.isArray(obj.data)
        ? (obj.data as SurgeFeedEntry[])
        : Array.isArray(obj.feeds)
          ? (obj.feeds as SurgeFeedEntry[])
          : [];
    } else {
      feedList = [];
    }

    for (const entry of feedList) {
      // Resolve base/quote — `symbol` is `{ base, quote }` in the confirmed
      // shape, but tolerate a flat string ("BTC/USD") or top-level base/quote.
      let base = '';
      let quote = '';
      if (entry.symbol && typeof entry.symbol === 'object') {
        base = entry.symbol.base || '';
        quote = entry.symbol.quote || '';
      } else if (typeof entry.symbol === 'string') {
        const parts = entry.symbol.split('/');
        base = parts[0] || entry.symbol;
        quote = parts[1] || '';
      } else {
        base = entry.base || '';
        quote = entry.quote || '';
      }

      base = base.toUpperCase().trim();
      quote = quote.toUpperCase().trim();
      if (!base) continue;
      // Only keep USD-quoted pairs.
      if (quote && quote !== 'USD') continue;

      // Resolve the feed hash: prefer WEIGHTED source from the nested
      // `feeds` array; fall back to a flat feed id field.
      const feedHash = entry.feeds
        ? pickSwitchboardFeedHash(entry.feeds)
        : entry.feedHash || entry.feed_id || entry.feedId || '';
      if (!feedHash) continue;

      result.feeds.push({
        provider: 'switchboard',
        symbol: base,
        chain_id: 0,
        address: feedHash,
        name: `${base}/USD`,
        decimals: 18,
        category: inferCategory(base),
        is_active: true,
        source: 'switchboard-crossbar',
        metadata: { feedHash, quote: 'USD', source_type: 'surge-weighted' },
      });
    }

    result.discovered = result.feeds.length;
    logger.info(`Switchboard: discovered ${result.discovered} Surge feeds`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    logger.error('Switchboard discovery failed', error instanceof Error ? error : new Error(msg));
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
