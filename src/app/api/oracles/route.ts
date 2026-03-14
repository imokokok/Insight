import { NextRequest } from 'next/server';
import { OracleProvider, Blockchain } from '@/types/oracle';
import {
  validateRequiredParams,
  validateProvider,
  validatePeriod,
  handleGetPrice,
  handleGetHistoricalPrices,
  handleBatchPrices,
  BatchPriceRequest,
} from '@/lib/api/oracleHandlers';
import { createApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const symbol = searchParams.get('symbol');
    const chain = searchParams.get('chain') as Blockchain | null;
    const period = searchParams.get('period');

    const validationError = validateRequiredParams({
      provider: provider as OracleProvider,
      symbol: symbol ?? undefined,
    });
    if (validationError) return validationError;

    const providerError = validateProvider(provider!);
    if (providerError) return providerError;

    const periodResult = validatePeriod(period);
    if (!periodResult.valid) return periodResult.error!;

    const chainValue = chain ? (chain as Blockchain) : undefined;

    if (periodResult.value) {
      return handleGetHistoricalPrices({
        provider: provider as OracleProvider,
        symbol: symbol!,
        chain: chainValue,
        period: periodResult.value,
      });
    }

    return handleGetPrice({
      provider: provider as OracleProvider,
      symbol: symbol!,
      chain: chainValue,
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
    },
  }
);

export const POST = createApiHandler(
  async (request: NextRequest) => {
    const body = await request.json();
    const { requests } = body;

    if (!Array.isArray(requests)) {
      throw new ValidationError('Invalid request body. Expected { requests: [...] }', {
        field: 'requests',
        expected: 'array',
      });
    }

    return handleBatchPrices(requests as BatchPriceRequest[]);
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'strict' },
    },
  }
);
