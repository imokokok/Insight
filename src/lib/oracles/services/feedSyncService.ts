import { type OracleFeedInsert } from '@/lib/supabase/queries';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

import { DIA_ASSET_MAPPING, type DIAAssetConfig } from '../constants/diaConstants';
import { FLARE_SYMBOL_TO_FEED_ID } from '../constants/flareConstants';
import { PYTH_PRICE_FEED_IDS } from '../constants/pythConstants';
import { REFLECTOR_ASSET_CONTRACT_MAP } from '../constants/reflectorConstants';
import { getAssetClass, redstoneSymbols } from '../constants/supportedSymbols';
import { SUPRA_PAIR_INDEX_MAP } from '../constants/supraConstants';
import { SWITCHBOARD_FEED_IDS } from '../constants/switchboardConstants';
import { TWAP_POOL_ADDRESSES, TWAP_TOKEN_ADDRESSES } from '../constants/twapConstants';

import {
  CHAINLINK_PRICE_FEEDS,
  getSupportedSymbols,
  type ChainlinkPriceFeed,
} from './chainlinkDataSources';
import { feedRegistryService } from './feedRegistryService';

const logger = createLogger('FeedSyncService');

interface SyncResult {
  provider: string;
  discovered: number;
  upserted: number;
  deactivated: number;
  errors: number;
}

async function upsertFeeds(feeds: OracleFeedInsert[]): Promise<number> {
  if (feeds.length === 0) return 0;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('oracle_feeds')
    .upsert(feeds, { onConflict: 'provider,symbol,chain_id' })
    .select();
  if (error) {
    logger.error(
      'Failed to upsert feeds',
      error instanceof Error ? error : new Error(String(error))
    );
    return 0;
  }
  return data?.length || 0;
}

class FeedSyncService {
  // ─── Chainlink ────────────────────────────────────────────────────

  async seedChainlinkFeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'chainlink',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    for (const [symbol, chainMap] of Object.entries(CHAINLINK_PRICE_FEEDS)) {
      for (const [chainIdStr, feed] of Object.entries(
        chainMap as Record<string, ChainlinkPriceFeed>
      )) {
        feeds.push({
          provider: 'chainlink',
          symbol,
          chain_id: Number(chainIdStr),
          address: feed.address,
          name: feed.name,
          decimals: feed.decimals,
          category: feed.category,
          is_active: true,
          source: 'hardcoded',
        });
        result.discovered++;
      }
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  async syncChainlinkFeedsFromRegistry(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'chainlink',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    try {
      const symbols = getSupportedSymbols();
      const discovered = await feedRegistryService.discoverFeedsOnEthereum(symbols);
      result.discovered = discovered.length;
      if (discovered.length === 0) return result;

      const feeds: OracleFeedInsert[] = discovered.map((f) => ({
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

      result.upserted = await upsertFeeds(feeds);
    } catch (error) {
      logger.error(
        'Failed to sync chainlink feeds from registry',
        error instanceof Error ? error : new Error(String(error))
      );
      result.errors++;
    }
    return result;
  }

  async verifyChainlinkFeeds(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'chainlink',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    try {
      const supabase = createServiceRoleClient();
      const { data: feeds, error } = await supabase
        .from('oracle_feeds')
        .select('*')
        .eq('provider', 'chainlink')
        .eq('is_active', true);
      if (error || !feeds) {
        result.errors++;
        return result;
      }

      const sample = feeds.sort(() => Math.random() - 0.5).slice(0, 20);
      for (const feed of sample) {
        const verified = await feedRegistryService.verifyFeedOnChain(
          feed.symbol,
          feed.chain_id,
          feed.address as `0x${string}`
        );
        if (!verified) {
          logger.warn(`Feed may be inactive: ${feed.symbol} on chain ${feed.chain_id}`);
        }
      }
      result.discovered = sample.length;
    } catch (error) {
      logger.error(
        'Failed to verify feeds',
        error instanceof Error ? error : new Error(String(error))
      );
      result.errors++;
    }
    return result;
  }

  // ─── Pyth ─────────────────────────────────────────────────────────

  async seedPythFeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'pyth',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    for (const [symbolPair, feedId] of Object.entries(PYTH_PRICE_FEED_IDS)) {
      const baseSymbol = symbolPair.replace('/USD', '');
      const category = this.inferCategory(baseSymbol);
      feeds.push({
        provider: 'pyth',
        symbol: symbolPair,
        chain_id: 0,
        address: feedId,
        name: symbolPair,
        decimals: 8,
        category,
        is_active: true,
        source: 'hardcoded',
        metadata: { feedId },
      });
      result.discovered++;
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  // ─── Supra ────────────────────────────────────────────────────────

  async seedSupraFeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'supra',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    for (const [symbol, pairIndex] of Object.entries(SUPRA_PAIR_INDEX_MAP)) {
      feeds.push({
        provider: 'supra',
        symbol,
        chain_id: 0,
        address: String(pairIndex),
        name: `${symbol}/USD`,
        decimals: 8,
        category: this.inferCategory(symbol),
        is_active: true,
        source: 'hardcoded',
        metadata: { pairIndex },
      });
      result.discovered++;
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  // ─── DIA ──────────────────────────────────────────────────────────

  async seedDIAFeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'dia',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    for (const [symbol, config] of Object.entries(DIA_ASSET_MAPPING) as [
      string,
      DIAAssetConfig,
    ][]) {
      feeds.push({
        provider: 'dia',
        symbol,
        chain_id: 0,
        address: config.address,
        name: `${symbol}/USD`,
        decimals: config.decimals || 8,
        category: this.inferCategory(symbol),
        is_active: true,
        source: 'hardcoded',
        metadata: { blockchain: config.blockchain },
      });
      result.discovered++;
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  // ─── RedStone ─────────────────────────────────────────────────────

  async seedRedStoneFeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'redstone',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    for (const symbol of redstoneSymbols) {
      feeds.push({
        provider: 'redstone',
        symbol,
        chain_id: 0,
        address: symbol,
        name: `${symbol}/USD`,
        decimals: 8,
        category: this.inferCategory(symbol),
        is_active: true,
        source: 'hardcoded',
      });
      result.discovered++;
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  // ─── API3 ─────────────────────────────────────────────────────────

  async seedAPI3FeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'api3',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    // API3 dAPI name mapping (mirrored from api3NetworkService)
    const SYMBOL_TO_DAPI: Record<string, string> = {
      ETH: 'ETH/USD',
      BTC: 'BTC/USD',
      BNB: 'BNB/USD',
      SOL: 'SOL/USD',
      ARB: 'ARB/USD',
      COMP: 'COMP/USD',
      BAL: 'BAL/USD',
      USDC: 'USDC/USD',
      USDT: 'USDT/USD',
      DAI: 'DAI/USD',
      WBTC: 'WBTC/USD',
      AVAX: 'AVAX/USD',
      LINK: 'LINK/USD',
      MATIC: 'MATIC/USD',
      OP: 'OP/USD',
      UNI: 'UNI/USD',
      AAVE: 'AAVE/USD',
      PYTH: 'PYTH/USD',
      DOGE: 'DOGE/USD',
      XRP: 'XRP/USD',
      ADA: 'ADA/USD',
      DOT: 'DOT/USD',
      LTC: 'LTC/USD',
      BCH: 'BCH/USD',
      ETC: 'ETC/USD',
      XLM: 'XLM/USD',
      ATOM: 'ATOM/USD',
      SHIB: 'SHIB/USD',
      FTM: 'FTM/USD',
      GRT: 'GRT/USD',
      SUSHI: 'SUSHI/USD',
      MKR: 'MKR/USD',
      YFI: 'YFI/USD',
      CRV: 'CRV/USD',
      SNX: 'SNX/USD',
      THETA: 'THETA/USD',
      KAVA: 'KAVA/USD',
      PEPE: 'PEPE/USD',
      BONK: 'BONK/USD',
      WIF: 'WIF/USD',
      INJ: 'INJ/USD',
      SUI: 'SUI/USD',
      SEI: 'SEI/USD',
      TIA: 'TIA/USD',
      TON: 'TON/USD',
      FRAX: 'FRAX/USD',
      LUSD: 'LUSD/USD',
      WETH: 'WETH/USD',
    };

    // API3 supported chain IDs
    const API3_CHAIN_IDS = [1, 42161, 137, 43114, 56, 8453, 10, 250];

    for (const [symbol, dapiName] of Object.entries(SYMBOL_TO_DAPI)) {
      for (const chainId of API3_CHAIN_IDS) {
        feeds.push({
          provider: 'api3',
          symbol,
          chain_id: chainId,
          address: dapiName,
          name: dapiName,
          decimals: 8,
          category: this.inferCategory(symbol),
          is_active: true,
          source: 'hardcoded',
          metadata: { dapiName },
        });
        result.discovered++;
      }
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  // ─── WINkLink ─────────────────────────────────────────────────────

  async seedWinklinkFeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'winklink',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    const WINKLINK_PRICE_FEEDS: Record<string, string> = {
      'BTC-USD': 'TQoijQ1iZKRgJsAAWNPMu6amgtCJ3WMUV7',
      'ETH-USD': 'TR2yWYWovJaSM7TfZq7L7sT7ZRugdJJQmL',
      'TRX-USD': 'TR5HtpPK4gX4RFC4DCBUHfFgsGkGFEzSAb',
      'USDT-USD': 'TKePc46n5CiUCR8LL788TFeKA4kjvNnuem',
      'USDC-USD': 'TNu3zS55MP4KnBBP6Maw1nHSzRpc3CXAxm',
      'USDD-USD': 'TJ7jEgoYVaeymVfYZ3bS57dYArwVDS1mhW',
      'WIN-USD': 'TSCef3LT3jpLwwXCWhZe3hZoMsYk1ZLif2',
      'BTT-USD': 'TBAAW545oJ6iTxqzezGvagrSUzCpz1S8eR',
      'JST-USD': 'TE5rKoDzKmpVAQp1sn7x6V8biivR3d5r47',
      'SUN-USD': 'TRMgzSPsuWEcVpd5hv19XtLeCk8Z799sZa',
      'LTC-USD': 'TGxGL85kN3W5sGdBiobgWabWFcMEtoqRJJ',
      'NFT-USD': 'TEC8b2oL6sAQFMiea73tTgjtTLwyV1GuZU',
      'TUSD-USD': 'TBc3yBP8xcyQ1E3hDTUhRxToMrgekLH2kh',
      'USDJ-USD': 'TB1MyT7pDCNg8w7cSW1QvYKs4WPzErzP5k',
      'WBTC-USD': 'TCYS6aj9shB6rZNpTCqSkN1aTwkSnz1wHq',
    };

    for (const [pair, address] of Object.entries(WINKLINK_PRICE_FEEDS)) {
      const symbol = pair.replace('-USD', '');
      feeds.push({
        provider: 'winklink',
        symbol,
        chain_id: 0,
        address,
        name: pair,
        decimals: 8,
        category: this.inferCategory(symbol),
        is_active: true,
        source: 'hardcoded',
      });
      result.discovered++;
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  // ─── TWAP ─────────────────────────────────────────────────────────

  async seedTwapFeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'twap',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    for (const [symbol, chainMap] of Object.entries(TWAP_POOL_ADDRESSES)) {
      for (const [chainIdStr, pool] of Object.entries(chainMap)) {
        if (!pool.address) continue;
        feeds.push({
          provider: 'twap',
          symbol,
          chain_id: Number(chainIdStr),
          address: pool.address,
          name: `${pool.token0}/${pool.token1}`,
          decimals: 18,
          category: this.inferCategory(symbol),
          is_active: true,
          source: 'hardcoded',
          metadata: { feeTier: pool.feeTier, token0: pool.token0, token1: pool.token1 },
        });
        result.discovered++;
      }
    }

    // Also seed token addresses as separate entries
    for (const [tokenSymbol, chainMap] of Object.entries(TWAP_TOKEN_ADDRESSES)) {
      for (const [chainIdStr, address] of Object.entries(chainMap)) {
        feeds.push({
          provider: 'twap-token',
          symbol: tokenSymbol,
          chain_id: Number(chainIdStr),
          address,
          name: tokenSymbol,
          decimals: 18,
          category: this.inferCategory(tokenSymbol),
          is_active: true,
          source: 'hardcoded',
        });
        result.discovered++;
      }
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  // ─── Reflector ────────────────────────────────────────────────────

  async seedReflectorFeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'reflector',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    for (const [symbol, contractId] of Object.entries(REFLECTOR_ASSET_CONTRACT_MAP)) {
      const category = this.inferCategory(symbol);
      feeds.push({
        provider: 'reflector',
        symbol,
        chain_id: 0,
        address: contractId,
        name: `${symbol}/USD`,
        decimals: 14,
        category,
        is_active: true,
        source: 'hardcoded',
        metadata: { contractType: category === 'forex' ? 'forex' : 'crypto' },
      });
      result.discovered++;
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  // ─── Flare ────────────────────────────────────────────────────────

  async seedFlareFeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'flare',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    const FLARE_NETWORK_CHAIN_ID: Record<string, number> = {
      flare: 14,
      songbird: 19,
      coston2: 114,
    };

    for (const [symbol, feedId] of Object.entries(FLARE_SYMBOL_TO_FEED_ID)) {
      // Seed for Flare mainnet by default
      const chainId = FLARE_NETWORK_CHAIN_ID.flare;
      const category = this.inferCategory(symbol);
      feeds.push({
        provider: 'flare',
        symbol,
        chain_id: chainId,
        address: feedId,
        name: `${symbol}/USD`,
        decimals: 8,
        category,
        is_active: true,
        source: 'hardcoded',
        metadata: { feedId, network: 'flare' },
      });
      result.discovered++;
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  // ─── Switchboard ──────────────────────────────────────────────────

  async seedSwitchboardFeedsFromHardcoded(): Promise<SyncResult> {
    const result: SyncResult = {
      provider: 'switchboard',
      discovered: 0,
      upserted: 0,
      deactivated: 0,
      errors: 0,
    };
    const feeds: OracleFeedInsert[] = [];

    // Switchboard Surge feeds are chain-agnostic (served via Crossbar from the
    // Solana oracle network), so every feed is stored with chain_id=0 — the
    // same convention used by Pyth/Supra/DIA/RedStone.
    for (const [symbol, feedHash] of Object.entries(SWITCHBOARD_FEED_IDS)) {
      feeds.push({
        provider: 'switchboard',
        symbol,
        chain_id: 0,
        address: feedHash,
        name: `${symbol}/USD`,
        decimals: 18,
        category: this.inferCategory(symbol),
        is_active: true,
        source: 'hardcoded',
        metadata: { feedHash, quote: 'USD', source_type: 'surge-weighted' },
      });
      result.discovered++;
    }

    result.upserted = await upsertFeeds(feeds);
    return result;
  }

  // ─── Full Sync ────────────────────────────────────────────────────

  async fullSync(provider?: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const seeders: Record<string, () => Promise<SyncResult>> = {
      chainlink: () => this.seedChainlinkFeedsFromHardcoded(),
      pyth: () => this.seedPythFeedsFromHardcoded(),
      supra: () => this.seedSupraFeedsFromHardcoded(),
      dia: () => this.seedDIAFeedsFromHardcoded(),
      redstone: () => this.seedRedStoneFeedsFromHardcoded(),
      api3: () => this.seedAPI3FeedsFromHardcoded(),
      winklink: () => this.seedWinklinkFeedsFromHardcoded(),
      twap: () => this.seedTwapFeedsFromHardcoded(),
      'twap-token': () => this.seedTwapFeedsFromHardcoded(),
      reflector: () => this.seedReflectorFeedsFromHardcoded(),
      flare: () => this.seedFlareFeedsFromHardcoded(),
      switchboard: () => this.seedSwitchboardFeedsFromHardcoded(),
    };

    if (provider && seeders[provider]) {
      results.push(await seeders[provider]());
    } else if (provider === 'chainlink' || !provider) {
      // For chainlink, also run registry discovery
      results.push(await this.seedChainlinkFeedsFromHardcoded());
      results.push(await this.syncChainlinkFeedsFromRegistry());
      // Seed other providers
      for (const [name, seeder] of Object.entries(seeders)) {
        if (name !== 'chainlink') {
          results.push(await seeder());
        }
      }
    } else {
      results.push(await seeders[provider]());
    }

    return results;
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private inferCategory(symbol: string): string {
    return getAssetClass(symbol);
  }
}

export const feedSyncService = new FeedSyncService();
