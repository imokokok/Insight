import { z } from 'zod';

import { PolymarketAviationWeatherMetarInputSchema } from './aviationweather';
import { PolymarketBlsEvidenceInputSchema, PolymarketBlsPercentChangeInputSchema } from './bls';
import { PolymarketNwsObservationInputSchema } from './nws';
import {
  PolymarketBeaNipaInputSchema,
  PolymarketFredSeriesInputSchema,
  PolymarketOpenFdaApplicationInputSchema,
  PolymarketSecSubmissionsInputSchema,
} from './publicEvidence';

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
  z
    .object({
      id: z.string().trim().min(1).max(64),
      provider: z.literal('aviationweather.metar'),
      input: PolymarketAviationWeatherMetarInputSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().trim().min(1).max(64),
      provider: z.literal('sec.submissions'),
      input: PolymarketSecSubmissionsInputSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().trim().min(1).max(64),
      provider: z.literal('bea.nipa'),
      input: PolymarketBeaNipaInputSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().trim().min(1).max(64),
      provider: z.literal('fred.series'),
      input: PolymarketFredSeriesInputSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().trim().min(1).max(64),
      provider: z.literal('openfda.application'),
      input: PolymarketOpenFdaApplicationInputSchema,
    })
    .strict(),
]);

const BindingSchema = z
  .object({
    marketId: z.string().trim().min(1).max(100),
    rulesDigest: z.string().regex(DIGEST),
    reviewedAt: z.string().datetime({ offset: true }),
    reviewer: z.string().trim().min(1).max(100),
    observations: z.array(ObservationSchema).min(1).max(8),
  })
  .strict()
  .superRefine((binding, context) => {
    const ids = new Set<string>();
    const singleRecordProviders = new Set([
      'sec.submissions',
      'bea.nipa',
      'fred.series',
      'openfda.application',
    ]);
    const seenProviders = new Set<string>();
    for (const observation of binding.observations) {
      if (ids.has(observation.id))
        context.addIssue({ code: 'custom', message: 'Duplicate observation id' });
      ids.add(observation.id);
      if (singleRecordProviders.has(observation.provider)) {
        if (seenProviders.has(observation.provider))
          context.addIssue({
            code: 'custom',
            message: `Only one ${observation.provider} record may be configured per market binding`,
          });
        seenProviders.add(observation.provider);
      }
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
