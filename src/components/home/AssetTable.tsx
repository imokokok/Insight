'use client';

import { memo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { motion } from 'framer-motion';
import { ArrowRight, Clock, Minus, TrendingDown, TrendingUp } from 'lucide-react';

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

function formatRelativeTime(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return '—';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getSpreadTrend(spread: number): 'low' | 'medium' | 'high' {
  if (spread <= 0.1) return 'low';
  if (spread <= 0.5) return 'medium';
  return 'high';
}

function CryptoIcon({ symbol }: { symbol: string }) {
  const [hasError, setHasError] = useState(false);
  const src = `/logos/cryptos/${symbol.toLowerCase()}.svg`;

  if (hasError) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
        {symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
      <Image
        src={src}
        alt={symbol}
        width={28}
        height={28}
        className="w-6 h-6 object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function SpreadIndicator({ spread }: { spread: number }) {
  const trend = getSpreadTrend(spread);
  const Icon = spread === 0 ? Minus : spread <= 0.1 ? TrendingDown : TrendingUp;
  const colors = {
    low: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    medium: 'text-amber-700 bg-amber-50 border-amber-100',
    high: 'text-rose-700 bg-rose-50 border-rose-100',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[trend]}`}
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
          <div className="w-9 h-9 rounded-full bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-10 bg-slate-200 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="h-5 w-28 bg-slate-200 rounded" />
      </td>
      <td className="px-4 py-4">
        <div className="h-5 w-20 bg-slate-200 rounded" />
      </td>
      <td className="px-4 py-4">
        <div className="h-5 w-32 bg-slate-200 rounded" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 w-24 bg-slate-200 rounded" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 w-20 bg-slate-200 rounded" />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="h-4 w-16 bg-slate-200 rounded ml-auto" />
      </td>
    </tr>
  );
}

function AssetTableComponent({ assets, isLoading }: AssetTableProps) {
  const showSkeleton = isLoading && assets.every((a) => a.consensusPrice === 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Cross-Oracle Consensus Prices
          </h2>
          <p className="text-base text-slate-500 mt-1">
            Transparent median across active oracle providers, with source verification
          </p>
        </div>
        <Link
          href="/price-insight"
          className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          View all assets
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Asset
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Consensus Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Spread
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Range
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Providers
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Last Update
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {showSkeleton
                ? Array.from({ length: 4 }).map((_, i) => <AssetRowSkeleton key={i} />)
                : assets.map((asset) => (
                    <tr key={asset.symbol} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <CryptoIcon symbol={asset.symbol} />
                          <div>
                            <div className="font-semibold text-slate-900">{asset.symbol}</div>
                            <div className="text-xs text-slate-500">/ USD</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-mono tabular-nums text-base font-semibold text-slate-900">
                          {formatPrice(asset.consensusPrice, asset.symbol)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <SpreadIndicator spread={asset.priceRange.spreadPercent} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-mono tabular-nums text-slate-700">
                          {asset.priceRange.min > 0
                            ? `${formatPrice(asset.priceRange.min, asset.symbol)} - ${formatPrice(asset.priceRange.max, asset.symbol)}`
                            : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {asset.sources.slice(0, 4).map((source) => (
                              <div
                                key={source.provider}
                                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm"
                                style={{ backgroundColor: source.color }}
                                title={`${providerNames[source.provider]}: ${formatPrice(source.price, asset.symbol)}`}
                              >
                                <span className="text-[9px] font-bold text-white/90">
                                  {providerNames[source.provider]?.[0]}
                                </span>
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-slate-500 font-medium">
                            {asset.providerCount}/{asset.totalProviders}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          {formatRelativeTime(asset.lastUpdatedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/price-insight?symbol=${asset.symbol}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
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
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          View all assets
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.section>
  );
}

export const AssetTable = memo(AssetTableComponent);
