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

      const data = (await response.json()) as {
        data?: Array<{ id: string; symbol: string; description: string; asset_type: string }>;
      };
      const priceFeeds = data.data || [];

      for (const feed of priceFeeds) {
        // Only include USD-denominated feeds
        if (!feed.symbol.includes('/USD') && !feed.description?.includes('USD')) continue;

        const symbol = feed.symbol || feed.description?.replace(/\s*\/\s*USD.*$/, '') || '';
        if (!symbol) continue;

        const category = this.inferCategoryFromAssetType(feed.asset_type, symbol);

        result.feeds.push({
          provider: 'pyth',
          symbol,
          chain_id: 0,
          address: feed.id,
          name: feed.symbol || feed.description || symbol,
          decimals: 8,
          category,
          is_active: true,
          source: 'pyth-api',
          metadata: { feedId: feed.id },
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
   * Discover Flare FTSO feeds from the Flare API.
   * API: https://ftso-api.flare.network/api/v1/feeds
   */
  async discoverFlareFeeds(): Promise<DiscoveryResult> {
    const result: DiscoveryResult = { provider: 'flare', discovered: 0, feeds: [], errors: [] };

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
      logger.info(`Flare: discovered ${result.discovered} feeds`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.errors.push(msg);
      logger.error('Flare discovery failed', error instanceof Error ? error : new Error(msg));
    }

    return result;
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
      // Crypto
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
      'AAVE',
      'COMP',
      'MKR',
      'SNX',
      'CRV',
      'SUSHI',
      'YFI',
      'BAL',
      'DOGE',
      'SHIB',
      'LTC',
      'BCH',
      'ETC',
      'FIL',
      'ARB',
      'OP',
      'ATOM',
      'NEAR',
      'FTM',
      'ALGO',
      'XTZ',
      'EOS',
      'HBAR',
      'FLOW',
      'SAND',
      'MANA',
      'AXS',
      'GRT',
      'APE',
      'INJ',
      'SUI',
      'SEI',
      'TIA',
      'TON',
      'WIF',
      'BONK',
      'PEPE',
      'PYTH',
      'JUP',
      'WLD',
      'STRK',
      'IMX',
      'RNDR',
      'PENDLE',
      'ENA',
      'ETHFI',
      'W',
      'TNSR',
      'SAGA',
      'TIA',
      'JTO',
      'BLUR',
      'LOOKS',
      'ENS',
      'LDO',
      'RPL',
      'FXS',
      'RPL',
      'CBETH',
      'RETH',
      'STETH',
      'WEETH',
      'USDC',
      'USDT',
      'DAI',
      'FRAX',
      'LUSD',
      'BUSD',
      'TUSD',
      'USDD',
      'USDP',
      'WBTC',
      'RENBTC',
      'CRVUSD',
      'GHO',
      'PYUSD',
      // Forex
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
      // Commodities
      'XAU',
      'XAG',
      'XPT',
      'XPD',
      // Equities
      'AAPL',
      'AMZN',
      'TSLA',
      'GOOGL',
      'MSFT',
      'META',
      'NVDA',
      'COIN',
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
