'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { oracleColors } from '@/lib/constants';
import { DASHBOARD_ASSETS } from '@/lib/home/dashboardConstants';
import type { DashboardPriceItem, ServerDashboardData } from '@/lib/home/dashboardData';
import { roundTo } from '@/lib/utils/format';
import { type OracleProvider } from '@/types/oracle';

import { AssetTable } from './AssetTable';
import { LiveStatusStrip } from './LiveStatusStrip';
import { OracleHealthGrid } from './OracleHealthGrid';

import type { AssetConsensusData } from './types';

async function fetchDashboardSnapshot(signal?: AbortSignal): Promise<ServerDashboardData> {
  const response = await fetch('/api/home/dashboard', { signal });
  if (!response.ok) throw new Error('Failed to fetch dashboard data');
  const payload = await response.json();
  return payload.data;
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

    if (initialData.prices.length === 0) void refresh();
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
  }, [initialData.prices.length]);

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

  return (
    <>
      <section className="py-16 sm:py-20 lg:py-28">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <p className="home-kicker">03 — The evidence</p>
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
              Look at the sources, not only the result.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
              Live consensus is more useful when its spread, provider coverage, and update time are
              visible at the same moment.
            </p>
          </div>
        </div>
        <LiveStatusStrip
          activeProviders={activeProviders}
          totalProviders={mainOracles.length}
          avgSpread={avgSpread}
          healthyCount={healthyCount}
          totalAssets={DASHBOARD_ASSETS.length}
          updateInterval="60s"
        />
        <div className="mt-6">
          <AssetTable assets={assetData} isLoading={isLoading} now={now} />
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-28">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <p className="home-kicker">05 — Live signals</p>
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
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
        />
      </section>
    </>
  );
}

export function HomeLiveDashboard({ initialData }: { initialData: ServerDashboardData }) {
  return <HomeLiveDashboardContent initialData={initialData} />;
}
