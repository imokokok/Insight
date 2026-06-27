import { z, type ZodSchema } from 'zod';

import { createLogger } from '@/lib/utils/logger';
import { ZodValidationError } from '@/lib/validation/errors';
import { ORACLE_PROVIDER_VALUES, BLOCKCHAIN_VALUES } from '@/types/oracle/enums';
import type { OracleProvider } from '@/types/oracle/enums';
import { FAILURE_MODE_VALUES } from '@/types/oracle/signals';

import { sanitizeSymbol, sanitizeProvider, sanitizeChain } from './inputSanitizer';

const validationLogger = createLogger('oracle-validation');

export const SafeSymbolSchema = z
  .string()
  .min(1, 'Symbol is required')
  .max(20, 'Symbol too long')
  .transform((val) => sanitizeSymbol(val))
  .refine((val) => val.length > 0, 'Invalid symbol format');

export const SafeProviderSchema = z
  .string()
  .transform((val) => sanitizeProvider(val))
  .pipe(z.enum(ORACLE_PROVIDER_VALUES as [string, ...string[]]));

export const SafeChainSchema = z
  .string()
  .transform((val) => sanitizeChain(val))
  .pipe(z.enum(BLOCKCHAIN_VALUES as [string, ...string[]]));

const SafePeriodSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
  .refine(
    (val) => !isNaN(val) && val >= 1 && val <= 8760,
    'Period must be between 1 and 8760 hours (1 year)'
  );

const PriceDataBaseSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  price: z.number().positive('Price must be positive'),
  timestamp: z.number().int().positive('Timestamp must be a positive integer'),
});

function nullsToUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return undefined as T;
  if (Array.isArray(obj)) return obj.map((item) => nullsToUndefined(item)) as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = value === null ? undefined : nullsToUndefined(value);
    }
    return result as T;
  }
  return obj;
}

const PriceDataSchemaRaw = PriceDataBaseSchema.extend({
  provider: SafeProviderSchema,
  chain: SafeChainSchema.nullish(),
  decimals: z.number().int().nonnegative().nullish(),
  confidence: z.number().min(0).max(1).nullish(),
  confidenceSource: z.enum(['original', 'estimated', 'calculated']).nullish(),
  source: z.string().nullish(),
  change: z.number().nullish(),
  change24h: z.number().nullish(),
  change24hPercent: z.number().nullish(),
  dataSource: z.enum(['real', 'mock', 'api', 'fallback']).nullish(),
  confidenceInterval: z
    .object({
      bid: z.number(),
      ask: z.number(),
      widthPercentage: z.number(),
    })
    .nullish(),
  roundId: z.string().nullish(),
  answeredInRound: z.string().nullish(),
  version: z.string().nullish(),
  startedAt: z.number().nullish(),
  priceId: z.string().nullish(),
  exponent: z.number().nullish(),
  conf: z.number().nullish(),
  publishTime: z.number().nullish(),
  dapiName: z.string().nullish(),
  proxyAddress: z.string().nullish(),
  dataAge: z.number().nullish(),
  pairIndex: z.number().nullish(),
  poolAddress: z.string().nullish(),
  feeTier: z.number().nullish(),
  sqrtPriceX96: z.string().nullish(),
  tick: z.number().nullish(),
  twapInterval: z.number().nullish(),
  twapPrice: z.number().nullish(),
  spotPrice: z.number().nullish(),
  liquidity: z.string().nullish(),
  resolution: z.number().nullish(),
  contractVersion: z.number().nullish(),
  ingestionTimestamp: z.number().nullish(),
  metadataFallback: z.boolean().nullish(),
  failureMode: z.enum(FAILURE_MODE_VALUES as [string, ...string[]]).nullish(),
  signalVector: z
    .object({
      freshness: z.number().min(0).max(1),
      sourceReliability: z.number().min(0).max(1),
      metadataCompleteness: z.number().min(0).max(1),
      consistency: z.number().min(0).max(1),
      auditStatus: z.number().min(0).max(1),
    })
    .nullish(),
  consensusContext: z
    .object({
      consensusPrice: z.number(),
      agreement: z.number().min(0).max(1),
      participantCount: z.number().int().nonnegative(),
      isOutlier: z.boolean(),
      excludedProviders: z.array(z.string()),
      method: z.string(),
      confidenceLevel: z.string(),
    })
    .nullish(),
  verification: z
    .object({
      type: z.enum(['on-chain', 'api']).nullish(),
      contractAddress: z.string(),
      chainId: z.number(),
      explorerUrl: z.string(),
      method: z.string(),
      blockNumber: z.number().nullish(),
    })
    .nullish(),
});

export const PriceDataSchema = z.preprocess((data) => nullsToUndefined(data), PriceDataSchemaRaw);

export const OracleProviderPathParamSchema = z
  .string()
  .refine(
    (val) => ORACLE_PROVIDER_VALUES.includes(val as OracleProvider),
    `Invalid provider. Valid providers: ${ORACLE_PROVIDER_VALUES.join(', ')}`
  );

export const OracleProviderQuerySchema = z.object({
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
  period: SafePeriodSchema.optional(),
  forceRefresh: z.coerce.boolean().optional(),
});

export function validateOracleData<T>(schema: ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const error = ZodValidationError.fromZodError(result.error);
    const contextMessage = context ? ` in ${context}` : '';
    validationLogger.error(`Oracle data validation failed${contextMessage}`, error, {
      issues: result.error.issues,
    });
    throw error;
  }

  return result.data;
}
