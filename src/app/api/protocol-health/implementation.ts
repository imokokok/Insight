import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import {
  PositionSafetyRequestSchema,
  classifyOracleIssues,
  classifyOracleReputation,
  fetchLiveAssetDeviations,
  fetchOracleReputations,
  getPositionSymbols,
  mapPositionProviders,
  type OracleIssue,
  type ProviderSymbolMapping,
} from '@/lib/api/services/positionSafetyShared';
import { fetchPricesForPosition } from '@/lib/api/services/priceQueries';
import { getProtocolByIdWithDynamicData } from '@/lib/protocols/dynamicData';
import {
  calculatePositionCriticalDeviation,
  type PositionInput,
  type OracleWarning,
} from '@/lib/protocols/protocolHealth';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider } from '@/types/oracle';

const logger = createLogger('api-protocol-health');

function formatSymbolList(symbols: string[]): string {
  if (symbols.length === 0) return 'your assets';
  if (symbols.length === 1) return symbols[0];
  return `${symbols.slice(0, -1).join(', ')} and ${symbols[symbols.length - 1]}`;
}

function buildOracleImpact(
  provider: OracleProvider,
  symbols: string[],
  issues: OracleIssue[]
): string {
  const symbolText = formatSymbolList(symbols);

  // No issues: reassure the user
  if (issues.length === 0) {
    return `${provider} is currently operating normally for ${symbolText}, so oracle risk should not materially affect your position.`;
  }

  // Pick the most severe issue to headline the impact sentence
  const primary = issues[0];
  switch (primary.type) {
    case 'freshness':
      return `${provider} price updates for ${symbolText} are delayed (freshness ${primary.value.toFixed(0)}/100). If your position approaches liquidation, the liquidaton price may not reflect the latest market movement.`;
    case 'reliability':
      return `${provider} has been unstable for ${symbolText} (reliability ${primary.value.toFixed(0)}/100). The oracle price used to value your position may drift from the true market price.`;
    case 'deviation':
      return `${provider} is currently ${primary.value.toFixed(2)}% away from the market consensus for ${symbolText}. This means your effective liquidation threshold could be higher or lower than calculated.`;
    case 'uptime':
      return `${provider} has had recent outages for ${symbolText} (uptime ${primary.value.toFixed(1)}%). If it fails when your position is near liquidation, the protocol may not be able to trigger protection in time.`;
    default:
      return `${provider} shows signs of degraded oracle health for ${symbolText}, which adds uncertainty to your liquidation risk.`;
  }
}

async function buildOracleWarnings(
  providerMappings: ProviderSymbolMapping[]
): Promise<OracleWarning[]> {
  const warnings: OracleWarning[] = [];
  const reputationMap = await fetchOracleReputations(providerMappings, (provider) => {
    logger.warn(`Failed to fetch reputation for ${provider}`);
  });

  for (const mapping of providerMappings) {
    const { provider, symbols } = mapping;
    const rep = reputationMap.get(provider);
    if (!rep) {
      warnings.push({
        provider,
        overallScore: 0,
        freshnessScore: 0,
        reliabilityScore: 0,
        avgDeviationPct: 0,
        level: 'critical',
        message: `No reliability data available for ${provider}. Oracle performance is unknown, which adds uncertainty to the liquidation risk calculation.`,
        impact: `We cannot verify ${provider}'s current health for ${formatSymbolList(symbols)}. Consider this an additional uncertainty when judging your safety buffer.`,
        affectedSymbols: symbols,
      });
      continue;
    }

    const level = classifyOracleReputation(rep.overall_score);

    const { messages, issues } = classifyOracleIssues(rep);

    const message =
      messages.length > 0
        ? messages.join('. ') + '.'
        : `${provider} oracle is operating normally with a reliability score of ${rep.overall_score.toFixed(0)}/100.`;

    warnings.push({
      provider,
      overallScore: rep.overall_score,
      freshnessScore: rep.freshness_score,
      reliabilityScore: rep.reliability_score,
      avgDeviationPct: rep.avg_deviation_pct,
      level,
      message,
      impact: buildOracleImpact(provider, symbols, issues),
      affectedSymbols: symbols,
    });
  }

  return warnings;
}

/**
 * Module-level short-TTL cache for live consensus deviations. The safety-check
 * page auto-refreshes every 45s; without this, every refresh (and every user)
 * would re-fetch every provider for every asset on every request. A 60s
 * snapshot is still far fresher than the minutes-stale reputation averages it
 * replaces, while bounding provider calls to ~1 wave per asset per 60s per warm
 * instance. Only non-zero deviations are cached (failures retry next call).
 */
const CONSENSUS_CACHE_TTL_MS = 60_000;
const consensusDeviationCache = new Map<string, { value: number; expiresAt: number }>();

function getCachedConsensusDeviation(key: string): number | null {
  const hit = consensusDeviationCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  if (hit) consensusDeviationCache.delete(key);
  return null;
}

/** Test-only: clears the module-level consensus cache between test cases. */
export function resetConsensusDeviationCacheForTests(): void {
  consensusDeviationCache.clear();
}

/**
 * Fetch the live cross-oracle consensus deviation for each position asset:
 * the max |deviation from consensus| across the providers serving that asset
 * RIGHT NOW (the same signal the pre-trade check uses). This replaces the
 * minutes-stale provider-level reputation average in the safety-buffer oracle
 * deduction, making the effective buffer genuinely real-time.
 *
 * Non-blocking: an asset with no oracle coverage (UnsupportedSymbolError) or a
 * transient failure is skipped; the buffer then falls back to reputation.
 *
 * Exported for unit testing; only used by this route.
 */
export async function fetchLiveConsensusDeviations(
  symbols: string[],
  chain: string
): Promise<Record<string, number>> {
  const deviations: Record<string, number> = {};
  if (symbols.length === 0) return deviations;

  const cacheKey = (symbol: string) => `${chain}:${symbol}`;
  const toFetch: string[] = [];
  for (const symbol of symbols) {
    const cached = getCachedConsensusDeviation(cacheKey(symbol));
    if (cached !== null) deviations[symbol] = cached;
    else toFetch.push(symbol);
  }

  if (toFetch.length > 0) {
    const results = await Promise.allSettled(
      toFetch.map((symbol) => getConsensusPrice(symbol, chain))
    );

    results.forEach((r, i) => {
      const symbol = toFetch[i];
      if (r.status !== 'fulfilled') return;
      const maxDev = r.value.providers
        .filter((p) => p.status === 'success' && p.deviationPct !== null)
        .reduce((m, p) => Math.max(m, Math.abs(p.deviationPct as number)), 0);
      if (maxDev <= 0) return;
      deviations[symbol] = maxDev;
      consensusDeviationCache.set(cacheKey(symbol), {
        value: maxDev,
        expiresAt: Date.now() + CONSENSUS_CACHE_TTL_MS,
      });
    });
  }

  return deviations;
}

export const POST = createApiHandler(
  async (request: NextRequest) => {
    let body: unknown;
    try {
      body = await request.clone().json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON in request body' } },
        { status: 400 }
      );
    }

    const validation = PositionSafetyRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { errors } },
        },
        { status: 400 }
      );
    }

    const input: PositionInput = validation.data as PositionInput;

    try {
      // Collect all symbols in the position (for oracle warnings + live depeg lookup)
      const allSymbols = getPositionSymbols(input);

      // Collect oracle providers used by this protocol's assets,
      // grouped by the symbols in the user's position that rely on each provider.
      const protocol = await getProtocolByIdWithDynamicData(input.protocolId);
      const providerMappings = mapPositionProviders(allSymbols, protocol?.assets ?? []);

      // Live consensus deviation feeds the collateral-side liquidation buffer,
      // so only the position's collateral assets need it — a borrow's consensus
      // spread (usually a stablecoin) does not move the liquidation price and
      // only adds provider-fetch cost.
      const collateralSymbols = new Set<string>();
      (input.collaterals ?? []).forEach((c) => collateralSymbols.add(c.symbol));
      if (input.collateralSymbol) collateralSymbols.add(input.collateralSymbol);

      // Build oracle warnings, fetch live depeg/peg data, and fetch the live
      // cross-oracle consensus deviation per collateral in parallel; all are
      // independent and only feed into the safety-buffer analysis.
      const [oracleWarnings, liveAssetDeviations, liveConsensusDeviations] = await Promise.all([
        buildOracleWarnings(providerMappings),
        fetchLiveAssetDeviations(allSymbols, 'selected', (error) => {
          logger.warn('Failed to fetch live depeg/peg data, skipping live risk factor', {
            error: error instanceof Error ? error.message : String(error),
          });
        }),
        fetchLiveConsensusDeviations(Array.from(collateralSymbols), protocol?.chain ?? ''),
      ]);

      const result = await calculatePositionCriticalDeviation(
        input,
        fetchPricesForPosition,
        oracleWarnings,
        liveAssetDeviations,
        protocol,
        liveConsensusDeviations
      );

      // Merge warnings into result
      const resultWithWarnings = { ...result, oracleWarnings };

      return NextResponse.json({
        success: true,
        data: resultWithWarnings,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CALCULATION_ERROR', message },
        },
        { status: 500 }
      );
    }
  },
  {
    middlewares: {
      logging: true,
      // This route exposes deep-analysis data (position stress test) that
      // /api/v1/safety/position serves through the credit-quota middleware.
      // Keep it open for the app's own UI — the internal-cookie path skips
      // auth via skipInternalAuthAndRateLimit below — but require external
      // callers to authenticate with an API key and bill them identically to
      // the v1 endpoint. Without this, anonymous scrapers could fetch for
      // free the same data the v1 API charges for.
      auth: { required: true, allowApiKey: true },
      rateLimit: { preset: 'api' },
      quota: true,
      cors: true,
    },
    skipInternalAuthAndRateLimit: true,
  }
);
