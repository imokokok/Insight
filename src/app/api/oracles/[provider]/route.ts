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

const clients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

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
            provider: providerKey,
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
          provider: providerKey,
          symbol,
          operation: 'fetch historical prices',
        });
      }
    }

    try {
      const priceData = await client.getPrice(symbol, chainValue);

      return createCachedJsonResponse(
        {
          provider: providerKey,
          symbol,
          chain: chain || null,
          data: priceData,
          timestamp: Date.now(),
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
