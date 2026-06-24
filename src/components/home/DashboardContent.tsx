'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Clock, Layers, RefreshCw, ShieldCheck } from 'lucide-react';

import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { oracleColors } from '@/lib/constants';
import { DASHBOARD_ASSETS, MAIN_ORACLES } from '@/lib/home/dashboardData';
import type { DashboardPriceItem, ServerDashboardData } from '@/lib/home/dashboardData';
import { type OracleProvider } from '@/types/oracle';

import { AssetTable } from './AssetTable';
import { FeatureGrid } from './FeatureGrid';
import { HeroSection } from './HeroSection';
import { OracleHealthGrid } from './OracleHealthGrid';

export interface AssetConsensusData {
  symbol: string;
  consensusPrice: number;
  priceRange: { min: number; max: number; spreadPercent: number };
  providerCount: number;
  totalProviders: number;
  sources: Array<{ provider: OracleProvider; price: number; color: string }>;
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

function getDashboardQueries() {
  const queries: Array<{ provider: OracleProvider; symbol: string }> = [];
  for (const symbol of DASHBOARD_ASSETS) {
    for (const provider of MAIN_ORACLES) {
      queries.push({ provider, symbol });
    }
  }
  return queries;
}

function useDashboardPrices(initialPrices: DashboardPriceItem[]) {
  const queries = useMemo(() => getDashboardQueries(), []);

  return useQuery<DashboardPriceItem[], Error>({
    queryKey: ['dashboard-prices', queries.map((q) => `${q.provider}-${q.symbol}`).join(',')],
    queryFn: () => fetchDashboardBatch(queries),
    initialData: initialPrices.length > 0 ? initialPrices : undefined,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

function computeAssetData(results: DashboardPriceItem[], symbol: string): AssetConsensusData {
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
      totalProviders: MAIN_ORACLES.length,
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

  const sources = validPrices.map((p) => ({
    provider: p.provider,
    price: p.price,
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
    totalProviders: MAIN_ORACLES.length,
    sources,
  };
}

interface StatBadgeProps {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: 'neutral' | 'blue' | 'emerald' | 'amber';
}

function StatBadge({ icon: Icon, label, value, tone = 'neutral' }: StatBadgeProps) {
  const toneStyles = {
    neutral: 'bg-white border-gray-200 text-gray-900',
    blue: 'bg-blue-50/50 border-blue-100 text-blue-900',
    emerald: 'bg-emerald-50/50 border-emerald-100 text-emerald-900',
    amber: 'bg-amber-50/50 border-amber-100 text-amber-900',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm ${toneStyles[tone]}`}
    >
      <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        <div className="text-sm font-semibold font-tabular">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardContent({ initialData }: DashboardContentProps) {
  const { data: batchResults, isLoading } = useDashboardPrices(initialData.prices);

  const assetData = useMemo(() => {
    const results = batchResults ?? initialData.prices ?? [];
    return DASHBOARD_ASSETS.map((symbol) => computeAssetData(results, symbol));
  }, [batchResults, initialData.prices]);

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
    <div className="min-h-screen bg-gray-50/50">
      <HeroSection />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Live status bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 [animation-duration:2s]" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </div>
            <span className="text-sm font-medium text-gray-900">Live Dashboard</span>
            <span className="text-xs text-gray-500 hidden sm:inline">Auto-refresh every 30s</span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3">
            <StatBadge
              icon={Layers}
              label="Active Oracles"
              value={`${activeProviders}/${MAIN_ORACLES.length}`}
              tone="blue"
            />
            <StatBadge
              icon={BarChart3}
              label="Avg Spread"
              value={avgSpread > 0 ? `${avgSpread.toFixed(3)}%` : '—'}
              tone={avgSpread > 1 ? 'amber' : 'emerald'}
            />
            <StatBadge
              icon={ShieldCheck}
              label="Healthy Assets"
              value={`${healthyCount}/${DASHBOARD_ASSETS.length}`}
              tone="emerald"
            />
            <StatBadge icon={Clock} label="Update Interval" value="30s" />
          </div>
        </div>

        {/* Asset table */}
        <AssetTable assets={assetData} isLoading={isLoading} />

        {/* Oracle health */}
        <OracleHealthGrid />

        {/* Features */}
        <FeatureGrid />

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-4 pb-2">
          <RefreshCw className="w-3 h-3" />
          <span>
            Prices are aggregated for reference. Verify critical values on-chain before execution.
          </span>
        </div>
      </div>
    </div>
  );
}
