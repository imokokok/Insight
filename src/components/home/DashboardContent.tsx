'use client';

import { useMemo } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, Award, GitCompare, Shield, Link2, Search } from 'lucide-react';

import { CompactStatCard } from '@/components/ui';
import { useReputations } from '@/hooks/data/useReputations';
import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { oracleColors, providerNames } from '@/lib/constants';
import { OracleProvider, type PriceData } from '@/types/oracle';

import { useSearch } from './hooks/useSearch';

interface BatchResultItem {
  provider: string;
  symbol: string;
  price: PriceData | null;
  error: string | null;
}

interface AssetConsensusData {
  symbol: string;
  consensusPrice: number;
  priceRange: { min: number; max: number; spreadPercent: number };
  providerCount: number;
  totalProviders: number;
  sources: Array<{ provider: OracleProvider; price: number; color: string }>;
}

const DASHBOARD_ASSETS = ['BTC', 'ETH', 'USDT', 'SOL'];
const MAIN_ORACLES: OracleProvider[] = [
  OracleProvider.CHAINLINK,
  OracleProvider.PYTH,
  OracleProvider.REDSTONE,
  OracleProvider.API3,
  OracleProvider.DIA,
];

function getDashboardQueries() {
  const queries: Array<{ provider: OracleProvider; symbol: string }> = [];
  for (const symbol of DASHBOARD_ASSETS) {
    for (const provider of MAIN_ORACLES) {
      queries.push({ provider, symbol });
    }
  }
  return queries;
}

async function fetchDashboardBatch(
  queries: Array<{ provider: OracleProvider; symbol: string }>
): Promise<BatchResultItem[]> {
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

function useDashboardPrices() {
  const queries = useMemo(() => getDashboardQueries(), []);

  return useQuery<BatchResultItem[], Error>({
    queryKey: ['dashboard-prices', queries.map((q) => `${q.provider}-${q.symbol}`).join(',')],
    queryFn: () => fetchDashboardBatch(queries),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

function computeAssetData(results: BatchResultItem[], symbol: string): AssetConsensusData {
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

function formatPrice(price: number, symbol: string): string {
  if (price === 0) return '—';
  if (symbol === 'USDT' || symbol === 'USDC') {
    return `$${price.toFixed(4)}`;
  }
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toFixed(2)}`;
}

function formatSpread(percent: number): string {
  if (percent === 0) return '—';
  if (percent < 0.01) return '<0.01%';
  return `${percent.toFixed(2)}%`;
}

function SearchBar() {
  const router = useRouter();
  const { searchQuery, setSearchQuery, searchResults } = useSearch();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().toUpperCase();
    if (trimmed) {
      // Check if it's a direct symbol match
      const directMatch = searchResults.find(
        (r) => r.item.symbol === trimmed || r.item.symbol === trimmed.replace(/USD$/i, '')
      );
      if (directMatch) {
        router.push(`/price-query?symbol=${directMatch.item.symbol}`);
      } else {
        router.push(`/cross-oracle?symbol=${trimmed}`);
      }
      setSearchQuery('');
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-lg">
      <div className="relative flex items-center bg-white rounded-lg border border-gray-200 shadow-sm hover:border-gray-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search BTC, ETH, oracle..."
          className="flex-1 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-transparent border-0 outline-none min-w-0"
        />
        <button
          type="submit"
          className="mr-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}

function ConsensusPriceCard({ data }: { data: AssetConsensusData }) {
  const isLoading = data.consensusPrice === 0 && data.providerCount === 0;
  const hasDivergence = data.priceRange.spreadPercent > 0.5;

  return (
    <Link
      href={`/cross-oracle?symbol=${data.symbol}`}
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">{data.symbol}</span>
          <span className="text-xs text-gray-400">/ USD</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isLoading ? (
            <span className="text-xs text-gray-400">Loading...</span>
          ) : (
            <>
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${hasDivergence ? 'bg-amber-500' : 'bg-emerald-500'}`}
              >
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 [animation-duration:2s] ${hasDivergence ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </span>
              <span className="text-xs font-medium text-gray-500">
                {data.providerCount}/{data.totalProviders} oracles
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mb-3">
        {isLoading ? (
          <div className="h-8 bg-gray-100 rounded animate-pulse w-32" />
        ) : (
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatPrice(data.consensusPrice, data.symbol)}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Spread</span>
          <span className={`font-medium ${hasDivergence ? 'text-amber-600' : 'text-emerald-600'}`}>
            {formatSpread(data.priceRange.spreadPercent)}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Range</span>
          <span className="font-medium text-gray-700">
            {data.priceRange.min > 0
              ? `${formatPrice(data.priceRange.min, data.symbol)} - ${formatPrice(data.priceRange.max, data.symbol)}`
              : '—'}
          </span>
        </div>

        <div className="flex items-center gap-1 pt-1">
          {data.sources.slice(0, 5).map((s) => (
            <span
              key={s.provider}
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: s.color }}
              title={`${providerNames[s.provider]}: ${formatPrice(s.price, data.symbol)}`}
            />
          ))}
          {data.sources.length > 5 && (
            <span className="text-[10px] text-gray-400 ml-0.5">+{data.sources.length - 5}</span>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:text-blue-700">
        Compare
        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

function OracleHealthStrip() {
  const { data: reputationData, isLoading } = useReputations();
  const reputations = reputationData?.data ?? [];

  const allProviders: OracleProvider[] = [
    OracleProvider.CHAINLINK,
    OracleProvider.PYTH,
    OracleProvider.REDSTONE,
    OracleProvider.API3,
    OracleProvider.DIA,
    OracleProvider.SUPRA,
    OracleProvider.TWAP,
    OracleProvider.FLARE,
    OracleProvider.REFLECTOR,
    OracleProvider.WINKLINK,
  ];

  const statusMap = useMemo(() => {
    const map = new Map<string, { score: number; status: 'healthy' | 'degraded' | 'down' }>();
    for (const r of reputations) {
      const score = r.overall_score;
      let status: 'healthy' | 'degraded' | 'down';
      if (score >= 80) status = 'healthy';
      else if (score >= 50) status = 'degraded';
      else status = 'down';
      map.set(r.provider, { score, status });
    }
    return map;
  }, [reputations]);

  const getStatus = (provider: OracleProvider) => {
    const rep = statusMap.get(provider);
    if (rep) return rep;
    if (isLoading) return { score: 0, status: 'healthy' as const };
    return { score: 0, status: 'down' as const };
  };

  const statusColors = {
    healthy: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    down: 'bg-red-500',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900">Oracle Network Health</h3>
        </div>
        <Link
          href="/reputation"
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View Directory
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
        {allProviders.map((provider) => {
          const { score, status } = getStatus(provider);

          return (
            <Link
              key={provider}
              href={`/reputation/${provider}`}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />
              <img
                src={`/logos/oracles/${provider}.svg`}
                alt={providerNames[provider] ?? provider}
                className="w-6 h-6 object-contain"
                loading="lazy"
              />
              <span className="text-[10px] font-medium text-gray-600 group-hover:text-gray-900 capitalize truncate max-w-full">
                {provider}
              </span>
              {score > 0 && <span className="text-[9px] text-gray-400">{score.toFixed(0)}</span>}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-gray-500">Healthy (80+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[10px] text-gray-500">Degraded</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-gray-500">Down</span>
        </div>
      </div>
    </div>
  );
}

function QuickLinks() {
  const links = [
    {
      title: 'Cross-Oracle',
      description: 'Compare prices across protocols',
      href: '/cross-oracle',
      icon: GitCompare,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Cross-Chain',
      description: 'Analyze chain performance',
      href: '/cross-chain',
      icon: Link2,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
    {
      title: 'Reputation',
      description: 'Oracle rankings & scores',
      href: '/reputation',
      icon: Award,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      title: 'Safety Check',
      description: 'Position risk calculator',
      href: '/safety-check',
      icon: Shield,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.title}
            href={link.href}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div
              className={`w-9 h-9 rounded-lg ${link.bg} flex items-center justify-center flex-shrink-0`}
            >
              <Icon className={`w-4 h-4 ${link.color}`} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {link.title}
              </div>
              <div className="text-[11px] text-gray-500 truncate">{link.description}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function DashboardContent() {
  const { data: batchResults, isLoading: pricesLoading } = useDashboardPrices();

  const assetData = useMemo(() => {
    if (!batchResults) {
      return DASHBOARD_ASSETS.map((symbol) => computeAssetData([], symbol));
    }
    return DASHBOARD_ASSETS.map((symbol) => computeAssetData(batchResults, symbol));
  }, [batchResults]);

  const activeProviders = useMemo(() => {
    if (!batchResults) return 0;
    const uniqueProviders = new Set(
      batchResults.filter((r) => r.price !== null).map((r) => r.provider)
    );
    return uniqueProviders.size;
  }, [batchResults]);

  const avgSpread = useMemo(() => {
    const spreads = assetData
      .filter((a) => a.priceRange.spreadPercent > 0)
      .map((a) => a.priceRange.spreadPercent);
    if (spreads.length === 0) return 0;
    return spreads.reduce((a, b) => a + b, 0) / spreads.length;
  }, [assetData]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 [animation-duration:2s]" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-sm font-semibold text-gray-900">Insight Dashboard</span>
              </div>
              <span className="hidden sm:inline text-xs text-gray-400">
                Real-time oracle aggregation
              </span>
            </div>
            <SearchBar />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CompactStatCard
            title="Active Oracles"
            value={pricesLoading ? '—' : `${activeProviders}/${MAIN_ORACLES.length}`}
          />
          <CompactStatCard
            title="Avg Spread"
            value={avgSpread > 0 ? `${avgSpread.toFixed(3)}%` : '—'}
            change={avgSpread > 1 ? { value: avgSpread, percentage: true } : undefined}
          />
          <CompactStatCard title="Consensus Method" value="Median" />
          <CompactStatCard title="Update Interval" value="30s" />
        </div>

        {/* Consensus Price Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Live Consensus Prices</h2>
            <Link
              href="/cross-oracle"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Full Comparison
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {assetData.map((data) => (
              <ConsensusPriceCard key={data.symbol} data={data} />
            ))}
          </div>
        </div>

        {/* Oracle Health */}
        <OracleHealthStrip />

        {/* Quick Links */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <QuickLinks />
        </div>
      </div>
    </div>
  );
}
