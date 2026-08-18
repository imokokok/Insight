import {
  calculateConsensusPrice,
  FRESHNESS_STALE_AGE_SECONDS,
  FRESHNESS_STALE_DIVERGENCE_PCT,
  type ConsensusMethod,
} from '@/lib/analytics/consensusPrice';
import { UnsupportedSymbolError } from '@/lib/errors';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';
import { extractBaseSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain, type PriceData } from '@/types/oracle';

const logger = createLogger('consensus-price-service');

const CONSENSUS_FETCH_CONCURRENCY = 6;

export interface ConsensusProviderPrice {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  price: number;
  deviationPct: number | null;
  isOutlier: boolean;
  confidence: number | null;
  timestamp: number;
  dataAgeSeconds: number | null;
  source?: string;
  verification?: PriceData['verification'];
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
  return extractBaseSymbol(symbol).toUpperCase();
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
  const feedsByProvider = await getAllActiveFeedsByProvider().catch(
    () => new Map<string, unknown[]>()
  );

  const providers: OracleProvider[] = [];

  for (const provider of Object.values(OracleProvider)) {
    let hasActiveFeed = false;
    let hasSpecificChainFeed = false;

    const feeds = feedsByProvider.get(provider);
    if (feeds && feeds.length > 0) {
      hasActiveFeed = feeds.some((feed) => {
        const feedSymbol = extractBaseSymbol((feed as { symbol: string }).symbol).toUpperCase();
        if (feedSymbol !== baseSymbol) return false;
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
        if (feedSymbol !== baseSymbol) return false;
        const chainId = (feed as { chain_id?: number }).chain_id ?? 0;
        if (chainId === 0) return false;
        if (!chain) return true;
        const targetChainId = BLOCKCHAIN_TO_CHAIN_ID[chain] ?? 0;
        return chainId === targetChainId;
      });
    }

    // The curated static list remains authoritative for chain-agnostic
    // (chain_id=0) feeds. A concrete, DB-verified active feed on the queried
    // chain overrides a stale static list so legitimately sponsored feeds are
    // not silently dropped from consensus / pre-trade quorum.
    try {
      const client = getDefaultFactory().getClient(provider);
      if (
        (client.isSymbolSupported(baseSymbol, chain) &&
          (hasActiveFeed || !feeds || feeds.length === 0)) ||
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
  provider: OracleProvider;
  priceData?: PriceData;
  status: 'success' | 'unsupported' | 'error';
  errorMessage?: string;
}

async function fetchProviderPrice(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): Promise<FetchProviderPriceResult> {
  try {
    const priceData = await fetchPriceWithDatabase(provider, symbol, chain, true, false);
    return { provider, priceData, status: 'success' };
  } catch (error) {
    if (error instanceof UnsupportedSymbolError) {
      return { provider, status: 'unsupported' };
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`Consensus fetch failed for ${provider}/${symbol}`, { errorMessage });
    return { provider, status: 'error', errorMessage };
  }
}

function calculateDataAgeSeconds(priceData: PriceData): number | null {
  // Use the oracle's OWN reported update time as the staleness reference.
  // `ingestionTimestamp` is when *we* ingested/cached the row, and live fetches
  // set it to Date.now() — using it previously made every fresh read look
  // 0s old and blinded the pre-trade staleness gate. `priceData.timestamp` is
  // the oracle's real last-update time, so now - timestamp is the true age.
  // (When a client supplies an explicit per-oracle `dataAge`, honor it.)
  if (typeof priceData.dataAge === 'number' && priceData.dataAge >= 0) {
    return priceData.dataAge;
  }
  const refTime = priceData.timestamp;
  if (!refTime || refTime <= 0) return null;
  return Math.max(0, Math.floor((Date.now() - refTime) / 1000));
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
    dataAgeSeconds,
    source: priceData?.source,
    verification: priceData?.verification,
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
    .filter((p) => p.status === 'success' && p.price > 0 && !p.isOutlier)
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
  method?: ConsensusMethod
): Promise<ConsensusPriceResponse> {
  const baseSymbol = normalizeSymbol(symbol);
  const resolvedChain = resolveChain(chain);

  const [providers, reputationsList] = await Promise.all([
    resolveProvidersForSymbol(baseSymbol, resolvedChain),
    reputationService.getReputations(),
  ]);

  const reputationScoreMap = new Map<OracleProvider, number>();
  for (const rep of reputationsList) {
    reputationScoreMap.set(rep.provider, rep.overall_score);
  }

  if (providers.length === 0) {
    throw UnsupportedSymbolError.create(baseSymbol, [], undefined);
  }

  const fetchResults = await mapWithConcurrency(
    providers,
    CONSENSUS_FETCH_CONCURRENCY,
    (provider) => fetchProviderPrice(provider, baseSymbol, resolvedChain)
  );

  const successfulInputs = fetchResults
    .filter((r): r is FetchProviderPriceResult & { priceData: PriceData } =>
      Boolean(r.status === 'success' && r.priceData && r.priceData.price > 0)
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

  const consensus = calculateConsensusPrice(
    successfulInputs,
    method,
    `${baseSymbol}/USD`,
    Date.now()
  );

  const providerPrices = fetchResults.map((result) =>
    buildProviderPrice(result, consensus.price, consensus.excludedProviders, reputationScoreMap)
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
    excludedCount: consensus.excludedCount,
    excludedProviders: consensus.excludedProviders,
    priceRange: consensus.priceRange,
    methodResults: consensus.methodResults,
    providers: providerPrices,
    recommendedProvider,
  };
}
