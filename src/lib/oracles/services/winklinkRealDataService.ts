import { TRON_CONFIG } from '@/lib/config/serverEnv';
import { stringToPrice } from '@/lib/oracles/utils/oracleDataUtils';
import { buildTronVerification } from '@/lib/oracles/utils/verificationUtils';
import { createLogger, normalizeError } from '@/lib/utils/logger';
import {
  OracleProvider,
  Blockchain,
  type WINkLinkTokenOnChainData,
  type PriceData,
} from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

import { OracleCache, createSingleton } from '../base';
import { resolveFeedAddress } from '../utils/dynamicFeedResolver';
import { withOracleRetry } from '../utils/retry';

const logger = createLogger('WINkLinkRealDataService');

function decodeHex(hex: string): string {
  try {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return hex;
  }
}

const TRON_RPC_ENDPOINTS = [TRON_CONFIG.rpcUrl, 'https://api.trongrid.io'].filter(
  (url, index, self) => url && self.indexOf(url) === index
);

const TRONGRID_API_KEY = TRON_CONFIG.apiKey;

// WINkLink price feed addresses on TRON network
// NOTE: TRON DAO announced migration to Chainlink in October 2024
// Source: https://crypto.news/tron-blockchain-is-switching-oracles-from-winklink-to-chainlink/
// These feeds are still active and used as hardcoded fallback when database is unavailable

const WINKLINK_PRICE_FEEDS: Record<string, string> = {
  // Major Cryptocurrencies
  'BTC-USD': 'TQoijQ1iZKRgJsAAWNPMu6amgtCJ3WMUV7',
  'ETH-USD': 'TR2yWYWovJaSM7TfZq7L7sT7ZRugdJJQmL',
  'TRX-USD': 'TR5HtpPK4gX4RFC4DCBUHfFgsGkGFEzSAb',
  'LTC-USD': 'TGxGL85kN3W5sGdBiobgWabWFcMEtoqRJJ',
  'WBTC-USD': 'TCYS6aj9shB6rZNpTCqSkN1aTwkSnz1wHq',

  // Stablecoins
  'USDT-USD': 'TKePc46n5CiUCR8LL788TFeKA4kjvNnuem',
  'USDC-USD': 'TNu3zS55MP4KnBBP6Maw1nHSzRpc3CXAxm',
  'USDD-USD': 'TJ7jEgoYVaeymVfYZ3bS57dYArwVDS1mhW', // TRON's native stablecoin
  'TUSD-USD': 'TBc3yBP8xcyQ1E3hDTUhRxToMrgekLH2kh',
  'USDJ-USD': 'TB1MyT7pDCNg8w7cSW1QvYKs4WPzErzP5k', // JUST stablecoin

  // TRON Ecosystem Tokens
  'WIN-USD': 'TSCef3LT3jpLwwXCWhZe3hZoMsYk1ZLif2', // WINkLink token
  'BTT-USD': 'TBAAW545oJ6iTxqzezGvagrSUzCpz1S8eR', // BitTorrent
  'JST-USD': 'TE5rKoDzKmpVAQp1sn7x6V8biivR3d5r47', // JUST
  'SUN-USD': 'TRMgzSPsuWEcVpd5hv19XtLeCk8Z799sZa', // SUN
  'NFT-USD': 'TEC8b2oL6sAQFMiea73tTgjtTLwyV1GuZU', // APENFT
};

/**
 * Resolve WINkLink feed address dynamically from database,
 * with hardcoded fallback when database is unavailable.
 */
async function getWinklinkFeedAddressAsync(symbol: string): Promise<string | null> {
  try {
    const dynamicAddress = await resolveFeedAddress('winklink', symbol, 0);
    if (dynamicAddress) {
      return dynamicAddress;
    }
  } catch {
    // Database lookup failed, fallback to hardcoded
  }
  const pair = `${symbol.toUpperCase()}-USD`;
  return WINKLINK_PRICE_FEEDS[pair] || null;
}

export type { WINkLinkTokenOnChainData };

class WINkLinkRealDataService {
  private cache = new OracleCache();
  private readonly defaultCacheTTL = 5 * 60 * 1000;

  constructor() {
    logger.info('WINkLinkRealDataService initialized', { rpcUrl: TRON_RPC_ENDPOINTS[0] });
  }

  destroy(): void {
    this.cache.destroy();
    logger.info('WINkLinkRealDataService destroyed');
  }

  private parseHexToBigInt(hex: string | null | undefined): bigint | null {
    if (!hex || typeof hex !== 'string') return null;

    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
      logger.warn('Invalid hex string', { hex });
      return null;
    }

    try {
      return BigInt('0x' + cleanHex);
    } catch {
      return null;
    }
  }

  async getPriceFromContract(
    symbol: string,
    chain?: string,
    signal?: AbortSignal
  ): Promise<PriceData | null> {
    const cacheKey = `real-price:${symbol}${chain ? `:${chain}` : ''}`;
    const cached = this.cache.get<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    if (signal?.aborted) {
      return null;
    }

    try {
      const contractAddress = await getWinklinkFeedAddressAsync(symbol);

      if (!contractAddress) {
        logger.warn('No WINkLink price feed found for symbol', {
          symbol,
          availablePairs: Object.keys(WINKLINK_PRICE_FEEDS),
        });
        return null;
      }

      logger.info('Fetching price from WINkLink contract', { symbol, contractAddress });

      const [decimalsResult, answerResult, timestampResult] = await Promise.allSettled([
        this.callContractMethodWithRetry(contractAddress, 'decimals', 3, signal),
        this.callContractMethodWithRetry(contractAddress, 'latestAnswer', 3, signal),
        this.callContractMethodWithRetry(contractAddress, 'latestTimestamp', 3, signal),
      ]);

      const decimals = decimalsResult.status === 'fulfilled' ? decimalsResult.value : null;
      const latestAnswer = answerResult.status === 'fulfilled' ? answerResult.value : null;
      const latestTimestamp = timestampResult.status === 'fulfilled' ? timestampResult.value : null;

      logger.info('Raw contract data', { symbol, latestAnswer, decimals, latestTimestamp });

      if (!latestAnswer || !decimals) {
        logger.warn('Invalid price data from WINkLink contract', {
          symbol,
          latestAnswer,
          decimals,
        });
        return null;
      }

      const decimalPlaces = this.parseHexToBigInt(decimals);
      const priceRaw = this.parseHexToBigInt(latestAnswer);
      const timestampRaw = this.parseHexToBigInt(latestTimestamp);

      if (!decimalPlaces || !priceRaw) {
        logger.warn('Failed to parse price data', { symbol, decimals, latestAnswer });
        return null;
      }

      const decPlaces = Number(decimalPlaces);
      const rawStr = priceRaw.toString();
      const priceValue = stringToPrice(rawStr, decPlaces);

      const timestamp = timestampRaw ? Number(timestampRaw) * 1000 : Date.now();
      const timestampIsEstimated = !timestampRaw;

      logger.info('Parsed price data', {
        symbol,
        priceValue,
        decimalPlaces: Number(decimalPlaces),
        timestamp,
        timestampIsEstimated,
      });

      if (priceValue <= 0) {
        logger.warn('Invalid price value from WINkLink contract', {
          symbol,
          priceValue,
          decimalPlaces: decPlaces,
        });
        return null;
      }

      const confidence = timestampIsEstimated ? 0.45 : 0.98;

      const priceData: PriceData = {
        provider: OracleProvider.WINKLINK,
        symbol: symbol.toUpperCase(),
        price: priceValue,
        timestamp: timestamp || Date.now(),
        decimals: Number(decimalPlaces),
        confidence,
        confidenceSource: timestampIsEstimated ? 'estimated' : undefined,
        change24h: 0,
        change24hPercent: 0,
        chain: Blockchain.TRON,
        source: `WINkLink:${contractAddress}`,
        ingestionTimestamp: Date.now(),
        metadataFallback: timestampIsEstimated || undefined,
        failureMode: timestampIsEstimated ? FailureMode.FALLBACK_METADATA : FailureMode.NONE,
        signalVector: buildSignalVector({
          dataAgeSeconds: timestamp ? Math.floor((Date.now() - timestamp) / 1000) : 999,
          isOnChain: true,
          hasVerification: true,
          providerUptime: 95,
          hasConfidence: true,
          hasTimestamp: !!timestamp,
          hasDecimals: true,
          hasSource: true,
          verificationMethod: 'latestAnswer',
        }),
        verification: buildTronVerification(contractAddress, 'latestAnswer'),
      };

      this.setCache(cacheKey, priceData, 30000);
      logger.info('Successfully fetched price from WINkLink', { symbol, price: priceValue });
      return priceData;
    } catch (error) {
      logger.error('Failed to get price from WINkLink contract', normalizeError(error), { symbol });
      return null;
    }
  }

  async getHistoricalPrices(
    _symbol: string,
    _periodHours: number = 24
  ): Promise<Array<{ price: number; timestamp: number }>> {
    return [];
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { signal?: AbortSignal },
    timeoutMs: number = 15000
  ): Promise<Response> {
    const externalSignal = options.signal;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onAbort = externalSignal ? () => controller.abort() : null;
    if (onAbort && externalSignal) {
      externalSignal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      const { signal: _externalSignal, ...fetchOptions } = options;
      return await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      if (onAbort && externalSignal) {
        externalSignal.removeEventListener('abort', onAbort);
      }
    }
  }

  private async callContractMethodWithRetry(
    contractAddress: string,
    method: string,
    maxRetries: number = 3,
    signal?: AbortSignal
  ): Promise<string | null> {
    try {
      return await withOracleRetry(
        async () => {
          if (signal?.aborted) {
            throw new Error(`Request aborted for method ${method}`);
          }
          const result = await this.callContractMethod(contractAddress, method, signal);
          if (result === null) {
            throw new Error(`Contract method ${method} returned null`);
          }
          return result;
        },
        `callContractMethod:${method}`,
        {
          maxAttempts: maxRetries,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          timeout: 15000,
        },
        signal
      );
    } catch {
      return null;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (TRONGRID_API_KEY) {
      headers['TRON-PRO-API-KEY'] = TRONGRID_API_KEY;
    }

    return headers;
  }

  private async callContractMethod(
    contractAddress: string,
    method: string,
    signal?: AbortSignal
  ): Promise<string | null> {
    let lastError: Error | null = null;

    for (const rpcUrl of TRON_RPC_ENDPOINTS) {
      if (signal?.aborted) {
        return null;
      }

      try {
        const functionSelector = this.getFunctionSelector(method);

        if (!functionSelector) {
          logger.warn(`Unknown method: ${method}`);
          return null;
        }

        const url = `${rpcUrl}/wallet/triggerconstantcontract`;
        const body = {
          owner_address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
          contract_address: contractAddress,
          function_selector: functionSelector,
          parameter: '',
          visible: true,
        };

        logger.debug(`Calling TRON contract`, { url, contractAddress, method, functionSelector });

        const response = await this.fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
            signal,
          },
          7000
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          lastError = new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
          logger.warn(`TRON RPC ${rpcUrl} failed`, { method, status: response.status });
          continue;
        }

        const data = await response.json();
        logger.debug(`TRON contract response`, { method, data });

        if (data.result && data.result.result === true) {
          const hexValue = data.constant_result?.[0];
          if (hexValue && hexValue !== '0x') {
            return hexValue;
          }
        }

        if (data.result && data.result.message) {
          const errorMessage = decodeHex(data.result.message);
          logger.warn(`TRON contract call failed`, { method, error: errorMessage, rpcUrl });
        }

        lastError = new Error(`Contract call returned no result for ${method}`);
      } catch (error) {
        lastError = normalizeError(error);

        if (signal?.aborted) {
          return null;
        }

        logger.warn(`TRON RPC ${rpcUrl} failed for method ${method}`, {
          error: lastError.message,
        });
      }
    }

    if (lastError) {
      logger.error(`All TRON RPC endpoints failed for method ${method}`, lastError, {
        contractAddress,
      });
    }
    return null;
  }

  private getFunctionSelector(method: string): string {
    const selectors: Record<string, string> = {
      latestAnswer: 'latestAnswer()',
      latestTimestamp: 'latestTimestamp()',
      latestRound: 'latestRound()',
      decimals: 'decimals()',
      description: 'description()',
    };
    return selectors[method] || `${method}()`;
  }

  async getTokenOnChainData(symbol: string): Promise<WINkLinkTokenOnChainData | null> {
    const cacheKey = `onchain-data:${symbol.toUpperCase()}`;
    const cached = this.cache.get<WINkLinkTokenOnChainData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startTime = Date.now();
      const priceData = await this.getPriceFromContract(symbol);
      const responseTime = Date.now() - startTime;

      if (!priceData) {
        logger.warn('No price data available for token', { symbol });
        return null;
      }

      const feedContractAddress = await getWinklinkFeedAddressAsync(symbol);

      const now = Date.now();
      const refTime = priceData.ingestionTimestamp ?? priceData.timestamp;
      const priceAge = refTime ? Math.round((now - refTime) / 1000) : null;

      let nodeUptime: number;
      if (priceAge === null) {
        nodeUptime = 99.0;
      } else if (priceAge <= 60) {
        nodeUptime = 99.9;
      } else if (priceAge <= 120) {
        nodeUptime = 99.5;
      } else if (priceAge <= 300) {
        nodeUptime = 99.0;
      } else {
        nodeUptime = 98.0;
      }

      const onChainData: WINkLinkTokenOnChainData = {
        symbol: symbol.toUpperCase(),
        price: priceData.price,
        feedContractAddress,
        decimals: priceData.decimals || null,
        dataFeedsCount: Object.keys(WINKLINK_PRICE_FEEDS).length,
        activeNodes: null,
        nodeUptime,
        avgResponseTime: responseTime,
        lastUpdated: priceData.timestamp,
        priceUpdateTime: priceAge,
        dataSource: priceData.source || 'WINkLink',
      };

      this.setCache(cacheKey, onChainData, 60000);
      logger.info('Successfully fetched WINkLink token on-chain data', {
        symbol,
        price: onChainData.price,
        feedContractAddress: onChainData.feedContractAddress,
        responseTime,
        priceAge,
        nodeUptime,
      });

      return onChainData;
    } catch (error) {
      logger.error('Failed to get WINkLink token on-chain data', normalizeError(error), { symbol });
      return null;
    }
  }

  private setCache<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, data, ttl || this.defaultCacheTTL);
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }
}

export const getWINkLinkRealDataService = createSingleton(() => new WINkLinkRealDataService());
