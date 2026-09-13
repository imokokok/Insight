import { z } from 'zod';

import { SafeSymbolSchema } from '@/lib/security/validation';

export const DeviationQuerySchema = z.object({
  symbol: SafeSymbolSchema,
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional(),
  interval: z.enum(['1h', '6h', '24h']).optional().default('24h'),
});
