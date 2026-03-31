import { z } from 'zod';

import { OracleProvider, Blockchain } from '@/types/oracle/enums';

export const ConfidenceIntervalSchema = z.object({
  bid: z.number(),
  ask: z.number(),
  widthPercentage: z.number(),
});

export const PriceDataBaseSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  price: z.number().positive('Price must be positive'),
  timestamp: z.number().int().positive('Timestamp must be a positive integer'),
});

export const PriceDataSchema = PriceDataBaseSchema.extend({
  provider: z.nativeEnum(OracleProvider),
  chain: z.nativeEnum(Blockchain).optional(),
  decimals: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
  change: z.number().optional(),
  change24h: z.number().optional(),
  change24hPercent: z.number().optional(),
  confidenceInterval: ConfidenceIntervalSchema.optional(),
});

export const PriceDataPointSchema = PriceDataBaseSchema.extend({
  change24h: z.number().optional(),
  changePercent24h: z.number().optional(),
});

export const PriceDataForTechnicalAnalysisSchema = z.object({
  price: z.number().positive(),
  timestamp: z.number().int().positive(),
});

export const PriceDataForChartSchema = PriceDataBaseSchema.extend({
  open: z.number().positive().optional(),
  high: z.number().positive().optional(),
  low: z.number().positive().optional(),
  close: z.number().positive().optional(),
  volume: z.number().nonnegative().optional(),
});

export const PriceDataExtendedSchema = PriceDataSchema.extend({
  changePercent: z.number().optional(),
});

export const PriceDeviationSchema = z.object({
  symbol: z.string().min(1),
  oraclePrice: z.number().positive(),
  marketPrice: z.number().positive().optional(),
  deviation: z.number(),
  deviationPercent: z.number(),
  trend: z.enum(['up', 'down', 'stable']),
  status: z.enum(['normal', 'warning', 'critical']),
});

export const PriceDataForAlertSchema = PriceDataBaseSchema.extend({
  change24h: z.number(),
  changePercent24h: z.number(),
});

export const OracleResponseSchema = z.object({
  success: z.boolean(),
  data: PriceDataSchema.optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      provider: z.nativeEnum(OracleProvider).optional(),
    })
    .optional(),
  timestamp: z.number().int().positive(),
});

export const OracleListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(PriceDataSchema).optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      provider: z.nativeEnum(OracleProvider).optional(),
    })
    .optional(),
  timestamp: z.number().int().positive(),
  count: z.number().int().nonnegative().optional(),
});

export const AlertConditionTypeSchema = z.enum(['above', 'below', 'change_percent']);

export const AlertResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  symbol: z.string().min(1),
  chain: z.nativeEnum(Blockchain).nullable().optional(),
  condition_type: AlertConditionTypeSchema,
  target_value: z.number(),
  provider: z.nativeEnum(OracleProvider).nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  last_triggered_at: z.string().datetime().nullable().optional(),
});

export const AlertListResponseSchema = z.object({
  alerts: z.array(AlertResponseSchema),
  count: z.number().int().nonnegative(),
});

export const CreateAlertRequestSchema = z.object({
  name: z.string().min(1, 'Alert name is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  chain: z.nativeEnum(Blockchain).optional(),
  condition_type: AlertConditionTypeSchema,
  target_value: z.number({
    required_error: 'Target value is required',
    invalid_type_error: 'Target value must be a number',
  }),
  provider: z.nativeEnum(OracleProvider).optional(),
  is_active: z.boolean().optional().default(true),
});

export const UpdateAlertRequestSchema = CreateAlertRequestSchema.partial();

export const BatchPriceRequestItemSchema = z.object({
  provider: z.nativeEnum(OracleProvider),
  symbol: z.string().min(1),
  chain: z.nativeEnum(Blockchain).optional(),
});

export const BatchPriceRequestSchema = z.object({
  requests: z.array(BatchPriceRequestItemSchema).min(1).max(50),
});

export const BatchPriceResponseSchema = z.object({
  results: z.record(PriceDataSchema),
});

export const HistoricalPriceRequestSchema = z.object({
  provider: z.nativeEnum(OracleProvider),
  symbol: z.string().min(1),
  chain: z.nativeEnum(Blockchain).optional(),
  period: z.number().int().min(1).max(365).optional().default(24),
});

export const DataQualityMetricsSchema = z.object({
  freshness: z.object({
    lastUpdated: z.number().int().positive(),
    updateInterval: z.number().int().positive(),
  }),
  completeness: z.object({
    successCount: z.number().int().nonnegative(),
    totalCount: z.number().int().nonnegative(),
  }),
  reliability: z.object({
    historicalAccuracy: z.number().min(0).max(1),
    responseSuccessRate: z.number().min(0).max(1),
    uptime: z.number().min(0).max(1),
  }),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
  timestamp: z.number().int().positive(),
});

export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
});

export const PriceQueryRequestSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  chain: z.nativeEnum(Blockchain).optional(),
  provider: z.nativeEnum(OracleProvider).optional(),
});

export const FavoriteResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  symbol: z.string().min(1),
  chain: z.nativeEnum(Blockchain).nullable().optional(),
  provider: z.nativeEnum(OracleProvider).nullable().optional(),
  created_at: z.string().datetime(),
});

export const FavoriteListResponseSchema = z.object({
  favorites: z.array(FavoriteResponseSchema),
  count: z.number().int().nonnegative(),
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
      oracles: z.record(z.enum(['ok', 'error'])).optional(),
    })
    .optional(),
});

export type PriceDataType = z.infer<typeof PriceDataSchema>;
export type OracleResponseType = z.infer<typeof OracleResponseSchema>;
export type AlertResponseType = z.infer<typeof AlertResponseSchema>;
export type CreateAlertRequestType = z.infer<typeof CreateAlertRequestSchema>;
export type BatchPriceRequestType = z.infer<typeof BatchPriceRequestSchema>;
export type DataQualityMetricsType = z.infer<typeof DataQualityMetricsSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
