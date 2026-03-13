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

const clients: Record<OracleProvider, InstanceType<typeof ChainlinkClient>> = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

const PRICE_CACHE_TTL = 30 * 1000;
const HISTORY_STALE_THRESHOLD = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') as OracleProvider | null;
    const symbol = searchParams.get('symbol');
    const chain = searchParams.get('chain') as Blockchain | null;
    const period = searchParams.get('period');

    if (!provider || !symbol) {
      return createErrorResponse({
        code: ErrorCodes.MISSING_PARAMS,
        message: 'Missing required parameters: provider, symbol',
        retryable: false,
        statusCode: 400,
      });
    }

    if (!Object.values(OracleProvider).includes(provider)) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_PROVIDER,
        message: `Invalid provider: ${provider}. Valid providers: ${Object.values(OracleProvider).join(', ')}`,
        retryable: false,
        statusCode: 400,
      });
    }

    const client = clients[provider];
    if (!client) {
      return createErrorResponse({
        code: ErrorCodes.CLIENT_NOT_FOUND,
        message: `Client not found for provider: ${provider}`,
        retryable: false,
        statusCode: 500,
      });
    }

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
          provider,
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
                provider,
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
            provider,
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
          provider,
          symbol,
          operation: 'fetch historical prices',
        });
      }
    }

    try {
      const cachedPrice = await queries.getLatestPrice(provider, symbol, chainValue);

      if (cachedPrice) {
        const cachedTimestamp = new Date(cachedPrice.timestamp).getTime();
        const isFresh = Date.now() - cachedTimestamp < PRICE_CACHE_TTL;

        if (isFresh) {
          return createCachedJsonResponse(
            {
              provider,
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
          provider,
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
        provider,
        symbol,
        operation: 'fetch price',
      });
    }
  } catch (error) {
    console.error('Unexpected error in GET /api/oracles:', error);
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      retryable: true,
      statusCode: 500,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requests } = body;

    if (!Array.isArray(requests)) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Invalid request body. Expected { requests: [...] }',
        retryable: false,
        statusCode: 400,
      });
    }

    const queries = getServerQueries();

    const results = await Promise.allSettled(
      requests.map(
        async (req: { provider: OracleProvider; symbol: string; chain?: Blockchain }) => {
          const { provider, symbol, chain } = req;
          const client = clients[provider];

          if (!client) {
            throw new Error(`Invalid provider: ${provider}`);
          }

          const cachedPrice = await queries.getLatestPrice(provider, symbol, chain);

          if (cachedPrice) {
            const cachedTimestamp = new Date(cachedPrice.timestamp).getTime();
            const isFresh = Date.now() - cachedTimestamp < PRICE_CACHE_TTL;

            if (isFresh) {
              return {
                provider,
                symbol,
                chain,
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
                source: 'cache',
              };
            }
          }

          const priceData = await client.getPrice(symbol, chain);

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

          return { provider, symbol, chain, data: priceData, source: 'fresh' };
        }
      )
    );

    const data = results.map((result, index) => ({
      request: requests[index],
      status: result.status,
      data: result.status === 'fulfilled' ? result.value.data : null,
      source: result.status === 'fulfilled' ? result.value.source : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));

    return createCachedJsonResponse(
      {
        timestamp: Date.now(),
        results: data,
      },
      CacheConfig.PRICE
    );
  } catch (error) {
    console.error('Error processing batch request:', error);
    return createErrorResponse({
      code: ErrorCodes.BATCH_REQUEST_FAILED,
      message: error instanceof Error ? error.message : 'Failed to process batch request',
      retryable: true,
      statusCode: 500,
    });
  }
}
