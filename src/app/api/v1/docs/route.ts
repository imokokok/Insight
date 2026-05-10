import { type NextRequest, NextResponse } from 'next/server';

import { ORACLE_PROVIDER_VALUES } from '@/types/oracle';

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Insight Oracle API',
    version: '1.0.0',
    description:
      'Multi-oracle price aggregation API. Access real-time and historical prices from Chainlink, Pyth, API3, RedStone, DIA, WINkLink, Supra, TWAP, Reflector, and Flare oracles. Get consensus prices, compare sources, and monitor oracle health.',
    contact: {
      name: 'Insight API Support',
      url: 'https://insight.oracle',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current server',
    },
  ],
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/price/{symbol}': {
      get: {
        summary: 'Get aggregated price',
        description:
          'Get the aggregated price for a symbol across all available oracle providers. Returns median price, price range, spread, and per-provider breakdown.',
        tags: ['Price'],
        parameters: [
          {
            name: 'symbol',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'BTC/USD' },
            description: 'Trading pair symbol (e.g., BTC/USD, ETH/USD)',
          },
          {
            name: 'chain',
            in: 'query',
            schema: { type: 'string' },
            description: 'Blockchain network filter',
          },
          {
            name: 'oracle',
            in: 'query',
            schema: { type: 'string', enum: ORACLE_PROVIDER_VALUES },
            description: 'Single oracle provider (returns one source instead of aggregated)',
          },
        ],
        responses: {
          '200': {
            description: 'Price data retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PriceResponse' },
              },
            },
          },
          '404': {
            description: 'No price data available for the symbol',
          },
        },
      },
    },
    '/price/{symbol}/sources': {
      get: {
        summary: 'Get all oracle sources for a symbol',
        description:
          'Get price data from every oracle provider that supports the given symbol, including both available and unavailable sources.',
        tags: ['Price'],
        parameters: [
          {
            name: 'symbol',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'BTC/USD' },
          },
          {
            name: 'chain',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Source data retrieved successfully',
          },
        },
      },
    },
    '/price/{symbol}/history': {
      get: {
        summary: 'Get historical price data',
        description:
          'Get historical price data from a specific oracle provider. Requires the provider parameter.',
        tags: ['Price'],
        parameters: [
          {
            name: 'symbol',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'BTC/USD' },
          },
          {
            name: 'provider',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ORACLE_PROVIDER_VALUES },
            description: 'Oracle provider for historical data',
          },
          {
            name: 'chain',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'period',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 8760, default: 24 },
            description: 'Time period in hours',
          },
        ],
        responses: {
          '200': {
            description: 'Historical price data retrieved successfully',
          },
        },
      },
    },
    '/consensus/{symbol}': {
      get: {
        summary: 'Get consensus price',
        description:
          'Calculate the consensus price across all oracle providers using configurable aggregation methods. Supports 6 consensus algorithms: median, trimmed_mean, weighted_median, confidence_weighted, reliability_weighted, and iqr_filtered.',
        tags: ['Consensus'],
        parameters: [
          {
            name: 'symbol',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'BTC/USD' },
          },
          {
            name: 'method',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'median',
                'trimmed_mean',
                'weighted_median',
                'confidence_weighted',
                'reliability_weighted',
                'iqr_filtered',
              ],
            },
            description: 'Consensus aggregation method (auto-selected if not specified)',
          },
        ],
        responses: {
          '200': {
            description: 'Consensus price calculated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ConsensusResponse' },
              },
            },
          },
        },
      },
    },
    '/oracles/{provider}': {
      get: {
        summary: 'Get price from a specific oracle',
        description: 'Get real-time or historical price data from a specific oracle provider.',
        tags: ['Oracles'],
        parameters: [
          {
            name: 'provider',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ORACLE_PROVIDER_VALUES },
          },
          {
            name: 'symbol',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Trading pair symbol',
          },
          {
            name: 'chain',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'period',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 8760 },
            description: 'If provided, returns historical data instead of current price',
          },
          {
            name: 'forceRefresh',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Force refresh cache',
          },
        ],
        responses: {
          '200': {
            description: 'Oracle price data retrieved successfully',
          },
        },
      },
    },
    '/api-keys': {
      get: {
        summary: 'List your API keys',
        description: 'List all API keys belonging to the authenticated user.',
        tags: ['API Keys'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'API keys listed successfully',
          },
        },
      },
      post: {
        summary: 'Create a new API key',
        description:
          'Create a new API key. The full key is only returned once upon creation. Maximum 5 active keys per user.',
        tags: ['API Keys'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: {
                    type: 'string',
                    maxLength: 100,
                    description: 'A descriptive name for the API key',
                  },
                  plan: {
                    type: 'string',
                    enum: ['free', 'pro', 'enterprise'],
                    default: 'free',
                  },
                  expiresAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'API key created successfully',
          },
          '403': {
            description: 'Maximum API key limit reached',
          },
        },
      },
    },
    '/api-keys/{id}': {
      get: {
        summary: 'Get API key details',
        tags: ['API Keys'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'API key details' },
          '404': { description: 'API key not found' },
        },
      },
      patch: {
        summary: 'Update an API key',
        tags: ['API Keys'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', maxLength: 100 },
                  plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'API key updated' },
          '404': { description: 'API key not found' },
        },
      },
      delete: {
        summary: 'Delete an API key',
        tags: ['API Keys'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'API key deleted' },
          '404': { description: 'API key not found' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key starting with ik_ prefix',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Supabase JWT token for API key management',
      },
    },
    schemas: {
      PriceResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              symbol: { type: 'string', example: 'BTC/USD' },
              chain: { type: 'string', nullable: true },
              aggregatedPrice: { type: 'number', example: 67432.5 },
              priceRange: {
                type: 'object',
                properties: {
                  min: { type: 'number' },
                  max: { type: 'number' },
                  average: { type: 'number' },
                  median: { type: 'number' },
                  spread: { type: 'number' },
                  spreadPercent: { type: 'number' },
                },
              },
              providerCount: { type: 'integer' },
              providers: {
                type: 'array',
                items: { $ref: '#/components/schemas/ProviderPrice' },
              },
            },
          },
          meta: { $ref: '#/components/schemas/Meta' },
        },
      },
      ConsensusResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              consensus: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                  method: { type: 'string' },
                  methodLabel: { type: 'string' },
                  confidence: { type: 'number' },
                  confidenceLevel: { type: 'string' },
                  agreement: { type: 'number' },
                  participantCount: { type: 'integer' },
                  excludedCount: { type: 'integer' },
                  excludedProviders: { type: 'array', items: { type: 'string' } },
                  priceRange: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' },
                      spread: { type: 'number' },
                    },
                  },
                  recommendedMethod: { type: 'string' },
                  methodResults: { type: 'object', additionalProperties: { type: 'object' } },
                },
              },
              sources: {
                type: 'array',
                items: { $ref: '#/components/schemas/ProviderPrice' },
              },
            },
          },
          meta: { $ref: '#/components/schemas/Meta' },
        },
      },
      ProviderPrice: {
        type: 'object',
        properties: {
          provider: { type: 'string', example: 'chainlink' },
          price: { type: 'number', example: 67432.5 },
          timestamp: { type: 'integer' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          confidenceInterval: {
            type: 'object',
            nullable: true,
            properties: {
              bid: { type: 'number' },
              ask: { type: 'number' },
              widthPercentage: { type: 'number' },
            },
          },
          source: { type: 'string', nullable: true },
        },
      },
      Meta: {
        type: 'object',
        properties: {
          timestamp: { type: 'integer' },
          requestId: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INVALID_API_KEY' },
              message: { type: 'string' },
              retryable: { type: 'boolean' },
              details: { type: 'object' },
            },
          },
          meta: { $ref: '#/components/schemas/Meta' },
        },
      },
    },
  },
};

export const GET = async (_request: NextRequest) => {
  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
};
