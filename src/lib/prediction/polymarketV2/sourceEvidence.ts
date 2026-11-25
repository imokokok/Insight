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
import {
  fetchPolymarketBeaNipaEvidence,
  fetchPolymarketFredSeriesEvidence,
  fetchPolymarketOpenFdaApplicationEvidence,
  fetchPolymarketSecSubmissionsEvidence,
  type PolymarketBeaNipaInput,
  type PolymarketFredSeriesInput,
  type PolymarketOpenFdaApplicationInput,
  type PolymarketSecSubmissionsInput,
} from './publicEvidence';
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
type SecInput = PolymarketSecSubmissionsInput;
type BeaInput = PolymarketBeaNipaInput;
type FredInput = PolymarketFredSeriesInput;
type OpenFdaInput = PolymarketOpenFdaApplicationInput;
type ProviderResult = { evidence: unknown; warnings: string[] };
type EvidenceProvider<I> = { fetch(input: I): Promise<ProviderResult> };

const providers: {
  'bls.series': EvidenceProvider<RawBlsInput>;
  'bls.percent-change': EvidenceProvider<PercentChangeInput>;
  'nws.latest-observation': EvidenceProvider<NwsInput>;
  'aviationweather.metar': EvidenceProvider<AviationWeatherInput>;
  'sec.submissions': EvidenceProvider<SecInput>;
  'bea.nipa': EvidenceProvider<BeaInput>;
  'fred.series': EvidenceProvider<FredInput>;
  'openfda.application': EvidenceProvider<OpenFdaInput>;
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
  'sec.submissions': {
    async fetch(input) {
      return {
        evidence: await fetchPolymarketSecSubmissionsEvidence(input),
        warnings: ['Public record is source metadata only; human review required.'],
      };
    },
  },
  'bea.nipa': {
    async fetch(input) {
      const evidence = await fetchPolymarketBeaNipaEvidence(input);
      return {
        evidence,
        warnings: evidence.partial
          ? ['BEA table snapshot is partial; human review required.']
          : ['Public record is source metadata only; human review required.'],
      };
    },
  },
  'fred.series': {
    async fetch(input) {
      return {
        evidence: await fetchPolymarketFredSeriesEvidence(input),
        warnings: ['Public record is source metadata only; human review required.'],
      };
    },
  },
  'openfda.application': {
    async fetch(input) {
      return {
        evidence: await fetchPolymarketOpenFdaApplicationEvidence(input),
        warnings: ['Public record is source metadata only; human review required.'],
      };
    },
  },
};

function resolutionSourceMatchesProvider(provider: string, value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    const suffix = (domain: string) => host === domain || host.endsWith(`.${domain}`);
    switch (provider) {
      case 'sec.submissions':
        return suffix('sec.gov');
      case 'bea.nipa':
        return suffix('bea.gov');
      case 'fred.series':
        return suffix('stlouisfed.org');
      case 'openfda.application':
        return suffix('fda.gov');
      default:
        return false;
    }
  } catch {
    return false;
  }
}

async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const result = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const index = cursor++;
        if (index >= items.length) return;
        result[index] = await mapper(items[index]);
      }
    })
  );
  return result;
}

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
        ['sec.submissions', 'bea.nipa', 'fred.series', 'openfda.application'].includes(
          definition.provider
        ) && !resolutionSourceMatchesProvider(definition.provider, market.resolutionSource!)
    )
  ) {
    throw new PolymarketEvidenceError(
      'MARKET_UNSUPPORTED',
      'Public data provider does not match the market resolution-source domain',
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

  const requestCache = new Map<string, Promise<ProviderResult>>();
  const collected = await mapWithLimit(binding.observations, 2, async (definition) => {
    const inputKey = JSON.stringify(definition.input, Object.keys(definition.input).sort());
    const cacheKey = `${definition.provider}:${inputKey}`;
    let pending = requestCache.get(cacheKey);
    if (!pending) {
      pending = (async () => {
        switch (definition.provider) {
          case 'bls.series':
            return providers['bls.series'].fetch(definition.input);
          case 'bls.percent-change':
            return providers['bls.percent-change'].fetch(definition.input);
          case 'nws.latest-observation':
            return providers['nws.latest-observation'].fetch(definition.input);
          case 'aviationweather.metar':
            return providers['aviationweather.metar'].fetch(definition.input);
          case 'sec.submissions':
            return providers['sec.submissions'].fetch(definition.input);
          case 'bea.nipa':
            return providers['bea.nipa'].fetch(definition.input);
          case 'fred.series':
            return providers['fred.series'].fetch(definition.input);
          case 'openfda.application':
            return providers['openfda.application'].fetch(definition.input);
        }
      })();
      requestCache.set(cacheKey, pending);
    }
    const result = await pending;
    return {
      id: definition.id,
      provider: definition.provider,
      evidence: result.evidence,
      warnings: result.warnings,
    };
  });

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
