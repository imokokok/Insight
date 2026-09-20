import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import { SWITCHBOARD_AVAILABLE_PAIRS } from '@/lib/oracles/constants/supportedSymbols';
import {
  SWITCHBOARD_CROSSBAR_URL,
  switchboardSymbols,
  getSwitchboardFeedIdAsync,
} from '@/lib/oracles/constants/switchboardConstants';
import { getSwitchboardDataService } from '@/lib/oracles/services/switchboardDataService';
import { isSymbolActiveInCacheSync } from '@/lib/oracles/utils/dynamicFeedResolver';
import { buildApiVerification } from '@/lib/oracles/utils/verificationUtils';
import { OracleProvider, Blockchain, type PriceData } from '@/types/oracle';

/**
 * Switchboard oracle client.
 *
 * Signed BTC/ETH Surge Plug updates are written to the database by the
 * persistent stream worker. When no fresh signed row exists, this client can
 * fetch a free Crossbar simulation result; that fallback is explicitly
 * unsigned and excluded from oracle quorum.
 */
export class SwitchboardClient extends BaseOracleClient {
  name = OracleProvider.SWITCHBOARD;

  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.SOLANA,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
    Blockchain.APTOS,
    Blockchain.SUI,
    Blockchain.MANTLE,
    Blockchain.LINEA,
    Blockchain.FLARE,
    Blockchain.SUPRA_CHAIN,
  ];

  supportedSymbolsList = switchboardSymbols;

  private cache = new OracleCache();

  constructor() {
    super();
    this.cache.startCleanupInterval();
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);

    const upperSymbol = symbol.toUpperCase();
    const feedId = await getSwitchboardFeedIdAsync(upperSymbol);

    if (!feedId) {
      throw this.createError(
        `Symbol '${upperSymbol}' is not supported by Switchboard`,
        'SYMBOL_NOT_SUPPORTED'
      );
    }

    try {
      const service = getSwitchboardDataService();
      const latest = await service.fetchLatestPrice(upperSymbol, options?.signal);

      if (!latest || !isFinite(latest.price) || latest.price <= 0) {
        throw this.createError(
          `No price data available for ${upperSymbol} from Switchboard Crossbar`,
          'NO_DATA_AVAILABLE'
        );
      }

      // Central schema validation: Switchboard's Crossbar response is untrusted;
      // reject NaN/negative prices or bad timestamps before caching.
      return this.validatePriceData(
        {
          provider: OracleProvider.SWITCHBOARD,
          symbol: upperSymbol,
          price: latest.price,
          timestamp: latest.timestamp,
          decimals: latest.decimals,
          confidence: 0.5,
          chain: chain || Blockchain.ETHEREUM,
          source: 'switchboard-simulation',
          feedId: latest.feedId,
          numOracles: latest.numOracles,
          verificationLevel: 'unsigned',
          countsTowardOracleQuorum: false,
          ingestionTimestamp: Date.now(),
          verification: buildApiVerification(
            `${SWITCHBOARD_CROSSBAR_URL}/v2/simulate/${latest.feedId}`,
            'simulateV2Feed',
            'Switchboard Crossbar simulation (unsigned)'
          ),
        },
        'getPrice'
      );
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      this.handleGetPriceError(error, 'Switchboard', 'SWITCHBOARD_ERROR');
    }
  }

  async getHistoricalPrices(
    _symbol: string,
    _chain?: Blockchain,
    _period: number = 24,
    _options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    // The outer databaseOperations layer already queried Insight's stored
    // history before calling this provider method. Crossbar exposes latest-only,
    // so returning [] is the terminal fallback; calling the shared DB helper
    // again would recurse indefinitely when the database has no rows.
    return [];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const upperSymbol = symbol.toUpperCase();
    const isDynamicallyActive = isSymbolActiveInCacheSync('switchboard', upperSymbol);
    const isSymbolInList = switchboardSymbols.includes(
      upperSymbol as (typeof switchboardSymbols)[number]
    );
    if (!isSymbolInList && !isDynamicallyActive) {
      return false;
    }
    if (chain !== undefined) {
      if (!this.supportedChains.includes(chain)) return false;
      // Discovery can add project symbols without requiring a redeploy of the
      // curated static list. Switchboard feeds are chain-agnostic.
      if (isDynamicallyActive) return true;
      const chainKey = chain.toLowerCase();
      const chainSymbols = SWITCHBOARD_AVAILABLE_PAIRS[chainKey];
      return chainSymbols ? chainSymbols.includes(upperSymbol) : false;
    }
    return true;
  }

  clearCache(): void {
    this.cache.stopCleanupInterval();
    this.cache.clear();
    this.cache.startCleanupInterval();
  }

  override destroy(): void {
    this.cache.destroy();
  }
}
