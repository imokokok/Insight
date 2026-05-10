import { type NextRequest, NextResponse } from 'next/server';

import {
  calculateConsensusPrice,
  type ConsensusMethod,
  getConsensusMethodLabel,
} from '@/lib/analytics/consensusPrice';
import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { oracleSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('V1ConsensusAPI');

const VALID_CONSENSUS_METHODS: ConsensusMethod[] = [
  'median',
  'trimmed_mean',
  'weighted_median',
  'confidence_weighted',
  'reliability_weighted',
  'iqr_filtered',
];

const providerToSymbolKey: Record<OracleProvider, keyof typeof oracleSupportedSymbols> = {
  [OracleProvider.CHAINLINK]: 'chainlink',
  [OracleProvider.PYTH]: 'pyth',
  [OracleProvider.API3]: 'api3',
  [OracleProvider.REDSTONE]: 'redstone',
  [OracleProvider.DIA]: 'dia',
  [OracleProvider.WINKLINK]: 'winklink',
  [OracleProvider.SUPRA]: 'supra',
  [OracleProvider.TWAP]: 'twap',
  [OracleProvider.REFLECTOR]: 'reflector',
  [OracleProvider.FLARE]: 'flare',
};

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const pathSegments = request.nextUrl.pathname.split('/');
    const symbolSegment = pathSegments[pathSegments.length - 1];
    const symbol = decodeURIComponent(symbolSegment);

    if (!symbol) {
      return NextResponse.json(
        ApiResponseBuilder.error('MISSING_SYMBOL', 'Symbol is required in the URL path'),
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const method = searchParams.get('method') as ConsensusMethod | null;

    if (method && !VALID_CONSENSUS_METHODS.includes(method)) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'INVALID_METHOD',
          `Invalid consensus method. Valid methods: ${VALID_CONSENSUS_METHODS.join(', ')}`,
          {
            details: { validMethods: VALID_CONSENSUS_METHODS },
          }
        ),
        { status: 400 }
      );
    }

    try {
      const factory = getDefaultFactory();
      const baseSymbol = symbol.split('/')[0].toUpperCase();

      const providersToQuery = Object.values(OracleProvider).filter((provider) => {
        const key = providerToSymbolKey[provider];
        const supported = oracleSupportedSymbols[key] as readonly string[];
        return supported.includes(baseSymbol);
      });

      const pricePromises = providersToQuery.map(async (provider) => {
        try {
          const client = factory.getClient(provider);
          const price = await client.getPrice(baseSymbol);
          return price;
        } catch {
          logger.warn(`Failed to fetch price from ${provider} for ${baseSymbol}`);
          return null;
        }
      });

      const results = await Promise.allSettled(pricePromises);
      const priceData: PriceData[] = results
        .filter(
          (r): r is PromiseFulfilledResult<PriceData> =>
            r.status === 'fulfilled' && r.value !== null
        )
        .map((r) => r.value);

      if (priceData.length === 0) {
        return NextResponse.json(
          ApiResponseBuilder.error('NO_DATA', `No price data available for ${symbol}`),
          { status: 404 }
        );
      }

      const inputs = priceData.map((p) => ({
        provider: p.provider,
        price: p.price,
        timestamp: p.timestamp,
        confidence: p.confidence,
        confidenceInterval: p.confidenceInterval,
      }));

      const consensusMethod = method ?? undefined;
      const consensusResult = calculateConsensusPrice(inputs, consensusMethod, symbol);

      return NextResponse.json(
        ApiResponseBuilder.success({
          symbol,
          consensus: {
            price: consensusResult.price,
            method: consensusResult.method,
            methodLabel: getConsensusMethodLabel(consensusResult.method),
            confidence: consensusResult.confidence,
            confidenceLevel: consensusResult.confidenceLevel,
            agreement: consensusResult.agreement,
            participantCount: consensusResult.participantCount,
            excludedCount: consensusResult.excludedCount,
            excludedProviders: consensusResult.excludedProviders,
            priceRange: consensusResult.priceRange,
            recommendedMethod: consensusResult.recommendedMethod,
            methodResults: Object.fromEntries(
              Object.entries(consensusResult.methodResults).map(([key, value]) => [
                key,
                { price: value, label: getConsensusMethodLabel(key as ConsensusMethod) },
              ])
            ),
          },
          sources: priceData.map((p) => ({
            provider: p.provider,
            price: p.price,
            timestamp: p.timestamp,
            confidence: p.confidence,
          })),
        })
      );
    } catch (error) {
      logger.error(
        'Consensus price calculation failed',
        error instanceof Error ? error : new Error(String(error))
      );
      return NextResponse.json(
        ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to calculate consensus price', {
          retryable: true,
        }),
        { status: 500 }
      );
    }
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'api' },
      apiKey: true,
    },
  }
);
