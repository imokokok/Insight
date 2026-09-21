import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import {
  BAND_CACHE_TTL_MS,
  BAND_MAX_FUTURE_SKEW_SECONDS,
  BAND_PRICE_DECIMALS,
  BAND_REQUEST_TIMEOUT_MS,
  BAND_V3_API_BASE_URL,
  bandSymbols,
  getBandSignalId,
} from '@/lib/oracles/constants/bandConstants';
import {
  isSymbolActiveInCacheSync,
  resolveFeedAddress,
} from '@/lib/oracles/utils/dynamicFeedResolver';
import { buildApiVerification } from '@/lib/oracles/utils/verificationUtils';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

interface BandPriceResponse {
  price?: {
    status?: string;
    signal_id?: string;
    price?: string;
    timestamp?: string;
  };
}

interface BandClientOptions {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export class BandClient extends BaseOracleClient {
  name = OracleProvider.BAND;
  supportedChains = [Blockchain.BANDCHAIN];
  supportedSymbolsList = bandSymbols;
  protected defaultChain = Blockchain.BANDCHAIN;

  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly cache = new OracleCache();

  constructor(options: BandClientOptions = {}) {
    super();
    this.apiBaseUrl = (options.apiBaseUrl ?? BAND_V3_API_BASE_URL).replace(/\/$/, '');
    // Resolve the runtime fetch lazily so constructing the factory remains safe
    // in test/browser-like environments that do not install global fetch.
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
    this.now = options.now ?? Date.now;
    this.cache.startCleanupInterval();
  }

  private validateFreshness(timestampSeconds: number, signalId: string): number {
    const nowSeconds = Math.floor(this.now() / 1000);
    if (!Number.isSafeInteger(timestampSeconds) || timestampSeconds <= 0) {
      throw this.createError(
        `Band returned an invalid timestamp for ${signalId}`,
        'INVALID_RESPONSE'
      );
    }
    if (timestampSeconds > nowSeconds + BAND_MAX_FUTURE_SKEW_SECONDS) {
      throw this.createError(
        `Band returned a future timestamp for ${signalId}`,
        'INVALID_RESPONSE'
      );
    }
    const ageSeconds = Math.max(0, nowSeconds - timestampSeconds);
    return ageSeconds;
  }

  private parseResponse(payload: unknown, symbol: string, signalId: string): PriceData {
    if (!payload || typeof payload !== 'object') {
      throw this.createError(
        `Band returned an invalid response for ${signalId}`,
        'INVALID_RESPONSE'
      );
    }
    const reading = (payload as BandPriceResponse).price;
    if (reading?.status !== 'PRICE_STATUS_AVAILABLE') {
      throw this.createNoDataError(
        symbol,
        Blockchain.BANDCHAIN,
        `Band status is ${reading?.status ?? 'missing'}`
      );
    }
    if (
      reading.signal_id !== signalId ||
      !/^\d+$/.test(reading.price ?? '') ||
      !/^\d+$/.test(reading.timestamp ?? '')
    ) {
      throw this.createError(`Band returned malformed data for ${signalId}`, 'INVALID_RESPONSE');
    }

    const rawPrice = reading.price!;
    const timestampSeconds = Number(reading.timestamp);
    const ageSeconds = this.validateFreshness(timestampSeconds, signalId);
    const price = Number(rawPrice) / 10 ** BAND_PRICE_DECIMALS;
    if (!Number.isFinite(price) || price <= 0) {
      throw this.createError(`Band returned an invalid price for ${signalId}`, 'INVALID_PRICE');
    }

    return this.validatePriceData(
      {
        provider: this.name,
        chain: Blockchain.BANDCHAIN,
        symbol,
        price,
        timestamp: timestampSeconds * 1000,
        decimals: BAND_PRICE_DECIMALS,
        dataAge: ageSeconds,
        feedId: signalId,
        source: 'bandchain-v3-concurrent-price-stream',
        dataSource: 'api',
        ingestionTimestamp: this.now(),
        verificationLevel: 'unsigned',
        verification: {
          ...buildApiVerification(
            `${this.apiBaseUrl}/feeds/v1beta1/prices/${encodeURIComponent(signalId)}`,
            'feeds.v1beta1.Prices',
            'BandChain v3 REST'
          ),
          rawValue: rawPrice,
          sourceTimestamp: timestampSeconds,
        },
      },
      'BandClient.getPrice'
    );
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);
    const normalized = symbol.trim().toUpperCase().split('/')[0];
    const staticSignalId = getBandSignalId(normalized);
    const signalId =
      staticSignalId ??
      (isSymbolActiveInCacheSync('band', normalized)
        ? await resolveFeedAddress('band', `${normalized}/USD`, 0)
        : null);
    if (!signalId) throw this.createUnsupportedSymbolError(normalized, chain);

    const cacheKey = `price:${signalId}`;
    const cached = this.cache.get<PriceData>(cacheKey);
    if (cached) {
      this.validateFreshness(Math.floor(cached.timestamp / 1000), signalId);
      return cached;
    }

    try {
      const timeoutSignal = AbortSignal.timeout(BAND_REQUEST_TIMEOUT_MS);
      const signal = options?.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;
      const response = await this.fetchImpl(
        `${this.apiBaseUrl}/feeds/v1beta1/prices/${encodeURIComponent(signalId)}`,
        { headers: { Accept: 'application/json' }, signal }
      );
      if (!response.ok) {
        const code = response.status === 429 ? 'RATE_LIMIT_ERROR' : 'PROVIDER_UNAVAILABLE';
        throw this.createError(`Band API returned HTTP ${response.status}`, code, {
          retryable: response.status === 429 || response.status >= 500,
          details: { status: response.status, signalId },
        });
      }
      const result = this.parseResponse(await response.json(), normalized, signalId);
      this.cache.set(cacheKey, result, BAND_CACHE_TTL_MS);
      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw this.createError(`Band request timed out for ${signalId}`, 'TIMEOUT_ERROR', {
          retryable: true,
        });
      }
      this.handleGetPriceError(error, 'BandChain v3', 'BAND_ERROR');
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  override isSymbolSupported(symbol: string, _chain?: Blockchain): boolean {
    if (isSymbolActiveInCacheSync('band', symbol)) return true;
    // Band's public v3 stream is globally readable. `chain` is the consumer's
    // requested comparison scope, not the evidence chain; returned PriceData
    // always remains explicitly bound to BandChain.
    return super.isSymbolSupported(symbol);
  }

  override destroy(): void {
    this.cache.destroy();
  }
}
