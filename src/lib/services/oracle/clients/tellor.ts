import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { tellorSymbols } from '@/lib/oracles/supportedSymbols';
import { isPriceQuerySupported, getTellorOracleAddress } from '@/lib/oracles/tellorDataSources';
import { tellorOnChainService, type TellorPriceData } from '@/lib/oracles/tellorOnChainService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const logger = createLogger('TellorClient');

const BLOCKCHAIN_TO_CHAIN_ID: Record<Blockchain, number> = {
  [Blockchain.ETHEREUM]: 1,
  [Blockchain.ARBITRUM]: 42161,
  [Blockchain.OPTIMISM]: 10,
  [Blockchain.POLYGON]: 137,
  [Blockchain.AVALANCHE]: 43114,
  [Blockchain.BNB_CHAIN]: 56,
  [Blockchain.BASE]: 8453,
  [Blockchain.SOLANA]: 0,
  [Blockchain.FANTOM]: 250,
  [Blockchain.CRONOS]: 25,
  [Blockchain.JUNO]: 0,
  [Blockchain.COSMOS]: 0,
  [Blockchain.OSMOSIS]: 0,
  [Blockchain.SCROLL]: 534352,
  [Blockchain.ZKSYNC]: 324,
  [Blockchain.APTOS]: 0,
  [Blockchain.SUI]: 0,
  [Blockchain.GNOSIS]: 100,
  [Blockchain.MANTLE]: 5000,
  [Blockchain.LINEA]: 59144,
  [Blockchain.CELESTIA]: 0,
  [Blockchain.INJECTIVE]: 0,
  [Blockchain.SEI]: 0,
  [Blockchain.TRON]: 0,
  [Blockchain.TON]: 0,
  [Blockchain.NEAR]: 0,
  [Blockchain.AURORA]: 1313161554,
  [Blockchain.CELO]: 42220,
  [Blockchain.STARKNET]: 0,
  [Blockchain.BLAST]: 81457,
  [Blockchain.CARDANO]: 0,
  [Blockchain.POLKADOT]: 0,
  [Blockchain.KAVA]: 2222,
  [Blockchain.MOONBEAM]: 1284,
  [Blockchain.MOONRIVER]: 1285,
  [Blockchain.METIS]: 1088,
  [Blockchain.STARKEX]: 0,
};

export class TellorClient extends BaseOracleClient {
  name = OracleProvider.TELLOR;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.AVALANCHE,
  ];

  defaultUpdateIntervalMinutes = 15;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  private getChainId(chain?: Blockchain): number {
    if (!chain) return 1;
    return BLOCKCHAIN_TO_CHAIN_ID[chain] || 1;
  }

  private convertToPriceData(tellorData: TellorPriceData, chain?: Blockchain): PriceData {
    return {
      provider: this.name,
      chain: chain || Blockchain.ETHEREUM,
      symbol: tellorData.symbol,
      price: tellorData.price,
      timestamp: tellorData.timestamp,
      decimals: tellorData.decimals,
      confidence: 0.92,
      change24h: 0,
      change24hPercent: 0,
      source: 'tellor-on-chain',
    };
  }

  /**
   * 获取代币价格
   * 从 Tellor 预言机合约获取真实链上数据
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();
    const chainId = this.getChainId(chain);

    if (!this.isPriceQuerySupported(upperSymbol, chain)) {
      throw this.createError(
        `Symbol '${upperSymbol}' is not supported on chain ${chainId} by Tellor`,
        'SYMBOL_NOT_SUPPORTED'
      );
    }

    try {
      const realData = await tellorOnChainService.getPrice(upperSymbol, chainId);
      logger.info(`Fetched Tellor price for ${upperSymbol}`, {
        symbol: upperSymbol,
        chainId,
        price: realData.price,
      });
      return this.convertToPriceData(realData, chain);
    } catch (error) {
      logger.error(
        `Failed to fetch Tellor price for ${upperSymbol}`,
        error instanceof Error ? error : new Error(String(error)),
        { symbol: upperSymbol, chainId }
      );
      throw this.createError(
        `Failed to fetch price for ${upperSymbol} from Tellor: ${error instanceof Error ? error.message : String(error)}`,
        'TELLOR_ERROR'
      );
    }
  }

  /**
   * 获取历史价格数据
   * 从 Tellor 预言机合约获取历史链上数据
   */
  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    const upperSymbol = symbol.toUpperCase();
    const chainId = this.getChainId(chain);

    if (!this.isPriceQuerySupported(upperSymbol, chain)) {
      throw this.createError(
        `Symbol '${upperSymbol}' is not supported on chain ${chainId} by Tellor`,
        'SYMBOL_NOT_SUPPORTED'
      );
    }

    try {
      const count = Math.min(Math.ceil(period / 2), 50);
      const historicalData = await tellorOnChainService.getHistoricalValues(
        upperSymbol,
        chainId,
        count
      );

      if (historicalData.length === 0) {
        logger.warn(`No historical data available for ${upperSymbol} on chain ${chainId}`);
        return [];
      }

      logger.info(`Fetched Tellor historical prices for ${upperSymbol}`, {
        symbol: upperSymbol,
        count: historicalData.length,
      });

      return historicalData.map((data) => this.convertToPriceData(data, chain));
    } catch (error) {
      logger.error(
        `Failed to fetch Tellor historical prices for ${upperSymbol}`,
        error instanceof Error ? error : new Error(String(error)),
        { symbol: upperSymbol, chainId }
      );
      throw this.createError(
        `Failed to fetch historical prices for ${upperSymbol} from Tellor: ${error instanceof Error ? error.message : String(error)}`,
        'TELLOR_HISTORICAL_ERROR'
      );
    }
  }

  private isPriceQuerySupported(symbol: string, chain?: Blockchain): boolean {
    if (!isPriceQuerySupported(symbol)) {
      return false;
    }
    const chainId = this.getChainId(chain);
    return getTellorOracleAddress(chainId) !== null;
  }

  getSupportedSymbols(): string[] {
    return [...tellorSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = tellorSymbols.includes(
      symbol.toUpperCase() as (typeof tellorSymbols)[number]
    );
    if (!isSymbolInList) {
      return false;
    }
    if (chain !== undefined) {
      return this.supportedChains.includes(chain);
    }
    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    if (!this.isSymbolSupported(symbol)) {
      return [];
    }
    return this.supportedChains;
  }
}
