import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { SWITCHBOARD_AVAILABLE_PAIRS } from '@/lib/oracles/constants/supportedSymbols';
import {
  SWITCHBOARD_CROSSBAR_URL,
  switchboardSymbols,
  getSwitchboardFeedIdAsync,
} from '@/lib/oracles/constants/switchboardConstants';
import { getSwitchboardDataService } from '@/lib/oracles/services/switchboardDataService';
import { buildApiVerification } from '@/lib/oracles/utils/verificationUtils';
import { OracleProvider, Blockchain, type PriceData } from '@/types/oracle';

/**
 * Switchboard oracle client.
 *
 * Pulls signed Surge price updates from the public Crossbar gateway (free,
 * unauthenticated, no SWTCH required). Surge feeds are chain-agnostic — the
 * consensus value is produced by the Solana oracle network and served via
 * Crossbar regardless of the querying chain — so every project chain is
 * supported for off-chain reads and feeds are stored with chain_id=0.
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

  defaultUpdateIntervalMinutes = 1;

  private cache = new OracleCache();

  constructor(config?: OracleClientConfig) {
    super(config);
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

      return {
        provider: OracleProvider.SWITCHBOARD,
        symbol: upperSymbol,
        price: latest.price,
        timestamp: latest.timestamp,
        decimals: latest.decimals,
        confidence: 0.95,
        chain: chain || Blockchain.ETHEREUM,
        source: 'switchboard-crossbar',
        feedId: latest.feedId,
        numOracles: latest.numOracles,
        ingestionTimestamp: Date.now(),
        verification: buildApiVerification(
          `${SWITCHBOARD_CROSSBAR_URL}/v2/update/${feedId}`,
          'fetchV2Update',
          'Switchboard Crossbar'
        ),
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      this.handleGetPriceError(error, 'Switchboard', 'SWITCHBOARD_ERROR');
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24,
    _options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    // Crossbar's public gateway exposes only the latest signed update; historical
    // series are sourced from Insight's own hourly_price_snapshots table.
    return this.fetchHistoricalPricesWithDatabase(symbol, chain, period);
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const upperSymbol = symbol.toUpperCase();
    const isSymbolInList = switchboardSymbols.includes(
      upperSymbol as (typeof switchboardSymbols)[number]
    );
    if (!isSymbolInList) {
      return false;
    }
    if (chain !== undefined) {
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
