'use client';

import { useEffect, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { oracleColors } from '@/lib/constants';
import { DASHBOARD_ASSETS } from '@/lib/home/dashboardConstants';
import type { DashboardPriceItem, ServerDashboardData } from '@/lib/home/dashboardData';
import { roundTo } from '@/lib/utils/format';
import { type OracleProvider } from '@/types/oracle';

import { AssetTable } from './AssetTable';
import {
  OracleClosingSection,
  OracleProcessSection,
  OracleQuestionSection,
} from './EditorialNarrative';
import { FeatureGrid } from './FeatureGrid';
import { HeroSection } from './HeroSection';
import { HomeApiTeaser } from './HomeApiTeaser';
import { LiveStatusStrip } from './LiveStatusStrip';
import { OracleHealthGrid } from './OracleHealthGrid';
import { UseCaseBanner } from './UseCaseBanner';
import { VerifiabilityBanner } from './VerifiabilityBanner';

export interface AssetConsensusData {
  symbol: string;
  consensusPrice: number;
  priceRange: { min: number; max: number; spreadPercent: number };
  providerCount: number;
  totalProviders: number;
  lastUpdatedAt: number;
  sources: Array<{ provider: OracleProvider; price: number; timestamp: number; color: string }>;
}

interface DashboardContentProps {
  initialData: ServerDashboardData;
}

async function fetchDashboardBatch(
  queries: Array<{ provider: OracleProvider; symbol: string }>,
  signal?: AbortSignal
): Promise<DashboardPriceItem[]> {
  if (queries.length === 0) return [];

  const response = await fetch('/api/oracles/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }

  const data = await response.json();
  return data.data ?? [];
}

function getDashboardQueries(mainOracles: OracleProvider[]) {
  const queries: Array<{ provider: OracleProvider; symbol: string }> = [];
  for (const symbol of DASHBOARD_ASSETS) {
    for (const provider of mainOracles) {
      queries.push({ provider, symbol });
    }
  }
  return queries;
}

function useDashboardPrices(initialPrices: DashboardPriceItem[], mainOracles: OracleProvider[]) {
  const queries = useMemo(() => getDashboardQueries(mainOracles), [mainOracles]);

  return useQuery<DashboardPriceItem[], Error>({
    queryKey: ['dashboard-prices', queries.map((q) => `${q.provider}-${q.symbol}`).join(',')],
    queryFn: ({ signal }) => fetchDashboardBatch(queries, signal),
    initialData: initialPrices.length > 0 ? initialPrices : undefined,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

function computeAssetData(
  results: DashboardPriceItem[],
  symbol: string,
  totalProviders: number
): AssetConsensusData {
  const validPrices = results
    .filter((r) => r.symbol === symbol && r.price !== null && r.price.price > 0)
    .map((r) => ({
      provider: r.provider as OracleProvider,
      price: r.price!.price,
      timestamp: r.price!.timestamp,
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

  const prices = validPrices.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const spreadPercent = avgPrice > 0 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0;

  const consensusInputs = validPrices.map((p) => ({
    provider: p.provider,
    price: p.price,
    timestamp: p.timestamp,
  }));

  const consensus = calculateConsensusPrice(consensusInputs, 'median', symbol);

  const latestTimestamp = Math.max(...validPrices.map((p) => p.timestamp));

  const sources = validPrices.map((p) => ({
    provider: p.provider,
    price: p.price,
    timestamp: p.timestamp,
    color: oracleColors[p.provider] ?? '#888888',
  }));

  return {
    symbol,
    consensusPrice: consensus.price,
    priceRange: {
      min: minPrice,
      max: maxPrice,
      spreadPercent: roundTo(spreadPercent, 4),
    },
    providerCount: validPrices.length,
    totalProviders,
    lastUpdatedAt: latestTimestamp,
    sources,
  };
}

export default function DashboardContent({ initialData }: DashboardContentProps) {
  const [now, setNow] = useState(initialData.fetchedAt);
  const mainOracles = initialData.mainOracles;
  const totalProviders = mainOracles.length;

  const { data: batchResults, isLoading } = useDashboardPrices(initialData.prices, mainOracles);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  const assetData = useMemo(() => {
    const results = batchResults ?? initialData.prices ?? [];
    return DASHBOARD_ASSETS.map((symbol) => computeAssetData(results, symbol, totalProviders));
  }, [batchResults, initialData.prices, totalProviders]);

  const activeProviders = useMemo(() => {
    const results = batchResults ?? initialData.prices ?? [];
    const uniqueProviders = new Set(results.filter((r) => r.price !== null).map((r) => r.provider));
    return uniqueProviders.size;
  }, [batchResults, initialData.prices]);

  const avgSpread = useMemo(() => {
    const spreads = assetData
      .filter((a) => a.priceRange.spreadPercent > 0)
      .map((a) => a.priceRange.spreadPercent);
    if (spreads.length === 0) return 0;
    return spreads.reduce((a, b) => a + b, 0) / spreads.length;
  }, [assetData]);

  const healthyCount = assetData.filter(
    (a) => a.priceRange.spreadPercent <= 0.5 && a.providerCount > 0
  ).length;

  return (
    <div className="home-canvas min-h-screen bg-[#f8f7f4]">
      <HeroSection />

      <div className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        <OracleQuestionSection />

        <section className="py-16 sm:py-20 lg:py-28">
          <div className="mb-8 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <p className="home-kicker">03 — The evidence</p>
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                Look at the sources, not only the result.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                Live consensus is more useful when its spread, provider coverage, and update time
                are visible at the same moment.
              </p>
            </div>
          </div>
          <LiveStatusStrip
            activeProviders={activeProviders}
            totalProviders={totalProviders}
            avgSpread={avgSpread}
            healthyCount={healthyCount}
            totalAssets={DASHBOARD_ASSETS.length}
            updateInterval="60s"
          />
          <div className="mt-6">
            <AssetTable assets={assetData} isLoading={isLoading} now={now} />
          </div>
        </section>

        <OracleProcessSection />

        <section className="py-16 sm:py-20 lg:py-28">
          <div className="mb-8 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <p className="home-kicker">05 — Live signals</p>
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                The network should be as observable as the price.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                Review provider health, coverage, and deviation context before you let a feed inform
                a critical decision.
              </p>
            </div>
          </div>
          <OracleHealthGrid now={now} />
        </section>

        <section className="border-t border-slate-900/10 py-16 sm:py-20 lg:py-28">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <p className="home-kicker">06 — Make risk actionable</p>
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                Different questions. One clear audit trail.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                Move from price discovery to execution safety with tools designed for protocols,
                operators, developers, and AI agents.
              </p>
            </div>
          </div>
          <FeatureGrid />
          <div className="mt-6">
            <UseCaseBanner />
          </div>
        </section>

        <section className="border-t border-slate-900/10 py-16 sm:py-20 lg:py-28">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <p className="home-kicker">07 — Keep it verifiable</p>
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                Evidence that travels with the decision.
              </h2>
            </div>
          </div>
          <VerifiabilityBanner />
          <div className="mt-6">
            <HomeApiTeaser />
          </div>
        </section>

        <OracleClosingSection />

        <p className="mt-7 text-center text-xs text-slate-500">
          Prices are aggregated for transparency. Verify critical values on-chain before execution.
        </p>
      </div>
    </div>
  );
}
