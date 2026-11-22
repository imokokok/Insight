import { z } from 'zod';

export const PolymarketPositionSchema = z.object({
  title: z.string(),
  outcome: z.string(),
  current_size: z.number().finite(),
  avg_price: z.number().finite().nullable().optional(),
  current_value: z.number().finite(),
  unrealized_pnl: z.number().finite(),
  redeemable: z.boolean(),
  condition_id: z.string(),
  token_id: z.string(),
  event_slug: z.string().nullable().optional(),
});

export const PolymarketPositionsPageSchema = z
  .object({
    data: z.array(PolymarketPositionSchema),
    pagination: z.object({
      has_more: z.boolean(),
      next_cursor: z.string().nullable(),
    }),
  })
  .superRefine((page, context) => {
    if (page.pagination.has_more && !page.pagination.next_cursor) {
      context.addIssue({
        code: 'custom',
        message: 'A next_cursor is required when has_more is true.',
      });
    }
  });

export type PolymarketPosition = z.infer<typeof PolymarketPositionSchema>;
export type PolymarketPositionsPage = z.infer<typeof PolymarketPositionsPageSchema>;
