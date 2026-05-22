'use client';

import { useMemo } from 'react';

import { X, Database } from 'lucide-react';

import type { UserSnapshot } from '@/lib/supabase/queries';
import type { SnapshotStats } from '@/types/oracle/snapshot';

import { formatPrice, formatDate, ChangeIndicator } from './SnapshotCard';

export function ComparisonPanel({
  snapshots,
  onClose,
}: {
  snapshots: [UserSnapshot, UserSnapshot];
  onClose: () => void;
}) {
  const [older, newer] =
    snapshots[0].created_at! < snapshots[1].created_at!
      ? [snapshots[0], snapshots[1]]
      : [snapshots[1], snapshots[0]];

  const olderStats = older.stats as SnapshotStats;
  const newerStats = newer.stats as SnapshotStats;

  const comparison = useMemo(() => {
    if (!olderStats || !newerStats) return null;

    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return 0;
      return current - previous;
    };

    const calcChangePercent = (current: number, previous: number): number => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      priceChange: {
        avgPrice: calcChange(newerStats.avgPrice, olderStats.avgPrice),
        avgPricePercent: calcChangePercent(newerStats.avgPrice, olderStats.avgPrice),
        maxPrice: calcChange(newerStats.maxPrice, olderStats.maxPrice),
        maxPricePercent: calcChangePercent(newerStats.maxPrice, olderStats.maxPrice),
        minPrice: calcChange(newerStats.minPrice, olderStats.minPrice),
        minPricePercent: calcChangePercent(newerStats.minPrice, olderStats.minPrice),
      },
      oracleCountChange: (newer.price_data?.length ?? 0) - (older.price_data?.length ?? 0),
      statsChange: {
        priceRange: calcChange(newerStats.priceRange, olderStats.priceRange),
        priceRangePercent: calcChangePercent(newerStats.priceRange, olderStats.priceRange),
        standardDeviationPercent:
          newerStats.standardDeviationPercent - olderStats.standardDeviationPercent,
        standardDeviationPercentChange: calcChangePercent(
          newerStats.standardDeviationPercent,
          olderStats.standardDeviationPercent
        ),
        variance: calcChange(newerStats.variance, olderStats.variance),
        variancePercent: calcChangePercent(newerStats.variance, olderStats.variance),
      },
    };
  }, [olderStats, newerStats, older, newer]);

  if (!comparison) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500">Unable to compare snapshots.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Snapshot Comparison</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Comparing {newer.symbol} data between two snapshots
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Earlier Snapshot</div>
            <div className="text-sm font-medium text-gray-900">
              {older.name || `${older.symbol} Snapshot`}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{formatDate(older.created_at!)}</div>
          </div>
          <div className="p-3 bg-primary-50 rounded-lg">
            <div className="text-xs text-primary-600 mb-1">Later Snapshot</div>
            <div className="text-sm font-medium text-gray-900">
              {newer.name || `${newer.symbol} Snapshot`}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{formatDate(newer.created_at!)}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Price Changes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Average Price</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatPrice(newerStats.avgPrice)}
                </div>
                <ChangeIndicator value={comparison.priceChange.avgPricePercent} label="Change" />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Max Price</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatPrice(newerStats.maxPrice)}
                </div>
                <ChangeIndicator value={comparison.priceChange.maxPricePercent} label="Change" />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Min Price</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatPrice(newerStats.minPrice)}
                </div>
                <ChangeIndicator value={comparison.priceChange.minPricePercent} label="Change" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Dispersion Changes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Price Range</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatPrice(newerStats.priceRange)}
                </div>
                <ChangeIndicator value={comparison.statsChange.priceRangePercent} label="Change" />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Std Deviation</div>
                <div className="text-sm font-semibold text-gray-900">
                  {newerStats.standardDeviationPercent.toFixed(2)}%
                </div>
                <ChangeIndicator
                  value={comparison.statsChange.standardDeviationPercentChange}
                  label="Change"
                />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Variance</div>
                <div className="text-sm font-semibold text-gray-900">
                  {newerStats.variance.toFixed(6)}
                </div>
                <ChangeIndicator value={comparison.statsChange.variancePercent} label="Change" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Database className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Oracle count changed from{' '}
              <span className="font-medium text-gray-900">{older.price_data?.length ?? 0}</span> to{' '}
              <span className="font-medium text-gray-900">{newer.price_data?.length ?? 0}</span>
              {comparison.oracleCountChange !== 0 && (
                <span
                  className={`ml-1 text-xs font-medium ${
                    comparison.oracleCountChange > 0 ? 'text-success-600' : 'text-danger-600'
                  }`}
                >
                  ({comparison.oracleCountChange > 0 ? '+' : ''}
                  {comparison.oracleCountChange})
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
