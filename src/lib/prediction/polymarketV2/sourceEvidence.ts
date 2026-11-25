import { z } from 'zod';

import {
  fetchPolymarketBlsPercentChangeEvidence,
  fetchPolymarketBlsSeriesEvidence,
  PolymarketBlsEvidenceInputSchema,
  PolymarketBlsPercentChangeInputSchema,
} from './bls';
import { getPolymarketMarketById } from './market';

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

const RegistrySchema = z
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

export const PolymarketEvidenceInputSchema = z.object({
  marketId: z.string().trim().min(1).max(100),
});
export type PolymarketEvidenceInput = z.infer<typeof PolymarketEvidenceInputSchema>;

export class PolymarketEvidenceError extends Error {
  constructor(
    readonly code:
      | 'BINDING_NOT_CONFIGURED'
      | 'MARKET_NOT_FOUND'
      | 'RULES_CHANGED'
      | 'MARKET_UNSUPPORTED'
      | 'MARKET_NOT_OPEN',
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'PolymarketEvidenceError';
  }
}

type RawBlsInput = z.infer<typeof PolymarketBlsEvidenceInputSchema>;
type PercentChangeInput = z.infer<typeof PolymarketBlsPercentChangeInputSchema>;
type ProviderResult = { evidence: unknown; warnings: string[] };
type EvidenceProvider<I> = { fetch(input: I): Promise<ProviderResult> };

const providers: {
  'bls.series': EvidenceProvider<RawBlsInput>;
  'bls.percent-change': EvidenceProvider<PercentChangeInput>;
} = {
  'bls.series': {
    async fetch(input) {
      const evidence = await fetchPolymarketBlsSeriesEvidence(input);
      return {
        evidence,
        warnings: evidence.observation.footnotes
          .filter((footnote) => footnote.code || footnote.text)
          .map(
            (footnote) =>
              `${footnote.code}${footnote.code && footnote.text ? ': ' : ''}${footnote.text}`
          ),
      };
    },
  },
  'bls.percent-change': {
    async fetch(input) {
      const evidence = await fetchPolymarketBlsPercentChangeEvidence(input);
      return {
        evidence,
        warnings: [...evidence.observation.footnotes, ...evidence.baseObservation.footnotes]
          .filter((footnote) => footnote.code || footnote.text)
          .map(
            (footnote) =>
              `${footnote.code}${footnote.code && footnote.text ? ': ' : ''}${footnote.text}`
          ),
      };
    },
  },
};

function parseRegistry() {
  const raw = process.env.POLYMARKET_RULE_BINDINGS_JSON;
  if (!raw)
    throw new PolymarketEvidenceError(
      'BINDING_NOT_CONFIGURED',
      'No reviewed Polymarket source-evidence bindings are configured',
      503
    );
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw new PolymarketEvidenceError(
      'BINDING_NOT_CONFIGURED',
      'Polymarket source-evidence binding configuration is invalid',
      503
    );
  }
  const parsed = RegistrySchema.safeParse(value);
  if (!parsed.success)
    throw new PolymarketEvidenceError(
      'BINDING_NOT_CONFIGURED',
      'Polymarket source-evidence binding configuration is invalid',
      503
    );
  return parsed.data;
}

function isHttpsUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Collect bound source evidence and market-integrity facts without evaluating the event outcome. */
export async function collectPolymarketMarketEvidence(input: PolymarketEvidenceInput) {
  const binding = parseRegistry().find((entry) => entry.marketId === input.marketId);
  if (!binding)
    throw new PolymarketEvidenceError(
      'BINDING_NOT_CONFIGURED',
      'No reviewed source-evidence binding exists for this market',
      404
    );
  const deadlineAt = Date.now() + 20_000;
  const market = await getPolymarketMarketById(input.marketId, deadlineAt);
  if (!market)
    throw new PolymarketEvidenceError('MARKET_NOT_FOUND', 'Polymarket market was not found', 404);
  if (market.rulesDigest.toLowerCase() !== binding.rulesDigest.toLowerCase()) {
    throw new PolymarketEvidenceError(
      'RULES_CHANGED',
      'Market rule-bearing fields changed after source review',
      409
    );
  }
  if (market.active !== true || market.closed !== false) {
    throw new PolymarketEvidenceError(
      'MARKET_NOT_OPEN',
      'Evidence collection is limited to active and open markets',
      409
    );
  }
  if (
    !market.question ||
    !market.description ||
    !isHttpsUrl(market.resolutionSource) ||
    market.outcomes.length < 2
  ) {
    throw new PolymarketEvidenceError(
      'MARKET_UNSUPPORTED',
      'Market is missing required rule and resolution-source metadata',
      422
    );
  }

  const collected = await Promise.all(
    binding.observations.map(async (definition) => {
      const result =
        definition.provider === 'bls.series'
          ? await providers['bls.series'].fetch(definition.input)
          : await providers['bls.percent-change'].fetch(definition.input);
      return {
        id: definition.id,
        provider: definition.provider,
        evidence: result.evidence,
        warnings: result.warnings,
      };
    })
  );

  const latestMarket = await getPolymarketMarketById(input.marketId, deadlineAt);
  if (!latestMarket)
    throw new PolymarketEvidenceError(
      'MARKET_NOT_FOUND',
      'Market was not found after retrieving source evidence',
      404
    );
  if (latestMarket.rulesDigest.toLowerCase() !== binding.rulesDigest.toLowerCase()) {
    throw new PolymarketEvidenceError(
      'RULES_CHANGED',
      'Market rules changed while source evidence was retrieved',
      409
    );
  }
  if (latestMarket.active !== true || latestMarket.closed !== false) {
    throw new PolymarketEvidenceError(
      'MARKET_NOT_OPEN',
      'Market closed while source evidence was retrieved',
      409
    );
  }

  const reviewWarnings = [...new Set(collected.flatMap((item) => item.warnings))];
  return {
    schema: 'insight.polymarket-source-evidence.v1' as const,
    collectedAt: new Date().toISOString(),
    market: {
      id: latestMarket.id,
      slug: latestMarket.slug,
      question: latestMarket.question,
      rulesDigest: latestMarket.rulesDigest,
      resolutionSource: latestMarket.resolutionSource,
      endDate: latestMarket.endDate,
      outcomeNames: latestMarket.outcomes.map((outcome) => outcome.name),
    },
    binding: {
      source: 'server-reviewed-source-binding' as const,
      reviewedAt: binding.reviewedAt,
      reviewer: binding.reviewer,
    },
    checks: {
      marketActive: true as const,
      marketOpen: true as const,
      rulesDigestStable: true as const,
      resolutionSourceDeclared: true as const,
      sourceEvidenceRetrieved: true as const,
    },
    observations: collected.map(({ id, provider, evidence }) => ({ id, provider, evidence })),
    reviewWarnings,
    requiresHumanReview: reviewWarnings.length > 0,
    scope: {
      outcomeEvaluation: 'not_performed' as const,
      settlement: 'not_performed' as const,
      transactionAuthority: 'none' as const,
      execution: 'not_performed' as const,
    },
    disclosure:
      'This record contains market-integrity checks and source observations only. It does not compare an observation to a market threshold and does not evaluate an event outcome, produce a forecast, recommend a position, or authorize execution.',
  };
}
