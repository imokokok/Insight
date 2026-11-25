import { z } from 'zod';

import {
  fetchPolymarketAviationWeatherMetarEvidence,
  matchesPolymarketAviationWeatherResolutionSource,
  type PolymarketAviationWeatherMetarInput,
} from './aviationweather';
import {
  fetchPolymarketBlsPercentChangeEvidence,
  fetchPolymarketBlsSeriesEvidence,
  type PolymarketBlsEvidenceInputSchema,
  type PolymarketBlsPercentChangeInputSchema,
} from './bls';
import { getPolymarketMarketById } from './market';
import {
  fetchPolymarketNwsObservationEvidence,
  type PolymarketNwsObservationInputSchema,
} from './nws';
import { PolymarketEvidenceRegistrySchema } from './registry';

export const PolymarketEvidenceInputSchema = z.object({
  marketId: z.string().trim().min(1).max(100),
});
export type PolymarketEvidenceInput = z.infer<typeof PolymarketEvidenceInputSchema>;

export class PolymarketEvidenceError extends Error {
  constructor(
    readonly code:
      | 'FEATURE_DISABLED'
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
type NwsInput = z.infer<typeof PolymarketNwsObservationInputSchema>;
type AviationWeatherInput = PolymarketAviationWeatherMetarInput;
type ProviderResult = { evidence: unknown; warnings: string[] };
type EvidenceProvider<I> = { fetch(input: I): Promise<ProviderResult> };

const providers: {
  'bls.series': EvidenceProvider<RawBlsInput>;
  'bls.percent-change': EvidenceProvider<PercentChangeInput>;
  'nws.latest-observation': EvidenceProvider<NwsInput>;
  'aviationweather.metar': EvidenceProvider<AviationWeatherInput>;
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
  'nws.latest-observation': {
    async fetch(input) {
      return {
        evidence: await fetchPolymarketNwsObservationEvidence(input),
        warnings: [],
      };
    },
  },
  'aviationweather.metar': {
    async fetch(input) {
      const evidence = await fetchPolymarketAviationWeatherMetarEvidence(input);
      return {
        evidence,
        warnings: ['METAR snapshot may cover an incomplete source window; human review required.'],
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
  const parsed = PolymarketEvidenceRegistrySchema.safeParse(value);
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
  if (process.env.POLYMARKET_EVIDENCE_ENABLED !== 'true') {
    throw new PolymarketEvidenceError(
      'FEATURE_DISABLED',
      'Polymarket source evidence is not enabled for this deployment',
      503
    );
  }
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

  if (
    binding.observations.some(
      (definition) =>
        definition.provider === 'aviationweather.metar' &&
        !matchesPolymarketAviationWeatherResolutionSource(
          market.resolutionSource!,
          definition.input
        )
    )
  ) {
    throw new PolymarketEvidenceError(
      'MARKET_UNSUPPORTED',
      'AviationWeather binding does not exactly match the market resolution-source URL',
      422
    );
  }

  const collected = await Promise.all(
    binding.observations.map(async (definition) => {
      let result: ProviderResult;
      switch (definition.provider) {
        case 'bls.series':
          result = await providers['bls.series'].fetch(definition.input);
          break;
        case 'bls.percent-change':
          result = await providers['bls.percent-change'].fetch(definition.input);
          break;
        case 'nws.latest-observation':
          result = await providers['nws.latest-observation'].fetch(definition.input);
          break;
        case 'aviationweather.metar':
          result = await providers['aviationweather.metar'].fetch(definition.input);
          break;
      }
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
