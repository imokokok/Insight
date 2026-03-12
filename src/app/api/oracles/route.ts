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

const clients: Record<OracleProvider, InstanceType<typeof ChainlinkClient>> = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

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

      try {
        const historicalPrices = await client.getHistoricalPrices(symbol, chainValue, periodNum);

        return createCachedJsonResponse(
          {
            provider,
            symbol,
            chain: chain || null,
            period: periodNum,
            data: historicalPrices,
            count: historicalPrices.length,
            timestamp: Date.now(),
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
      const priceData = await client.getPrice(symbol, chainValue);

      return createCachedJsonResponse(
        {
          provider,
          symbol,
          chain: chain || null,
          data: priceData,
          timestamp: Date.now(),
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

    const results = await Promise.allSettled(
      requests.map(
        async (req: { provider: OracleProvider; symbol: string; chain?: Blockchain }) => {
          const { provider, symbol, chain } = req;
          const client = clients[provider];

          if (!client) {
            throw new Error(`Invalid provider: ${provider}`);
          }

          const priceData = await client.getPrice(symbol, chain);
          return { provider, symbol, chain, data: priceData };
        }
      )
    );

    const data = results.map((result, index) => ({
      request: requests[index],
      status: result.status,
      data: result.status === 'fulfilled' ? result.value.data : null,
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
