'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { z } from 'zod';

import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { parseApiEnvelope, requireApiData } from '@/lib/api/client/responseValidation';
import { oracleColors } from '@/lib/constants';
import { DASHBOARD_ASSETS } from '@/lib/home/dashboardConstants';
import type { DashboardPriceItem, ServerDashboardData } from '@/lib/home/dashboardData';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { roundTo } from '@/lib/utils/format';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import { AssetTable } from './AssetTable';
import { ConsensusCore } from './ConsensusCore';
import { LiveStatusStrip } from './LiveStatusStrip';
import { OracleHealthGrid } from './OracleHealthGrid';

import type { AssetConsensusData } from './types';

const PriceDataSchema: z.ZodType<PriceData> = z
  .object({
    symbol: z.string(),
    price: z.number(),
    timestamp: z.number(),
    provider: z.nativeEnum(OracleProvider),
    chain: z.nativeEnum(Blockchain).optional(),
  })
  .passthrough();

const DashboardPriceItemSchema: z.ZodType<DashboardPriceItem> = z.object({
  provider: z.string(),
  symbol: z.string(),
  price: PriceDataSchema.nullable(),
  error: z.string().nullable(),
});

const OracleReputationSchema: z.ZodType<OracleReputation> = z.object({
  provider: z.nativeEnum(OracleProvider),
  overall_score: z.number(),
  accuracy_score: z.number(),
  uptime_percentage: z.number(),
  avg_latency_ms: z.number(),
  avg_deviation_pct: z.number(),
  reliability_score: z.number(),
  freshness_score: z.number(),
  total_queries: z.number(),
  failed_queries: z.number(),
  supported_symbols_count: z.number(),
  supported_chains_count: z.number(),
  last_calculated_at: z.string().nullable(),
});

const ServerDashboardDataSchema: z.ZodType<ServerDashboardData> = z.object({
  prices: z.array(DashboardPriceItemSchema),
  fetchedAt: z.number(),
  hasError: z.boolean(),
  mainOracles: z.array(z.nativeEnum(OracleProvider)),
  reputations: z.array(OracleReputationSchema),
});

async function fetchDashboardSnapshot(signal?: AbortSignal): Promise<ServerDashboardData> {
  const response = await fetch('/api/home/dashboard', { signal });
  if (!response.ok) throw new Error('Failed to fetch dashboard data');
  const payload = parseApiEnvelope(await response.json(), 'Dashboard response');
  if (!payload.success) throw new Error('Dashboard response reported failure');
  return requireApiData(payload, ServerDashboardDataSchema, 'Dashboard response');
}

function computeAssetData(
  results: DashboardPriceItem[],
  symbol: string,
  totalProviders: number
): AssetConsensusData {
  const validPrices = results
    .filter((result) => result.symbol === symbol && result.price !== null && result.price.price > 0)
    .map((result) => ({
      provider: result.provider as OracleProvider,
      price: result.price!.price,
      timestamp: result.price!.timestamp,
    }));

  if (validPrices.length === 0) {
    return {
      symbol,
      consensusPrice: 0,
      priceRange: { min: 0, max: 0, spreadPercent: 0 },
      providerCount: 0,
      totalProviders,
      lastUpdatedAt: 0,
      sources: [],
    };
  }

  const prices = validPrices.map((price) => price.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const spreadPercent = avgPrice > 0 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0;
  const consensus = calculateConsensusPrice(validPrices, 'median', symbol);

  return {
    symbol,
    consensusPrice: consensus.price,
    priceRange: { min: minPrice, max: maxPrice, spreadPercent: roundTo(spreadPercent, 4) },
    providerCount: validPrices.length,
    totalProviders,
    lastUpdatedAt: Math.max(...validPrices.map((price) => price.timestamp)),
    sources: validPrices.map((price) => ({
      ...price,
      color: oracleColors[price.provider] ?? '#888888',
    })),
  };
}

function HomeLiveDashboardContent({ initialData }: { initialData: ServerDashboardData }) {
  const [now, setNow] = useState(initialData.fetchedAt);
  const [dashboardData, setDashboardData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(initialData.prices.length === 0);
  const lastFetchedAt = useRef(initialData.fetchedAt);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const clockTimer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(clockTimer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      controller?.abort();
      controller = new AbortController();
      try {
        const nextData = await fetchDashboardSnapshot(controller.signal);
        if (!active) return;
        lastFetchedAt.current = nextData.fetchedAt;
        setDashboardData(nextData);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          // Keep the last complete snapshot visible during transient failures.
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchedAt.current >= 60_000) {
        void refresh();
      }
    };

    if (initialData.prices.length === 0 || initialData.hasError) void refresh();
    const refreshTimer = window.setInterval(() => void refresh(), 60_000);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(refreshTimer);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [initialData.hasError, initialData.prices.length]);

  const currentData = dashboardData;
  const results = currentData.prices;
  const mainOracles = currentData.mainOracles;
  const assetData = useMemo(
    () => DASHBOARD_ASSETS.map((symbol) => computeAssetData(results, symbol, mainOracles.length)),
    [results, mainOracles.length]
  );
  const activeProviders = useMemo(
    () =>
      new Set(results.filter((result) => result.price !== null).map((result) => result.provider))
        .size,
    [results]
  );
  const avgSpread = useMemo(() => {
    const spreads = assetData
      .filter((asset) => asset.priceRange.spreadPercent > 0)
      .map((asset) => asset.priceRange.spreadPercent);
    return spreads.length > 0
      ? spreads.reduce((sum, spread) => sum + spread, 0) / spreads.length
      : 0;
  }, [assetData]);
  const healthyCount = assetData.filter(
    (asset) => asset.priceRange.spreadPercent <= 0.5 && asset.providerCount > 0
  ).length;
  const lastObservedAt = Math.max(0, ...assetData.map((asset) => asset.lastUpdatedAt));

  return (
    <>
      <section id="live-evidence" className="home-chapter scroll-mt-20 py-16 sm:py-20 lg:py-28">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <p className="home-kicker">Source evidence / 01</p>
          <div>
            <h2 className="home-section-title">Look at the sources, not only the result.</h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
              A price consensus is more useful when its spread, provider coverage, and observation
              time are visible at the same moment.
            </p>
          </div>
        </div>
        <LiveStatusStrip
          activeProviders={activeProviders}
          totalProviders={mainOracles.length}
          avgSpread={avgSpread}
          healthyCount={healthyCount}
          totalAssets={DASHBOARD_ASSETS.length}
          lastObservedAt={lastObservedAt}
          now={now}
          updateInterval="60s"
        />
        <div className="mt-6">
          <ConsensusCore assets={assetData} />
        </div>
        <div className="mt-6">
          <AssetTable assets={assetData} isLoading={isLoading} now={now} />
        </div>
      </section>

      <section className="home-chapter border-t border-slate-900/10 py-16 sm:py-20 lg:py-28">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <p className="home-kicker">Network behaviour / 02</p>
          <div>
            <h2 className="home-section-title">
              The network should be as observable as the price.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
              Review provider health, coverage, and deviation context before you let a feed inform a
              critical decision.
            </p>
          </div>
        </div>
        <OracleHealthGrid
          now={now}
          reputations={currentData.reputations}
          isLoading={isLoading && currentData.reputations.length === 0}
          displayLimit={5}
        />
      </section>
    </>
  );
}

export function HomeLiveDashboard({ initialData }: { initialData: ServerDashboardData }) {
  return <HomeLiveDashboardContent initialData={initialData} />;
}
