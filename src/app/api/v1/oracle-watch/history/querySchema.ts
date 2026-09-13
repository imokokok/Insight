import { z } from 'zod';

import { SafeSymbolSchema, SafeChainSchema } from '@/lib/security/validation';

export const OracleWatchHistoryQuerySchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. ETH, BTC'),
  chain: SafeChainSchema.optional().describe('Optional blockchain, e.g. ethereum, arbitrum, base'),
  days: z.coerce.number().int().min(1).max(365).default(30),
  interval: z
    .enum(['30min', 'hourly', 'daily'])
    .optional()
    .describe(
      'Aggregation grain: 30min, hourly, or daily; long windows are automatically rolled up'
    ),
});
