'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { oracleColors } from '@/lib/constants';
import { DASHBOARD_ASSETS } from '@/lib/home/dashboardData';
import type { DashboardPriceItem, ServerDashboardData } from '@/lib/home/dashboardData';
import { type OracleProvider } from '@/types/oracle';

import { AssetTable } from './AssetTable';
import { FeatureGrid } from './FeatureGrid';
import { HeroSection } from './HeroSection';
import { HomeApiTeaser } from './HomeApiTeaser';
import { LiveStatusStrip } from './LiveStatusStrip';
import { OracleHealthGrid } from './OracleHealthGrid';
import { UseCaseBanner } from './UseCaseBanner';

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
  queries: Array<{ provider: OracleProvider; symbol: string }>
): Promise<DashboardPriceItem[]> {
  if (queries.length === 0) return [];

  const response = await fetch('/api/oracles/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
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
    queryFn: () => fetchDashboardBatch(queries),
    initialData: initialPrices.length > 0 ? initialPrices : undefined,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 1,
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
      spreadPercent: Number(spreadPercent.toFixed(4)),
    },
    providerCount: validPrices.length,
    totalProviders,
    lastUpdatedAt: latestTimestamp,
    sources,
  };
}

export default function DashboardContent({ initialData }: DashboardContentProps) {
  const mainOracles = initialData.mainOracles;
  const totalProviders = mainOracles.length;

  const { data: batchResults, isLoading } = useDashboardPrices(initialData.prices, mainOracles);

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
    <div className="min-h-screen bg-[#f8fafc]">
      <HeroSection />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 space-y-12 lg:space-y-20">
        {/* Risk story hook */}
        <UseCaseBanner />

        {/* Core feature entry points */}
        <FeatureGrid />

        {/* Live status strip */}
        <LiveStatusStrip
          activeProviders={activeProviders}
          totalProviders={totalProviders}
          avgSpread={avgSpread}
          healthyCount={healthyCount}
          totalAssets={DASHBOARD_ASSETS.length}
          updateInterval="30s"
        />

        {/* Cross-oracle consensus price table */}
        <AssetTable assets={assetData} isLoading={isLoading} />

        {/* Developer API teaser */}
        <HomeApiTeaser />

        {/* Oracle network health and reputation */}
        <OracleHealthGrid />

        {/* Transparency disclaimer */}
        <div className="text-center">
          <p className="inline-flex items-center gap-2 text-xs text-slate-400 px-4 py-2 rounded-full bg-white border border-slate-100 shadow-sm">
            Prices are aggregated for transparency. Verify critical values on-chain before
            execution.
          </p>
        </div>
      </div>
    </div>
  );
}
