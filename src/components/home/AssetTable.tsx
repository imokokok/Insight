'use client';

import Link from 'next/link';

import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { providerNames } from '@/lib/constants';

import type { AssetConsensusData } from './DashboardContent';

interface AssetTableProps {
  assets: AssetConsensusData[];
  isLoading: boolean;
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

function getSpreadTrend(spread: number): 'low' | 'medium' | 'high' {
  if (spread <= 0.1) return 'low';
  if (spread <= 0.5) return 'medium';
  return 'high';
}

function SpreadIndicator({ spread }: { spread: number }) {
  const trend = getSpreadTrend(spread);
  const Icon = spread === 0 ? Minus : spread <= 0.1 ? TrendingDown : TrendingUp;
  const colors = {
    low: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    medium: 'text-amber-600 bg-amber-50 border-amber-100',
    high: 'text-rose-600 bg-rose-50 border-rose-100',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[trend]}`}
    >
      <Icon className="w-3 h-3" />
      {formatSpread(spread)}
    </span>
  );
}

function AssetRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200" />
          <div className="space-y-1.5">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-3 w-10 bg-gray-200 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="h-5 w-28 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-4">
        <div className="h-5 w-20 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-4">
        <div className="h-5 w-32 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
      </td>
    </tr>
  );
}

export function AssetTable({ assets, isLoading }: AssetTableProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Live Consensus Prices</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Aggregated median across active oracle providers
          </p>
        </div>
        <Link
          href="/price-insight"
          className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View all assets
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Asset</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Consensus Price</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Spread</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Range</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Providers</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && assets.every((a) => a.consensusPrice === 0)
                ? Array.from({ length: 4 }).map((_, i) => <AssetRowSkeleton key={i} />)
                : assets.map((asset) => (
                    <tr key={asset.symbol} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {asset.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{asset.symbol}</div>
                            <div className="text-xs text-gray-500">/ USD</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-tabular text-base font-semibold text-gray-900">
                          {formatPrice(asset.consensusPrice, asset.symbol)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <SpreadIndicator spread={asset.priceRange.spreadPercent} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-tabular text-gray-700">
                          {asset.priceRange.min > 0
                            ? `${formatPrice(asset.priceRange.min, asset.symbol)} - ${formatPrice(asset.priceRange.max, asset.symbol)}`
                            : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5">
                            {asset.sources.slice(0, 4).map((source) => (
                              <div
                                key={source.provider}
                                className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                                style={{ backgroundColor: source.color }}
                                title={`${providerNames[source.provider]}: ${formatPrice(source.price, asset.symbol)}`}
                              >
                                <span className="text-[8px] font-bold text-white/90">
                                  {providerNames[source.provider]?.[0]}
                                </span>
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            {asset.providerCount}/{asset.totalProviders}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/cross-oracle?symbol=${asset.symbol}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Compare
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 sm:hidden text-center">
        <Link
          href="/price-insight"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all assets
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
