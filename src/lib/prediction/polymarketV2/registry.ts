import { z } from 'zod';

import { PolymarketBlsEvidenceInputSchema, PolymarketBlsPercentChangeInputSchema } from './bls';
import { PolymarketNwsObservationInputSchema } from './nws';

const DIGEST = /^0x[\da-f]{64}$/i;
const ObservationSchema = z.discriminatedUnion('provider', [
  z
    .object({
      id: z.string().trim().min(1).max(64),
      provider: z.literal('bls.series'),
      input: PolymarketBlsEvidenceInputSchema.strict(),
    })
    .strict(),
  z
    .object({
      id: z.string().trim().min(1).max(64),
      provider: z.literal('bls.percent-change'),
      input: PolymarketBlsPercentChangeInputSchema.strict(),
    })
    .strict(),
  z
    .object({
      id: z.string().trim().min(1).max(64),
      provider: z.literal('nws.latest-observation'),
      input: PolymarketNwsObservationInputSchema,
    })
    .strict(),
]);

const BindingSchema = z
  .object({
    marketId: z.string().trim().min(1).max(100),
    rulesDigest: z.string().regex(DIGEST),
    reviewedAt: z.string().datetime({ offset: true }),
    reviewer: z.string().trim().min(1).max(100),
    observations: z.array(ObservationSchema).min(1).max(10),
  })
  .strict()
  .superRefine((binding, context) => {
    const ids = new Set<string>();
    for (const observation of binding.observations) {
      if (ids.has(observation.id))
        context.addIssue({ code: 'custom', message: 'Duplicate observation id' });
      ids.add(observation.id);
    }
  });

export const PolymarketEvidenceRegistrySchema = z
  .array(BindingSchema)
  .max(200)
  .superRefine((bindings, context) => {
    const ids = new Set<string>();
    for (const binding of bindings) {
      if (ids.has(binding.marketId))
        context.addIssue({ code: 'custom', message: 'Duplicate market binding' });
      ids.add(binding.marketId);
    }
  });
