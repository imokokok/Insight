import { z } from 'zod';

import { createLogger } from '@/lib/utils/logger';

import { sanitizeString, sanitizeSymbol, sanitizeProvider, sanitizeChain } from './inputSanitizer';

const logger = createLogger('security-validation');

export const SanitizedStringSchema = z
  .string()
  .transform((val) => sanitizeString(val, { maxLength: 1000 }));

export const SafeSymbolSchema = z
  .string()
  .min(1, 'Symbol is required')
  .max(20, 'Symbol too long')
  .transform((val) => sanitizeSymbol(val))
  .refine((val) => val.length > 0, 'Invalid symbol format');

export const SafeProviderSchema = z
  .string()
  .transform((val) => sanitizeProvider(val))
  .refine((val) => val.length > 0, 'Invalid provider');

export const SafeChainSchema = z
  .string()
  .transform((val) => sanitizeChain(val))
  .refine((val) => val.length > 0, 'Invalid chain');

export const SafeNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .transform((val) => sanitizeString(val, { maxLength: 100 }));

export const SafeDescriptionSchema = z
  .string()
  .max(500, 'Description too long')
  .transform((val) => sanitizeString(val, { maxLength: 500 }));

export const SafeUuidSchema = z
  .string()
  .uuid()
  .transform((val) => val.toLowerCase());

export const SafeEmailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .transform((val) => val.toLowerCase().trim());

export const SafeUrlSchema = z
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

export const SafeJsonSchema = z.string().refine((val) => {
  try {
    JSON.parse(val);
    return true;
  } catch {
    return false;
  }
}, 'Invalid JSON format');

export const SafePriceSchema = z.number().positive('Price must be positive').finite();

export const SafePercentageSchema = z
  .number()
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage must be at most 100');

export const SafeAlertConditionSchema = z.enum(['above', 'below', 'change_percent']);

export const SafeAlertTargetValueSchema = z.number().finite();

export const SafePaginationSchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((val) => !isNaN(val) && val >= 1, 'Page must be at least 1')
    .default(1),
  limit: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .default(20),
});

export const SafeSearchQuerySchema = z
  .string()
  .max(100, 'Search query too long')
  .transform((val) => sanitizeString(val, { maxLength: 100 }));

export const SafeConfigTypeSchema = z.enum(['oracle_config', 'symbol', 'chain_config']);

export const SafeBatchRequestSchema = z
  .array(
    z.object({
      provider: SafeProviderSchema,
      symbol: SafeSymbolSchema,
      chain: SafeChainSchema.optional(),
    })
  )
  .min(1, 'At least one request required')
  .max(50, 'Maximum 50 requests allowed');

export const SafeIdListSchema = z
  .array(z.string().uuid())
  .min(1, 'At least one ID required')
  .max(100, 'Maximum 100 IDs allowed');

export const SafeActionSchema = z.enum(['enable', 'disable', 'delete']);

export const SafeBooleanSchema = z.union([
  z.boolean(),
  z.string().transform((val) => val.toLowerCase() === 'true'),
  z.number().transform((val) => val === 1),
]);

export const SafeTimestampSchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (typeof val === 'string') {
      const parsed = Date.parse(val);
      if (isNaN(parsed)) {
        throw new Error('Invalid timestamp');
      }
      return parsed;
    }
    return val;
  })
  .refine((val) => val > 0 && val < 8640000000000000, 'Invalid timestamp');

export const SafePeriodSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
  .refine((val) => !isNaN(val) && val >= 1 && val <= 365, 'Period must be between 1 and 365 days');

export function createSafeEnumSchema<T extends [string, ...string[]]>(values: T) {
  return z.enum(values).transform((val) => sanitizeString(val, { maxLength: 50 }).toLowerCase());
}

export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation failed', { errors: error.issues });
    }
    return null;
  }
}

export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    return { success: false, errors };
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

export const UpdateAlertRequestSchema = CreateAlertRequestSchema.partial();

export const CreateFavoriteRequestSchema = z.object({
  name: SafeNameSchema,
  config_type: SafeConfigTypeSchema,
  config_data: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .refine((val) => {
      const size = JSON.stringify(val).length;
      return size <= 10000;
    }, 'Config data too large'),
});

export const UpdateFavoriteRequestSchema = CreateFavoriteRequestSchema.partial();

export const CreateSnapshotRequestSchema = z.object({
  name: SafeNameSchema.optional(),
  symbol: SafeSymbolSchema,
  selected_oracles: z.array(SafeProviderSchema).min(1).max(10),
  price_data: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()])
  ),
  stats: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()])
  ),
  is_public: SafeBooleanSchema.optional().default(false),
});

export const UpdateSnapshotRequestSchema = CreateSnapshotRequestSchema.partial();

export const BatchOperationSchema = z.object({
  action: SafeActionSchema,
  alertIds: SafeIdListSchema,
});

export const PriceQuerySchema = z.object({
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
  provider: SafeProviderSchema.optional(),
  period: SafePeriodSchema.optional(),
});

export const HistoricalPriceQuerySchema = z.object({
  provider: SafeProviderSchema,
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
  period: SafePeriodSchema,
});

export const BatchPriceRequestSchema = z.object({
  requests: SafeBatchRequestSchema,
});

export const PriceDataBaseSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  price: z.number().positive('Price must be positive'),
  timestamp: z.number().int().positive('Timestamp must be a positive integer'),
});

export const PriceDataSchema = PriceDataBaseSchema.extend({
  provider: SafeProviderSchema,
  chain: SafeChainSchema.optional(),
  decimals: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
  change: z.number().optional(),
  change24h: z.number().optional(),
  change24hPercent: z.number().optional(),
});

export const OracleResponseSchema = z.object({
  success: z.boolean(),
  data: PriceDataSchema.optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      provider: SafeProviderSchema.optional(),
    })
    .optional(),
  timestamp: z.number().int().positive(),
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
  period: z.number().int().min(1).max(365).optional().default(24),
});

export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
});

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.number().int().positive(),
  version: z.string(),
  uptime: z.number().nonnegative(),
  checks: z
    .object({
      database: z.enum(['ok', 'error']).optional(),
      cache: z.enum(['ok', 'error']).optional(),
      oracles: z.record(z.string(), z.enum(['ok', 'error'])).optional(),
    })
    .optional(),
});

export type CreateAlertRequestType = z.infer<typeof CreateAlertRequestSchema>;
export type UpdateAlertRequestType = z.infer<typeof UpdateAlertRequestSchema>;
export type CreateFavoriteRequestType = z.infer<typeof CreateFavoriteRequestSchema>;
export type UpdateFavoriteRequestType = z.infer<typeof UpdateFavoriteRequestSchema>;
export type CreateSnapshotRequestType = z.infer<typeof CreateSnapshotRequestSchema>;
export type UpdateSnapshotRequestType = z.infer<typeof UpdateSnapshotRequestSchema>;
export type BatchOperationType = z.infer<typeof BatchOperationSchema>;
export type PriceQueryType = z.infer<typeof PriceQuerySchema>;
export type HistoricalPriceQueryType = z.infer<typeof HistoricalPriceQuerySchema>;
export type BatchPriceRequestType = z.infer<typeof BatchPriceRequestSchema>;
export type PriceDataType = z.infer<typeof PriceDataSchema>;
export type OracleResponseType = z.infer<typeof OracleResponseSchema>;
