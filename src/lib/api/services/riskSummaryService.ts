/**
 * @fileoverview Risk summary service
 * Computes composite risk metrics for a symbol across selected providers.
 */

import { calculateRiskMetrics, type RiskMetrics } from '@/lib/analytics/riskMetrics';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { extractBaseSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import { getProviderDefaults } from '@/lib/oracles/utils/performanceMetricsConfig';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

const logger = createLogger('risk-summary-service');

const FETCH_CONCURRENCY = 6;
const MAX_PERIOD_HOURS = 8760;

export interface ProviderPriceResult {
  provider: OracleProvider;
  price?: number;
  timestamp?: number;
  chain?: Blockchain;
  error?: string;
}

interface SuccessfulPriceResult {
  provider: OracleProvider;
  price: number;
  timestamp: number;
  chain?: Blockchain;
}

export interface RiskSummaryResponse {
  symbol: string;
  providers: OracleProvider[];
  periodHours: number;
  riskMetrics: RiskMetrics;
  providerErrors: ProviderPriceResult[];
}

interface CurrentPriceResult {
  provider: OracleProvider;
  priceData?: PriceData;
  error?: string;
}

async function fetchCurrentPrices(
  symbol: string,
  providers: OracleProvider[]
): Promise<CurrentPriceResult[]> {
  return mapWithConcurrency(providers, FETCH_CONCURRENCY, async (provider) => {
    try {
      const priceData = await fetchPriceWithDatabase(provider, symbol, undefined, true);
      return { provider, priceData };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to fetch current price for risk summary: ${provider}/${symbol}`, {
        error: message,
      });
      return { provider, error: message };
    }
  });
}

async function fetchHourlyHistories(
  symbol: string,
  providers: OracleProvider[],
  periodHours: number
): Promise<{
  priceHistoriesByProvider: Map<string, number[]>;
  priceHistoryTimestampsByProvider: Map<string, number[]>;
}> {
  const priceHistoriesByProvider = new Map<string, number[]>();
  const priceHistoryTimestampsByProvider = new Map<string, number[]>();

  if (periodHours <= 0 || periodHours > MAX_PERIOD_HOURS) {
    return { priceHistoriesByProvider, priceHistoryTimestampsByProvider };
  }

  const baseSymbol = extractBaseSymbol(symbol).toUpperCase();
  const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString();

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('hourly_price_snapshots')
      .select('provider, snapshot_hour, price')
      .eq('symbol', baseSymbol)
      .in('provider', providers)
      .eq('is_success', true)
      .gte('snapshot_hour', cutoff)
      .order('snapshot_hour', { ascending: true });

    if (error) {
      logger.error('Failed to fetch hourly price snapshots for risk summary', error);
      return { priceHistoriesByProvider, priceHistoryTimestampsByProvider };
    }

    for (const row of data ?? []) {
      const list = priceHistoriesByProvider.get(row.provider) ?? [];
      list.push(Number(row.price));
      priceHistoriesByProvider.set(row.provider, list);

      const tsList = priceHistoryTimestampsByProvider.get(row.provider) ?? [];
      tsList.push(new Date(row.snapshot_hour).getTime());
      priceHistoryTimestampsByProvider.set(row.provider, tsList);
    }
  } catch (error) {
    logger.error(
      'Unexpected error fetching hourly price snapshots for risk summary',
      error instanceof Error ? error : new Error(String(error))
    );
  }

  return { priceHistoriesByProvider, priceHistoryTimestampsByProvider };
}

export async function getRiskSummary(
  symbol: string,
  providers: OracleProvider[],
  periodHours: number
): Promise<RiskSummaryResponse> {
  const [currentResults, { priceHistoriesByProvider, priceHistoryTimestampsByProvider }] =
    await Promise.all([
      fetchCurrentPrices(symbol, providers),
      fetchHourlyHistories(symbol, providers, periodHours),
    ]);

  const successfulPrices: SuccessfulPriceResult[] = [];
  const providerErrors: ProviderPriceResult[] = [];

  for (const result of currentResults) {
    if (result.priceData) {
      successfulPrices.push({
        provider: result.provider,
        price: result.priceData.price,
        timestamp: result.priceData.timestamp,
        chain: result.priceData.chain,
      });
    } else {
      providerErrors.push({
        provider: result.provider,
        error: result.error ?? 'Unknown error',
      });
    }
  }

  if (successfulPrices.length < 2) {
    throw new Error('INSUFFICIENT_DATA');
  }

  // Build oracle market data and auxiliary inputs from provider defaults.
  const oracleData = successfulPrices.map((p) => {
    const defaults = getProviderDefaults(p.provider);
    return {
      name: p.provider,
      share: defaults.marketShare,
      color: '#888888',
      tvs: defaults.tvs,
      tvsValue: defaults.tvsValue,
      chains: defaults.chains,
      protocols: defaults.protocols,
      avgLatency: defaults.responseTime,
      accuracy: defaults.accuracy,
      updateFrequency: defaults.updateFrequency,
      change24h: 0,
      change7d: 0,
      change30d: 0,
    };
  });

  // Ensure every successful provider has at least one history point (the
  // current price) so volatility/correlation calculations never see an empty
  // array.
  const enrichedPriceHistories = new Map(priceHistoriesByProvider);
  for (const p of successfulPrices) {
    if (
      !enrichedPriceHistories.has(p.provider) ||
      enrichedPriceHistories.get(p.provider)!.length === 0
    ) {
      enrichedPriceHistories.set(p.provider, [p.price]);
    }
  }

  const oracleTimestamps = successfulPrices.map((p) => ({
    name: p.provider,
    timestamp: p.timestamp ?? Date.now(),
  }));

  const manipulationResistanceData = successfulPrices.map((p) => {
    const defaults = getProviderDefaults(p.provider);
    return {
      name: p.provider,
      dataSources: defaults.dataSources,
      updateFrequencySeconds: defaults.updateFrequency,
      hasOnChainVerification: defaults.hasOnChainVerification,
      aggregationMethod: defaults.aggregationMethod,
    };
  });

  const sharedDependencyData = successfulPrices.map((p) => {
    const defaults = getProviderDefaults(p.provider);
    return {
      name: p.provider,
      primaryDataSources: defaults.primaryDataSources,
    };
  });

  const riskMetrics = calculateRiskMetrics({
    oracleData,
    priceHistoriesByProvider: enrichedPriceHistories,
    priceHistoryTimestampsByProvider,
    oracleTimestamps,
    manipulationResistanceData,
    sharedDependencyData,
  });

  return {
    symbol: extractBaseSymbol(symbol).toUpperCase(),
    providers: successfulPrices.map((p) => p.provider),
    periodHours,
    riskMetrics,
    providerErrors,
  };
}
