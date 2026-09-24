import {
  calculateConsensusPrice,
  FRESHNESS_STALE_AGE_SECONDS,
  FRESHNESS_STALE_DIVERGENCE_PCT,
  type ConsensusMethod,
} from '@/lib/analytics/consensusPrice';
import { InternalError, UnsupportedSymbolError } from '@/lib/errors';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { resolveOracleAgeSeconds } from '@/lib/oracles/oracleAge';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { getAllActiveFeedsByProviderWithStatus } from '@/lib/oracles/utils/dynamicFeedResolver';
import { extractBaseSymbol, isUsdDenominatedFeedSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain, type PriceData } from '@/types/oracle';

const logger = createLogger('consensus-price-service');

const CONSENSUS_FETCH_CONCURRENCY = 6;
// Share only in-flight public oracle reads, never completed prices or signed
// assessments. Each subsequent request still re-evaluates source freshness.
const pendingPrices = new Map<string, Promise<FetchProviderPriceResult>>();

// Canonical WETH is exactly redeemable 1:1 for ETH, so its USD reference price
// should use the broader ETH oracle set. This alias is deliberately confined to
// price discovery: attestation identity remains the chain-specific WETH CAIP-19
// asset produced from the original request.
const PRICE_REFERENCE_ALIASES: Readonly<Record<string, string>> = {
  WETH: 'ETH',
};

export interface ConsensusProviderPrice {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  price: number;
  deviationPct: number | null;
  isOutlier: boolean;
  confidence: number | null;
  timestamp: number;
  retrievedAt?: number;
  fetchDurationMs?: number;
  timestampProvenance?: 'provider_age' | 'provider_timestamp' | 'unknown';
  dataAgeSeconds: number | null;
  source?: string;
  verification?: PriceData['verification'];
  verificationLevel?: PriceData['verificationLevel'];
  countsTowardOracleQuorum: boolean;
  reputationScore: number | null;
  status: 'success' | 'unsupported' | 'error';
  /** Effectively stale: oracle-true age is old AND price diverges from the
   *  fresh consensus (genuinely dead/wrong). A stale timestamp with a price in
   *  consensus (timestamp anomaly, e.g. API3) is false. */
  isStale: boolean;
  errorMessage?: string;
}

export interface ConsensusPriceResponse {
  symbol: string;
  chain?: Blockchain;
  consensusPrice: number;
  method: ConsensusMethod;
  recommendedMethod: ConsensusMethod;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low' | 'very_low';
  agreement: number;
  participantCount: number;
  excludedCount: number;
  excludedProviders: string[];
  priceRange: { min: number; max: number };
  methodResults: Record<ConsensusMethod, number>;
  providers: ConsensusProviderPrice[];
  recommendedProvider: OracleProvider | null;
}

function normalizeSymbol(symbol: string): string {
  const normalized = extractBaseSymbol(symbol).toUpperCase();
  return PRICE_REFERENCE_ALIASES[normalized] ?? normalized;
}

function resolveChain(blockchain: string | undefined): Blockchain | undefined {
  if (!blockchain) return undefined;
  const normalized = blockchain.toLowerCase().replace(/_/g, '-');
  return Object.values(Blockchain).find((b) => b === normalized);
}

/**
 * Determine which providers have an active feed for the given symbol.
 * When no chain is specified we match any chain; when a chain is provided
 * we require the provider itself to support that chain (this prevents
 * chain-agnostic feeds from pulling in providers such as Reflector that
 * only operate on Stellar).
 */
export async function resolveProvidersForSymbol(
  symbol: string,
  chain?: Blockchain
): Promise<OracleProvider[]> {
  const baseSymbol = normalizeSymbol(symbol);
  const feedRegistry = await getAllActiveFeedsByProviderWithStatus().catch(() => ({
    feeds: new Map<string, unknown[]>(),
    errored: true,
  }));
  const feedsByProvider = feedRegistry.feeds;

  const providers: OracleProvider[] = [];

  for (const provider of Object.values(OracleProvider)) {
    let hasActiveFeed = false;
    let hasSpecificChainFeed = false;

    const feeds = feedsByProvider.get(provider);
    if (feeds && feeds.length > 0) {
      hasActiveFeed = feeds.some((feed) => {
        const feedSymbol = extractBaseSymbol((feed as { symbol: string }).symbol).toUpperCase();
        if (
          feedSymbol !== baseSymbol ||
          !isUsdDenominatedFeedSymbol((feed as { symbol: string }).symbol)
        )
          return false;
        if (!chain) return true;
        const chainId = (feed as { chain_id?: number }).chain_id ?? 0;
        if (chainId === 0) return true;
        const targetChainId = BLOCKCHAIN_TO_CHAIN_ID[chain] ?? 0;
        return chainId === targetChainId;
      });
      // A DB-verified active feed bound to a concrete (non-zero) chain that
      // matches the queried chain is sufficient proof of support, even when the
      // provider's curated static list lags the DB. Chain-agnostic feeds
      // (chain_id=0) are deliberately excluded here so a chain-specific
      // provider (e.g. Reflector on Stellar) is never activated on a chain it
      // does not serve. This mirrors the "trust the DB, don't gate on static
      // lists" policy already applied in snapshotCollector.ts:117-120.
      hasSpecificChainFeed = feeds.some((feed) => {
        const feedSymbol = extractBaseSymbol((feed as { symbol: string }).symbol).toUpperCase();
        if (
          feedSymbol !== baseSymbol ||
          !isUsdDenominatedFeedSymbol((feed as { symbol: string }).symbol)
        )
          return false;
        const chainId = (feed as { chain_id?: number }).chain_id ?? 0;
        if (chainId === 0) return false;
        if (!chain) return true;
        const targetChainId = BLOCKCHAIN_TO_CHAIN_ID[chain] ?? 0;
        return chainId === targetChainId;
      });
    }

    // The curated static list is only a degraded-mode fallback when the
    // registry could not be read. A successful registry read with no active
    // feed is authoritative: discovery may have deliberately deactivated or
    // excluded that provider. Falling back merely
    // because a provider has an empty list would silently undo fail-closed
    // discovery and reintroduce an unverified source into live evaluation.
    // A concrete, DB-verified active feed on the queried chain may still
    // override a stale static list so legitimately sponsored feeds are not
    // silently dropped from consensus / pre-trade quorum.
    try {
      const client = getDefaultFactory().getClient(provider);
      if (
        (client.isSymbolSupported(baseSymbol, chain) && (hasActiveFeed || feedRegistry.errored)) ||
        hasSpecificChainFeed
      ) {
        providers.push(provider);
      }
    } catch {
      // Provider cannot be instantiated or does not expose symbol support.
    }
  }

  return providers;
}

interface FetchProviderPriceResult {
  retrievedAt?: number;
  fetchDurationMs?: number;
  provider: OracleProvider;
  priceData?: PriceData;
  status: 'success' | 'unsupported' | 'error';
  errorMessage?: string;
}

async function readProviderPrice(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): Promise<FetchProviderPriceResult> {
  const startedAt = performance.now();
  const duration = () => Math.round(performance.now() - startedAt);
  try {
    const priceData = await fetchPriceWithDatabase(provider, symbol, chain, true, false);
    return {
      provider,
      priceData,
      retrievedAt: Date.now(),
      fetchDurationMs: duration(),
      status: 'success',
    };
  } catch (error) {
    if (error instanceof UnsupportedSymbolError) {
      return { provider, status: 'unsupported', fetchDurationMs: duration() };
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`Consensus fetch failed for ${provider}/${symbol}`, { errorMessage });
    return { provider, status: 'error', errorMessage, fetchDurationMs: duration() };
  }
}

function fetchProviderPrice(provider: OracleProvider, symbol: string, chain?: Blockchain) {
  const key = JSON.stringify([provider, symbol, chain ?? null]);
  const existing = pendingPrices.get(key);
  if (existing) return existing;
  const pending = readProviderPrice(provider, symbol, chain).finally(() => {
    pendingPrices.delete(key);
  });
  pendingPrices.set(key, pending);
  return pending;
}

function calculateDataAgeSeconds(priceData: PriceData): number | null {
  // Delegate to the shared resolver so consensus + snapshot + pre-trade all use
  // ONE definition of "oracle true age".
  return resolveOracleAgeSeconds(priceData);
}

// SEMANTIC CHANGE (B3): historically this returned ~0 for live fetches because it
// used ingestionTimestamp (which live fetches set to now()). Now it returns the
// ORACLE's true age. Downstream callers that now correctly discount stale data:
//   - consensusPriceService.buildProviderPrice -> ConsensusProviderPrice.dataAgeSeconds
//     (drives isStale + the consensus freshness guard in consensusPrice.ts)
//   - consensusPrice.weighted_median freshness weight (was blindingly 1.0)
//   - reputationService.calculateAndStore -> calculateConsensusPrice input (its
//     consensus now weights stale feeds down instead of treating them as fresh)
// Callers that were already correct and are UNCHANGED: riskMetrics/riskIndicators
// and crossChainComparison compute age from oracle.timestamp directly, so they
// never relied on the broken clock and need no update.

function buildProviderPrice(
  result: FetchProviderPriceResult,
  consensusPrice: number,
  excludedProviders: string[],
  reputations: Map<OracleProvider, number>
): ConsensusProviderPrice {
  // consensusPrice is used to compute per-provider deviationPct and effective-staleness.
  const priceData = result.priceData;
  const price = priceData?.price ?? 0;
  const dataAgeSeconds = priceData ? calculateDataAgeSeconds(priceData) : null;
  const deviationPct =
    price > 0 && consensusPrice > 0 ? ((price - consensusPrice) / consensusPrice) * 100 : null;

  // Consensus-aware effective staleness: old oracle-true age AND the price
  // diverges from the fresh consensus (>2%). A stale timestamp with a price in
  // consensus (API3-style timestamp anomaly) is NOT flagged stale.
  const isStale =
    dataAgeSeconds !== null &&
    dataAgeSeconds >= FRESHNESS_STALE_AGE_SECONDS &&
    price > 0 &&
    consensusPrice > 0 &&
    Math.abs(price - consensusPrice) / consensusPrice > FRESHNESS_STALE_DIVERGENCE_PCT / 100;

  return {
    provider: result.provider,
    symbol: priceData?.symbol ?? '',
    chain: priceData?.chain,
    price,
    deviationPct,
    isOutlier: excludedProviders.includes(result.provider),
    confidence: priceData?.confidence ?? null,
    timestamp: priceData?.timestamp ?? Date.now(),
    retrievedAt: result.retrievedAt,
    fetchDurationMs: result.fetchDurationMs,
    timestampProvenance:
      !priceData || dataAgeSeconds === null
        ? 'unknown'
        : typeof priceData.dataAge === 'number' && priceData.dataAge >= 0
          ? 'provider_age'
          : 'provider_timestamp',
    dataAgeSeconds,
    source: priceData?.source,
    verification: priceData?.verification,
    verificationLevel: priceData?.verificationLevel,
    countsTowardOracleQuorum: priceData?.countsTowardOracleQuorum !== false,
    reputationScore: reputations.get(result.provider) ?? null,
    status: result.status,
    isStale,
    errorMessage: result.errorMessage,
  };
}

function pickRecommendedProvider(
  successfulPrices: ConsensusProviderPrice[]
): OracleProvider | null {
  if (successfulPrices.length === 0) return null;

  const scored = successfulPrices
    .filter(
      (p) => p.status === 'success' && p.price > 0 && !p.isOutlier && p.countsTowardOracleQuorum
    )
    .map((p) => {
      const deviationScore =
        p.deviationPct === null ? 0 : Math.max(0, 1 - Math.abs(p.deviationPct) / 1); // 1% deviation = 0
      const reputationScore = (p.reputationScore ?? 75) / 100;
      const freshnessScore =
        p.dataAgeSeconds === null ? 0.8 : Math.max(0, 1 - p.dataAgeSeconds / 600);
      const confidenceScore = p.confidence ?? 0.75;
      const score =
        deviationScore * 0.35 +
        reputationScore * 0.3 +
        freshnessScore * 0.2 +
        confidenceScore * 0.15;
      return { provider: p.provider, score };
    });

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].provider;
}

export async function getConsensusPrice(
  symbol: string,
  chain?: string,
  method?: ConsensusMethod,
  targetProviders?: readonly OracleProvider[],
  options: { allowUnavailable?: boolean } = {}
): Promise<ConsensusPriceResponse> {
  const baseSymbol = normalizeSymbol(symbol);
  const resolvedChain = resolveChain(chain);

  const [prices, reputationsList] = await Promise.all([
    (async () => {
      const resolvedProviders = await resolveProvidersForSymbol(baseSymbol, resolvedChain);
      const requestedProviders =
        targetProviders && targetProviders.length > 0 ? new Set(targetProviders) : null;
      const providers = requestedProviders
        ? resolvedProviders.filter((provider) => requestedProviders.has(provider))
        : resolvedProviders;
      const fetchResults = await mapWithConcurrency(
        providers,
        CONSENSUS_FETCH_CONCURRENCY,
        (provider) => fetchProviderPrice(provider, baseSymbol, resolvedChain)
      );
      return { providers, fetchResults };
    })(),
    reputationService.getReputations(),
  ]);
  const { providers, fetchResults } = prices;

  const reputationScoreMap = new Map<OracleProvider, number>();
  for (const rep of reputationsList) {
    reputationScoreMap.set(rep.provider, rep.overall_score);
  }

  if (providers.length === 0 && !options.allowUnavailable) {
    throw UnsupportedSymbolError.create(baseSymbol, [], undefined);
  }

  const successfulInputs = fetchResults
    .filter((r): r is FetchProviderPriceResult & { priceData: PriceData } =>
      Boolean(
        r.status === 'success' &&
        r.priceData &&
        r.priceData.price > 0 &&
        r.priceData.countsTowardOracleQuorum !== false
      )
    )
    .map((r) => ({
      provider: r.provider,
      price: r.priceData.price,
      timestamp: r.priceData.timestamp,
      ingestionTimestamp: r.priceData.ingestionTimestamp,
      dataAgeSeconds: calculateDataAgeSeconds(r.priceData) ?? undefined,
      confidence: r.priceData.confidence ?? 0.8,
      confidenceInterval: r.priceData.confidenceInterval,
    }));

  if (successfulInputs.length === 0 && options.allowUnavailable) {
    return {
      symbol: baseSymbol,
      chain: resolvedChain,
      consensusPrice: 0,
      method: method ?? 'weighted_median',
      recommendedMethod: 'weighted_median',
      confidence: 0,
      confidenceLevel: 'very_low',
      agreement: 0,
      participantCount: 0,
      excludedCount: providers.length,
      excludedProviders: [...providers],
      priceRange: { min: 0, max: 0 },
      methodResults: { median: 0, trimmed_mean: 0, weighted_median: 0, iqr_filtered: 0 },
      providers: fetchResults.map((result) =>
        buildProviderPrice(result, 0, providers, reputationScoreMap)
      ),
      recommendedProvider: null,
    };
  }

  if (successfulInputs.length === 0) {
    if (fetchResults.every((result) => result.status === 'unsupported')) {
      throw UnsupportedSymbolError.create(baseSymbol, [], undefined);
    }

    const failures = fetchResults
      .filter((result) => result.status === 'error')
      .map((result) => `${result.provider}: ${result.errorMessage ?? 'unknown error'}`);
    throw new InternalError(`All configured oracle price fetches failed for ${baseSymbol}`, {
      operation: 'getConsensusPrice',
      component: 'consensus-price-service',
      originalError: failures.join('; ') || 'No provider returned a valid positive price',
    });
  }

  const consensus = calculateConsensusPrice(
    successfulInputs,
    method,
    `${baseSymbol}/USD`,
    Date.now()
  );

  const quorumExcludedProviders = fetchResults
    .filter(
      (result) =>
        result.status === 'success' && result.priceData?.countsTowardOracleQuorum === false
    )
    .map((result) => result.provider);
  const excludedProviders = [
    ...new Set([...consensus.excludedProviders, ...quorumExcludedProviders]),
  ];

  const providerPrices = fetchResults.map((result) =>
    buildProviderPrice(result, consensus.price, excludedProviders, reputationScoreMap)
  );

  const recommendedProvider = pickRecommendedProvider(providerPrices);

  return {
    symbol: baseSymbol,
    chain: resolvedChain,
    consensusPrice: consensus.price,
    method: consensus.method,
    recommendedMethod: consensus.recommendedMethod,
    confidence: consensus.confidence,
    confidenceLevel: consensus.confidenceLevel,
    agreement: consensus.agreement,
    participantCount: consensus.participantCount,
    excludedCount: excludedProviders.length,
    excludedProviders,
    priceRange: consensus.priceRange,
    methodResults: consensus.methodResults,
    providers: providerPrices,
    recommendedProvider,
  };
}
