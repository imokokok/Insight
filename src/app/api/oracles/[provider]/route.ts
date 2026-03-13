import { NextRequest } from 'next/server';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/lib/types/oracle';
import {
  createErrorResponse,
  createCachedJsonResponse,
  handleApiError,
  ErrorCodes,
  CacheConfig,
} from '@/lib/api/utils';
import { getServerQueries } from '@/lib/supabase/server';

const clients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

const PRICE_CACHE_TTL = 30 * 1000;
const HISTORY_STALE_THRESHOLD = 5 * 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const chain = searchParams.get('chain');
    const period = searchParams.get('period');

    if (!symbol) {
      return createErrorResponse({
        code: ErrorCodes.MISSING_PARAMS,
        message: 'Missing required parameter: symbol',
        retryable: false,
        statusCode: 400,
      });
    }

    const providerKey = provider as OracleProvider;
    if (!Object.values(OracleProvider).includes(providerKey)) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_PROVIDER,
        message: `Invalid provider: ${provider}. Valid providers: ${Object.values(OracleProvider).join(', ')}`,
        retryable: false,
        statusCode: 400,
      });
    }

    const client = clients[providerKey];
    const chainValue = chain ? (chain as Blockchain) : undefined;
    const queries = getServerQueries();

    if (period) {
      const periodNum = parseInt(period, 10);
      if (isNaN(periodNum) || periodNum < 1) {
        return createErrorResponse({
          code: ErrorCodes.INVALID_PARAMS,
          message: 'Invalid period. Must be a positive integer.',
          retryable: false,
          statusCode: 400,
        });
      }

      const endTime = Date.now();
      const startTime = endTime - periodNum * 24 * 60 * 60 * 1000;

      try {
        const cachedHistory = await queries.getPriceRecords({
          provider: providerKey,
          symbol,
          chain: chainValue,
          startTime: Math.floor(startTime / 1000),
          endTime: Math.floor(endTime / 1000),
          limit: periodNum * 24,
        });

        if (cachedHistory && cachedHistory.length > 0) {
          const latestRecord = cachedHistory[0];
          const latestTimestamp = new Date(latestRecord.timestamp).getTime();
          const isStale = Date.now() - latestTimestamp > HISTORY_STALE_THRESHOLD;

          if (!isStale) {
            const historicalPrices = cachedHistory.map(record => ({
              provider: record.provider as OracleProvider,
              symbol: record.symbol,
              chain: record.chain as Blockchain | undefined,
              price: record.price,
              timestamp: new Date(record.timestamp).getTime(),
              decimals: 8,
              confidence: record.confidence || undefined,
              source: record.source || undefined,
            }));

            return createCachedJsonResponse(
              {
                provider: providerKey,
                symbol,
                chain: chain || null,
                period: periodNum,
                data: historicalPrices,
                count: historicalPrices.length,
                timestamp: Date.now(),
                source: 'cache',
              },
              CacheConfig.HISTORY
            );
          }
        }

        const historicalPrices = await client.getHistoricalPrices(symbol, chainValue, periodNum);

        const recordsToSave = historicalPrices.map(price => ({
          provider: price.provider,
          symbol: price.symbol,
          chain: price.chain,
          price: price.price,
          timestamp: Math.floor(price.timestamp / 1000),
          decimals: price.decimals,
          confidence: price.confidence,
          source: price.source,
          ttl: '7d',
        }));

        if (recordsToSave.length > 0) {
          await queries.savePriceRecords(recordsToSave);
        }

        return createCachedJsonResponse(
          {
            provider: providerKey,
            symbol,
            chain: chain || null,
            period: periodNum,
            data: historicalPrices,
            count: historicalPrices.length,
            timestamp: Date.now(),
            source: 'fresh',
          },
          CacheConfig.HISTORY
        );
      } catch (error) {
        return handleApiError(error, {
          provider: providerKey,
          symbol,
          operation: 'fetch historical prices',
        });
      }
    }

    try {
      const cachedPrice = await queries.getLatestPrice(providerKey, symbol, chainValue);

      if (cachedPrice) {
        const cachedTimestamp = new Date(cachedPrice.timestamp).getTime();
        const isFresh = Date.now() - cachedTimestamp < PRICE_CACHE_TTL;

        if (isFresh) {
          return createCachedJsonResponse(
            {
              provider: providerKey,
              symbol,
              chain: chain || null,
              data: {
                provider: cachedPrice.provider as OracleProvider,
                symbol: cachedPrice.symbol,
                chain: cachedPrice.chain as Blockchain | undefined,
                price: cachedPrice.price,
                timestamp: cachedTimestamp,
                decimals: 8,
                confidence: cachedPrice.confidence || undefined,
                source: cachedPrice.source || undefined,
              },
              timestamp: Date.now(),
              source: 'cache',
            },
            CacheConfig.PRICE
          );
        }
      }

      const priceData = await client.getPrice(symbol, chainValue);

      await queries.savePriceRecord({
        provider: priceData.provider,
        symbol: priceData.symbol,
        chain: priceData.chain,
        price: priceData.price,
        timestamp: Math.floor(priceData.timestamp / 1000),
        decimals: priceData.decimals,
        confidence: priceData.confidence,
        source: priceData.source,
        ttl: '1h',
      });

      return createCachedJsonResponse(
        {
          provider: providerKey,
          symbol,
          chain: chain || null,
          data: priceData,
          timestamp: Date.now(),
          source: 'fresh',
        },
        CacheConfig.PRICE
      );
    } catch (error) {
      return handleApiError(error, {
        provider: providerKey,
        symbol,
        operation: 'fetch price',
      });
    }
  } catch (error) {
    console.error('Unexpected error in GET /api/oracles/[provider]:', error);
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      retryable: true,
      statusCode: 500,
    });
  }
}
