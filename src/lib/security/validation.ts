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

export const PriceDataSchema = PriceDataBaseSchema.extend({
  provider: SafeProviderSchema,
  chain: SafeChainSchema.optional(),
  decimals: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
  confidenceSource: z.enum(['original', 'estimated', 'calculated']).optional(),
  source: z.string().optional(),
  change: z.number().optional(),
  change24h: z.number().optional(),
  change24hPercent: z.number().optional(),
  dataSource: z.enum(['real', 'mock', 'api', 'fallback']).optional(),
  confidenceInterval: z
    .object({
      bid: z.number(),
      ask: z.number(),
      widthPercentage: z.number(),
    })
    .optional(),
  roundId: z.string().optional(),
  answeredInRound: z.string().optional(),
  version: z.string().optional(),
  startedAt: z.number().optional(),
  priceId: z.string().optional(),
  exponent: z.number().optional(),
  conf: z.number().optional(),
  publishTime: z.number().optional(),
  dapiName: z.string().optional(),
  proxyAddress: z.string().optional(),
  dataAge: z.number().optional(),
  pairIndex: z.number().optional(),
  poolAddress: z.string().optional(),
  feeTier: z.number().optional(),
  sqrtPriceX96: z.string().optional(),
  tick: z.number().optional(),
  twapInterval: z.number().optional(),
  twapPrice: z.number().optional(),
  spotPrice: z.number().optional(),
  liquidity: z.string().optional(),
  resolution: z.number().optional(),
  contractVersion: z.number().optional(),
  ingestionTimestamp: z.number().optional(),
  metadataFallback: z.boolean().optional(),
  failureMode: z.enum(FAILURE_MODE_VALUES as [string, ...string[]]).optional(),
  signalVector: z
    .object({
      freshness: z.number().min(0).max(1),
      sourceReliability: z.number().min(0).max(1),
      metadataCompleteness: z.number().min(0).max(1),
      consistency: z.number().min(0).max(1),
      auditStatus: z.number().min(0).max(1),
    })
    .optional(),
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
    .optional(),
  verification: z
    .object({
      type: z.enum(['on-chain', 'api']).optional(),
      contractAddress: z.string(),
      chainId: z.number(),
      explorerUrl: z.string(),
      method: z.string(),
      blockNumber: z.number().optional(),
    })
    .optional(),
});

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
