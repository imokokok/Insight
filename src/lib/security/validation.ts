import { z } from 'zod';

import { ORACLE_PROVIDER_VALUES } from '@/types/oracle/enums';
import type { OracleProvider } from '@/types/oracle/enums';

import { sanitizeString, sanitizeSymbol, sanitizeProvider, sanitizeChain } from './inputSanitizer';

const SafeSymbolSchema = z
  .string()
  .min(1, 'Symbol is required')
  .max(20, 'Symbol too long')
  .transform((val) => sanitizeSymbol(val))
  .refine((val) => val.length > 0, 'Invalid symbol format');

const SafeProviderSchema = z
  .string()
  .transform((val) => sanitizeProvider(val))
  .refine((val) => val.length > 0, 'Invalid provider');

const SafeChainSchema = z
  .string()
  .transform((val) => sanitizeChain(val))
  .refine((val) => val.length > 0, 'Invalid chain');

const SafeNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .transform((val) => sanitizeString(val, { maxLength: 100 }));

const SafeUuidSchema = z
  .string()
  .uuid()
  .transform((val) => val.toLowerCase());

const SafeEmailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .transform((val) => val.toLowerCase().trim());

const SafeUrlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')
  .refine((val) => {
    try {
      const url = new URL(val);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }, 'Only HTTP and HTTPS URLs are allowed');

const SafeAlertConditionSchema = z.enum([
  'above',
  'below',
  'change_percent',
  'deviation_from_median',
  'oracle_disagreement',
  'stale_data',
  'confidence_drop',
  'anomaly_detected',
]);

const SafeAlertTargetValueSchema = z.number().finite();

const SafeBooleanSchema = z.union([
  z.boolean(),
  z.string().transform((val) => val.toLowerCase() === 'true'),
  z.union([z.literal(0), z.literal(1)]).transform((val) => val === 1),
]);

const SafeConfigTypeSchema = z.enum(['oracle_config', 'symbol', 'chain_config']);

const SafeIdListSchema = z
  .array(z.string().uuid())
  .min(1, 'At least one ID required')
  .max(100, 'Maximum 100 IDs allowed');

const SafeActionSchema = z.enum(['enable', 'disable', 'delete']);

const SafePeriodSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
  .refine(
    (val) => !isNaN(val) && val >= 1 && val <= 8760,
    'Period must be between 1 and 8760 hours (1 year)'
  );

export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T; error: null } | { data: null; error: z.ZodError } {
  try {
    return { data: schema.parse(data), error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { data: null, error };
    }
    return {
      data: null,
      error: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: error instanceof Error ? error.message : 'Unknown validation error',
        },
      ]),
    };
  }
}

export const CreateAlertRequestSchema = z.object({
  name: SafeNameSchema,
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
  condition_type: SafeAlertConditionSchema,
  target_value: SafeAlertTargetValueSchema,
  provider: SafeProviderSchema.optional(),
  is_active: SafeBooleanSchema.optional().default(true),
});

export const CreateFavoriteRequestSchema = z.object({
  name: SafeNameSchema,
  config_type: SafeConfigTypeSchema,
  config_data: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .refine((val) => {
      const size = JSON.stringify(val).length;
      return size <= 10000;
    }, 'Config data too large'),
});

export const BatchOperationSchema = z.object({
  action: SafeActionSchema,
  alertIds: SafeIdListSchema,
});

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
  confidenceSource: z.enum(['original', 'estimated']).optional(),
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
});

export const AlertListResponseSchema = z.object({
  alerts: z.array(
    z.object({
      id: z.string().uuid(),
      user_id: z.string().uuid(),
      name: z.string().min(1),
      symbol: z.string().min(1),
      chain: SafeChainSchema.nullable().optional(),
      condition_type: SafeAlertConditionSchema,
      target_value: z.number(),
      provider: SafeProviderSchema.nullable().optional(),
      is_active: z.boolean(),
      created_at: z.string().datetime(),
      updated_at: z.string().datetime().optional(),
      last_triggered_at: z.string().datetime().nullable().optional(),
    })
  ),
  count: z.number().int().nonnegative(),
});

export const PriceQueryRequestSchema = z.object({
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
  provider: SafeProviderSchema.optional(),
});

export const HistoricalPriceRequestSchema = z.object({
  provider: SafeProviderSchema,
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
  period: z.number().int().min(1).max(8760).optional().default(24),
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
