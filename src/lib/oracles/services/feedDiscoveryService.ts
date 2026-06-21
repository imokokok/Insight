/**
 * @fileoverview Feed Discovery Service
 * Discovers oracle feeds from official APIs and on-chain registries.
 * Used by the weekly cron job to keep the database fresh.
 */

import { type OracleFeedInsert } from '@/lib/supabase/queries';
import { createLogger } from '@/lib/utils/logger';

import { feedRegistryService } from './feedRegistryService';

const logger = createLogger('FeedDiscoveryService');

export interface DiscoveryResult {
  provider: string;
  discovered: number;
  feeds: OracleFeedInsert[];
  errors: string[];
}

class FeedDiscoveryService {
  // ─── Chainlink ────────────────────────────────────────────────────

  /**
   * Discover Chainlink feeds via the Feed Registry contract on Ethereum.
   * Queries getFeed(symbol, USD) for a wide range of known symbols.
   */
  async discoverChainlinkFeeds(): Promise<DiscoveryResult> {
    const result: DiscoveryResult = { provider: 'chainlink', discovered: 0, feeds: [], errors: [] };

    try {
      const symbols = this.getChainlinkDiscoverySymbols();
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

  // ─── Pyth ─────────────────────────────────────────────────────────

  /**
   * Discover Pyth price feeds from the Pyth Benchmark API.
   * API: https://benchmarks.pyth.network/v1/price_feeds
   *
   * The API returns a flat array with fields inside `attributes`:
   * [{ id, attributes: { symbol, asset_type, base, description, display_symbol } }]
   */
  async discoverPythFeeds(): Promise<DiscoveryResult> {
    const result: DiscoveryResult = { provider: 'pyth', discovered: 0, feeds: [], errors: [] };

    try {
      const response = await fetch('https://benchmarks.pyth.network/v1/price_feeds', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Pyth API returned ${response.status}`);
      }

      const json = await response.json();

      // Handle both old format { data: [...] } and new flat array format
      let priceFeeds: Array<Record<string, unknown>>;
      if (Array.isArray(json)) {
        priceFeeds = json;
      } else if (json && Array.isArray((json as Record<string, unknown>).data)) {
        priceFeeds = (json as Record<string, unknown>).data as Array<Record<string, unknown>>;
      } else {
        priceFeeds = [];
      }

      for (const feed of priceFeeds) {
        const id = (feed.id as string) || '';
        const attrs = (feed.attributes as Record<string, unknown>) || {};

        // Support both new format (attributes) and legacy format (top-level fields)
        const rawSymbol = (attrs.symbol as string) || (feed.symbol as string) || '';
        const description = (attrs.description as string) || (feed.description as string) || '';
        const assetType = (attrs.asset_type as string) || (feed.asset_type as string) || '';
        const displaySymbol = (attrs.display_symbol as string) || '';
        const base = (attrs.base as string) || '';

        // Only include USD-denominated feeds
        if (
          !rawSymbol.includes('/USD') &&
          !displaySymbol.includes('/USD') &&
          !description.includes('USD')
        )
          continue;

        // Normalize symbol to "XXX/USD" format (strip category prefix like "Crypto.")
        let symbol: string;
        if (displaySymbol && displaySymbol.includes('/USD')) {
          symbol = displaySymbol;
        } else if (rawSymbol) {
          // Strip category prefix (e.g. "Crypto.BTC/USD" → "BTC/USD")
          symbol = rawSymbol.replace(/^[A-Za-z]+\./, '');
        } else if (base) {
          symbol = `${base}/USD`;
        } else {
          symbol = description.replace(/\s*\/\s*USD.*$/, '').replace(/\s+/g, '');
          if (symbol && !symbol.includes('/USD')) symbol = `${symbol}/USD`;
        }

        if (!symbol) continue;

        const category = this.inferCategoryFromAssetType(assetType, symbol.replace('/USD', ''));

        result.feeds.push({
          provider: 'pyth',
          symbol,
          chain_id: 0,
          address: id,
          name: displaySymbol || rawSymbol || symbol,
          decimals: 8,
          category,
          is_active: true,
          source: 'pyth-api',
          metadata: { feedId: id },
        });
      }

      result.discovered = result.feeds.length;
      logger.info(`Pyth: discovered ${result.discovered} feeds`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.errors.push(msg);
      logger.error('Pyth discovery failed', error instanceof Error ? error : new Error(msg));
    }

    return result;
  }

  // ─── Supra ────────────────────────────────────────────────────────

  /**
   * Discover Supra DORA price feeds from the Supra API.
   * API: https://dora.supraoracles.com/v1/price_list
   */
  async discoverSupraFeeds(): Promise<DiscoveryResult> {
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
          category: this.inferCategory(symbol),
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

  /**
   * Discover DIA asset feeds from the DIA API.
   * API: https://api.diadata.org/v1/assetSupply/{blockchain}/{address}
   * We use the symbols endpoint to get available assets.
   */
  async discoverDIAFeeds(): Promise<DiscoveryResult> {
    const result: DiscoveryResult = { provider: 'dia', discovered: 0, feeds: [], errors: [] };

    try {
      // DIA doesn't have a single "list all" endpoint, so we query known blockchains
      const blockchains = [
        'Bitcoin',
        'Ethereum',
        'BNB',
        'Polygon',
        'Avalanche',
        'Arbitrum',
        'Optimism',
        'Fantom',
        'Solana',
      ];

      for (const blockchain of blockchains) {
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
            category: this.inferCategory(symbol),
            is_active: true,
            source: 'dia-api',
            metadata: { blockchain },
          });
        } catch {
          // Skip this blockchain, try next
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

  /**
   * Discover RedStone available tokens from the RedStone API.
   * API: https://api.redstone.finance/prices?provider=redstone&limit=1000
   */
  async discoverRedStoneFeeds(): Promise<DiscoveryResult> {
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
          category: this.inferCategory(item.symbol),
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

  /**
   * Discover API3 dAPIs from the API3 Market API.
   * API: https://market.api3.org/api/dapis
   */
  async discoverAPI3Feeds(): Promise<DiscoveryResult> {
    const result: DiscoveryResult = { provider: 'api3', discovered: 0, feeds: [], errors: [] };

    try {
      const response = await fetch('https://market.api3.org/api/dapis', {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`API3 Market API returned ${response.status}`);
      }

      const data = (await response.json()) as {
        data?: Array<{ name: string; chainId?: number; active?: boolean }>;
      };
      const dapis = data.data || [];

      for (const dapi of dapis) {
        const symbol = dapi.name?.replace(/\/USD.*$/, '') || '';
        if (!symbol) continue;

        const chainId = dapi.chainId || 1;

        result.feeds.push({
          provider: 'api3',
          symbol,
          chain_id: chainId,
          address: dapi.name,
          name: dapi.name,
          decimals: 8,
          category: this.inferCategory(symbol),
          is_active: dapi.active !== false,
          source: 'api3-market',
          metadata: { dapiName: dapi.name },
        });
      }

      result.discovered = result.feeds.length;
      logger.info(`API3: discovered ${result.discovered} feeds`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.errors.push(msg);
      logger.error('API3 discovery failed', error instanceof Error ? error : new Error(msg));
    }

    return result;
  }

  // ─── Flare ────────────────────────────────────────────────────────

  /**
   * Discover Flare FTSO feeds.
   * Primary: on-chain via FTSO V2 getSupportedFeedIds contract method.
   * Fallback: Flare API at https://ftso-api.flare.network/api/v1/feeds
   *
   * Feed ID format (bytes21): 1 byte category + 20 bytes hex-encoded name + zero padding
   * e.g. BTC/USD = 0x014254432f55534400000000000000000000000000
   */
  async discoverFlareFeeds(): Promise<DiscoveryResult> {
    const result: DiscoveryResult = { provider: 'flare', discovered: 0, feeds: [], errors: [] };

    // Try on-chain discovery first
    try {
      const onChainFeeds = await this.discoverFlareFeedsOnChain();
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
          category: this.inferCategory(symbol),
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

  /**
   * Discover Flare feeds on-chain by calling getSupportedFeedIds on the FTSO V2 contract.
   * Decodes the bytes21 feed IDs back to symbol names.
   */
  private async discoverFlareFeedsOnChain(): Promise<OracleFeedInsert[]> {
    const { encodeFunctionData, decodeFunctionResult } = await import('viem');
    const { FLARE_RPC_ENDPOINTS, FTSOV2_ADDRESS, FLARE_CONTRACT_REGISTRY, REGISTRY_ABI } =
      await import('../constants/flareConstants');

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
      const decoded = this.decodeFlareFeedId(feedId);
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

  /**
   * Decode a Flare bytes21 feed ID back to its symbol and category.
   * Format: 1 byte category + 20 bytes hex-encoded name + zero padding
   */
  private decodeFlareFeedId(feedId: string): { symbol: string; category: string } | null {
    try {
      // Remove 0x prefix
      const hex = feedId.startsWith('0x') ? feedId.slice(2) : feedId;
      if (hex.length !== 42) return null; // 21 bytes = 42 hex chars

      // First byte is category
      const categoryByte = parseInt(hex.slice(0, 2), 16);
      // Bytes 1-20 are the hex-encoded feed name
      const nameHex = hex.slice(2);
      // Decode hex to string, removing null bytes
      const nameBytes = Buffer.from(nameHex, 'hex');
      const name = nameBytes.toString('utf8').replace(/\0/g, '').trim();

      if (!name) return null;

      const categoryMap: Record<number, string> = {
        1: 'crypto',
        2: 'forex',
        3: 'commodity',
        4: 'equity',
        33: 'crypto', // Custom crypto feed (0x21)
      };

      const category = categoryMap[categoryByte] || 'crypto';

      return { symbol: name, category };
    } catch {
      return null;
    }
  }

  // ─── WINkLink / TWAP / Reflector ──────────────────────────────────
  // These oracles don't have public "list all feeds" APIs.
  // They rely on on-chain contracts or manual configuration.
  // We keep their seed data from hardcoded constants and only
  // verify existing feeds are still active.

  /**
   * Verify existing feeds in the database are still active.
   * For providers without discovery APIs, this is the only way to detect changes.
   */
  async verifyExistingFeeds(provider: string): Promise<DiscoveryResult> {
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

  // ─── Full Discovery ───────────────────────────────────────────────

  /**
   * Run discovery for all providers.
   * Providers with APIs: fetch latest feeds from official sources.
   * Providers without APIs: verify existing feeds are still active.
   */
  async discoverAll(provider?: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];

    const discoverers: Record<string, () => Promise<DiscoveryResult>> = {
      chainlink: () => this.discoverChainlinkFeeds(),
      pyth: () => this.discoverPythFeeds(),
      supra: () => this.discoverSupraFeeds(),
      dia: () => this.discoverDIAFeeds(),
      redstone: () => this.discoverRedStoneFeeds(),
      api3: () => this.discoverAPI3Feeds(),
      flare: () => this.discoverFlareFeeds(),
      // No public API — verify existing
      winklink: () => this.verifyExistingFeeds('winklink'),
      twap: () => this.verifyExistingFeeds('twap'),
      'twap-token': () => this.verifyExistingFeeds('twap-token'),
      reflector: () => this.verifyExistingFeeds('reflector'),
    };

    if (provider && discoverers[provider]) {
      results.push(await discoverers[provider]());
    } else if (!provider) {
      for (const [name, discoverer] of Object.entries(discoverers)) {
        try {
          results.push(await discoverer());
        } catch (error) {
          logger.error(
            `Discovery failed for ${name}`,
            error instanceof Error ? error : new Error(String(error))
          );
          results.push({ provider: name, discovered: 0, feeds: [], errors: [String(error)] });
        }
      }
    }

    return results;
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private getChainlinkDiscoverySymbols(): string[] {
    return [
      // === Major Cryptocurrencies ===
      'BTC',
      'ETH',
      'BNB',
      'SOL',
      'XRP',
      'ADA',
      'AVAX',
      'DOT',
      'MATIC',
      'LINK',
      'UNI',
      'ATOM',
      'LTC',
      'BCH',
      'ETC',
      'XLM',
      'ALGO',
      'XTZ',
      'EOS',
      'FIL',
      'HBAR',
      'NEAR',
      'FTM',
      'FLOW',
      'ICP',
      'VET',
      'THETA',
      'KAVA',
      'ZEC',
      'DASH',
      'XMR',
      'WAVES',
      'KSM',
      'ZIL',
      'QTUM',
      'ICX',
      'ONT',
      'ZRX',
      'BAT',
      'REP',

      // === DeFi Tokens ===
      'AAVE',
      'COMP',
      'MKR',
      'SNX',
      'CRV',
      'SUSHI',
      'YFI',
      'BAL',
      '1INCH',
      'LDO',
      'RPL',
      'FXS',
      'CVX',
      'SPELL',
      'ALCX',
      'BADGER',
      'PERP',
      'REN',
      'KNC',
      'BNT',
      'ALPHA',
      'CREAM',
      'RUNE',
      'LUNA',
      'UST',
      'WNXM',
      'NXM',
      'MPL',
      'BOND',
      'ORN',
      'RARI',
      'FARM',
      'ALPHA',
      'SRM',
      'RAY',
      'FTT',
      'OXY',
      'TOKE',

      // === Layer 2 & Sidechains ===
      'ARB',
      'OP',
      'METIS',
      'BOBA',
      'IMX',
      'LRC',
      'MINA',
      'CELR',
      'SKL',

      // === NFT & Gaming ===
      'SAND',
      'MANA',
      'AXS',
      'ENJ',
      'GALA',
      'ILV',
      'ALICE',
      'TLM',
      'SLP',
      'CHZ',
      'AUDIO',
      'GHST',
      'LOOKS',
      'BLUR',
      'APE',

      // === Oracle & Data ===
      'GRT',
      'BAND',
      'API3',
      'TRB',

      // === Infrastructure ===
      'RNDR',
      'AR',
      'STORJ',
      'ANKR',
      'NKN',
      'POKT',

      // === New Layer 1s ===
      'SUI',
      'SEI',
      'TIA',
      'APT',
      'INJ',
      'TON',
      'STRK',
      'PYTH',
      'JUP',
      'JTO',
      'WLD',

      // === Memecoins ===
      'DOGE',
      'SHIB',
      'PEPE',
      'WIF',
      'BONK',
      'FLOKI',

      // === Liquid Staking Derivatives ===
      'STETH',
      'RETH',
      'CBETH',
      'WSTETH',
      'WEETH',
      'STMATIC',
      'FRXETH',
      'SFRXETH',
      'RETH',
      'ANKRETH',
      'SWETH',

      // === Wrapped Assets ===
      'WBTC',
      'RENBTC',
      'TBTC',
      'HBTC',
      'WETH',

      // === Stablecoins ===
      'USDC',
      'USDT',
      'DAI',
      'FRAX',
      'LUSD',
      'BUSD',
      'TUSD',
      'USDD',
      'USDP',
      'GUSD',
      'USDX',
      'USDN',
      'RSV',
      'USDK',
      'PAX',
      'HUSD',
      'SUSD',
      'MUSD',
      'DUSD',
      'CRVUSD',
      'GHO',
      'PYUSD',
      'FDUSD',
      'EURC',
      'EURT',
      'EURS',
      'XSGD',
      'XAUT',

      // === RWA (Real World Assets) ===
      'PAXG',
      'DGX',
      'PMGT',

      // === Newer DeFi ===
      'PENDLE',
      'ENA',
      'ETHFI',
      'W',
      'TNSR',
      'SAGA',
      'ENS',
      'GMX',
      'RDNT',
      'MAGIC',
      'GRAIL',
      'JOE',
      'PNG',
      'QUICK',
      'DYDX',
      'PERP',
      'LEVER',
      'CAKE',
      'BIFI',

      // === Exchange Tokens ===
      'CRO',
      'HT',
      'OKB',
      'LEO',
      'KCS',
      'GT',

      // === Forex Pairs ===
      'EUR',
      'GBP',
      'JPY',
      'CHF',
      'AUD',
      'CAD',
      'NZD',
      'SGD',
      'HKD',
      'KRW',
      'INR',
      'MXN',
      'BRL',
      'SEK',
      'NOK',
      'DKK',
      'TRY',
      'ZAR',
      'PHP',
      'IDR',
      'CNY',
      'RUB',
      'THB',
      'PLN',
      'CZK',
      'ILS',
      'CLP',
      'TWD',
      'ARS',

      // === Commodities ===
      'XAU', // Gold
      'XAG', // Silver
      'XPT', // Platinum
      'XPD', // Palladium
      'XCU', // Copper
      'OIL', // Crude Oil
      'BRENT', // Brent Crude
      'NG', // Natural Gas

      // === US Equities (Tech) ===
      'AAPL',
      'AMZN',
      'GOOGL',
      'GOOG',
      'MSFT',
      'META',
      'TSLA',
      'NVDA',
      'AMD',
      'INTC',
      'NFLX',
      'COIN',
      'SQ',
      'PYPL',
      'SHOP',
      'UBER',
      'SNAP',
      'TWTR',
      'PINS',
      'ROKU',
      'ZM',
      'DOCU',
      'SNOW',
      'DDOG',
      'NET',
      'CRWD',
      'ZS',
      'OKTA',

      // === US Equities (Finance) ===
      'JPM',
      'BAC',
      'WFC',
      'GS',
      'MS',
      'C',
      'USB',
      'PNC',
      'BK',
      'AXP',
      'V',
      'MA',
      'SCHW',

      // === US Equities (Other) ===
      'BRK.B',
      'JNJ',
      'UNH',
      'PG',
      'HD',
      'DIS',
      'ADBE',
      'CRM',
      'ORCL',
      'CSCO',
      'VZ',
      'T',
      'CMCSA',
      'PEP',
      'KO',
      'NKE',
      'MCD',
      'WMT',
      'CVX',
      'XOM',
      'BA',
      'CAT',
      'MMM',
      'HON',

      // === ETFs ===
      'SPY',
      'QQQ',
      'IWM',
      'DIA',
      'VTI',
      'VOO',
      'GLD',
      'SLV',
      'TLT',
      'HYG',
      'LQD',
      'EEM',
      'EFA',
      'VEA',
      'IEMG',
      'VWO',
      'ARKK',
      'ARKW',
      'ARKG',
    ];
  }

  private inferCategory(symbol: string): string {
    const forex = [
      'EUR',
      'GBP',
      'JPY',
      'CHF',
      'AUD',
      'CAD',
      'NZD',
      'SGD',
      'HKD',
      'KRW',
      'INR',
      'MXN',
      'BRL',
      'SEK',
      'NOK',
      'TRY',
      'ZAR',
      'PHP',
      'IDR',
      'CNY',
    ];
    const commodity = ['XAU', 'XAG', 'XPT', 'XPD'];
    const equity = ['AAPL', 'AMZN', 'TSLA', 'GOOGL', 'MSFT', 'META', 'NVDA', 'COIN'];
    const stablecoin = [
      'USDC',
      'USDT',
      'DAI',
      'FRAX',
      'LUSD',
      'BUSD',
      'TUSD',
      'USDD',
      'USDP',
      'PYUSD',
      'GHO',
      'CRVUSD',
    ];

    if (forex.includes(symbol)) return 'forex';
    if (commodity.includes(symbol)) return 'commodity';
    if (equity.includes(symbol)) return 'equity';
    if (stablecoin.includes(symbol)) return 'stablecoin';
    return 'crypto';
  }

  private inferCategoryFromAssetType(assetType: string | undefined, symbol: string): string {
    if (assetType) {
      const lower = assetType.toLowerCase();
      if (lower.includes('crypto')) return 'crypto';
      if (lower.includes('forex') || lower.includes('fiat')) return 'forex';
      if (lower.includes('commodity') || lower.includes('metal')) return 'commodity';
      if (lower.includes('equity') || lower.includes('stock')) return 'equity';
      if (lower.includes('etf')) return 'etf';
    }
    return this.inferCategory(symbol);
  }
}

export const feedDiscoveryService = new FeedDiscoveryService();
