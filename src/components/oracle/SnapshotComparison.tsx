'use client';

import { useMemo } from 'react';
import {
  OracleSnapshot,
  SnapshotStats,
  SnapshotComparisonResult,
  compareSnapshots,
  formatTimestamp,
} from '@/lib/types/snapshot';
import { PriceData, OracleProvider } from '@/lib/types/oracle';

const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
};

interface SnapshotComparisonProps {
  currentStats: SnapshotStats;
  currentPriceData: PriceData[];
  currentSymbol: string;
  selectedSnapshot: OracleSnapshot | null;
  onClose?: () => void;
}

export function SnapshotComparison({
  currentStats,
  currentPriceData,
  currentSymbol,
  selectedSnapshot,
  onClose,
}: SnapshotComparisonProps) {
  const comparison: SnapshotComparisonResult | null = useMemo(() => {
    if (!selectedSnapshot) return null;
    return compareSnapshots(currentStats, currentPriceData, currentSymbol, selectedSnapshot);
  }, [currentStats, currentPriceData, currentSymbol, selectedSnapshot]);

  if (!selectedSnapshot || !comparison) {
    return null;
  }

  const getChangeColor = (value: number, isPositiveGood: boolean = true): string => {
    if (value === 0) return 'text-gray-500';
    const isPositive = value > 0;
    if (isPositiveGood) {
      return isPositive ? 'text-green-600' : 'text-red-600';
    } else {
      return isPositive ? 'text-red-600' : 'text-green-600';
    }
  };

  const getChangeIcon = (value: number) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <svg
        className={`w-4 h-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={isPositive ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
        />
      </svg>
    );
  };

  const formatPrice = (value: number): string => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">快照对比分析</h3>
              <p className="text-xs text-gray-500">
                对比快照时间: {formatTimestamp(selectedSnapshot.timestamp)}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">平均价格变化</span>
              {getChangeIcon(comparison.priceChange.avgPrice)}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                ${formatPrice(currentStats.avgPrice)}
              </span>
              <span className={`text-sm font-medium ${getChangeColor(comparison.priceChange.avgPricePercent)}`}>
                {comparison.priceChange.avgPricePercent >= 0 ? '+' : ''}
                {comparison.priceChange.avgPricePercent.toFixed(2)}%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>快照均价: ${formatPrice(selectedSnapshot.stats.avgPrice)}</span>
              <span className={getChangeColor(comparison.priceChange.avgPrice)}>
                {comparison.priceChange.avgPrice >= 0 ? '+' : ''}${formatPrice(Math.abs(comparison.priceChange.avgPrice))}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">最高价格变化</span>
              {getChangeIcon(comparison.priceChange.maxPrice)}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                ${formatPrice(currentStats.maxPrice)}
              </span>
              <span className={`text-sm font-medium ${getChangeColor(comparison.priceChange.maxPricePercent)}`}>
                {comparison.priceChange.maxPricePercent >= 0 ? '+' : ''}
                {comparison.priceChange.maxPricePercent.toFixed(2)}%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>快照最高: ${formatPrice(selectedSnapshot.stats.maxPrice)}</span>
              <span className={getChangeColor(comparison.priceChange.maxPrice)}>
                {comparison.priceChange.maxPrice >= 0 ? '+' : ''}${formatPrice(Math.abs(comparison.priceChange.maxPrice))}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">最低价格变化</span>
              {getChangeIcon(comparison.priceChange.minPrice)}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                ${formatPrice(currentStats.minPrice)}
              </span>
              <span className={`text-sm font-medium ${getChangeColor(comparison.priceChange.minPricePercent)}`}>
                {comparison.priceChange.minPricePercent >= 0 ? '+' : ''}
                {comparison.priceChange.minPricePercent.toFixed(2)}%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>快照最低: ${formatPrice(selectedSnapshot.stats.minPrice)}</span>
              <span className={getChangeColor(comparison.priceChange.minPrice)}>
                {comparison.priceChange.minPrice >= 0 ? '+' : ''}${formatPrice(Math.abs(comparison.priceChange.minPrice))}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">价格范围变化</span>
              {getChangeIcon(comparison.statsChange.priceRange)}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                ${formatPrice(currentStats.priceRange)}
              </span>
              <span className={`text-sm font-medium ${getChangeColor(comparison.statsChange.priceRangePercent, false)}`}>
                {comparison.statsChange.priceRangePercent >= 0 ? '+' : ''}
                {comparison.statsChange.priceRangePercent.toFixed(2)}%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>快照范围: ${formatPrice(selectedSnapshot.stats.priceRange)}</span>
              <span className={getChangeColor(comparison.statsChange.priceRange, false)}>
                {comparison.statsChange.priceRange >= 0 ? '+' : ''}${formatPrice(Math.abs(comparison.statsChange.priceRange))}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">标准差变化</span>
              {getChangeIcon(-comparison.statsChange.standardDeviationPercent)}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {currentStats.standardDeviationPercent.toFixed(4)}%
              </span>
              <span className={`text-sm font-medium ${getChangeColor(-comparison.statsChange.standardDeviationPercent, false)}`}>
                {comparison.statsChange.standardDeviationPercent >= 0 ? '+' : ''}
                {comparison.statsChange.standardDeviationPercent.toFixed(4)}%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>快照标准差: {selectedSnapshot.stats.standardDeviationPercent.toFixed(4)}%</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">预言机数量变化</span>
              {getChangeIcon(comparison.oracleCountChange)}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {currentPriceData.length} 个
              </span>
              <span className={`text-sm font-medium ${getChangeColor(comparison.oracleCountChange)}`}>
                {comparison.oracleCountChange >= 0 ? '+' : ''}{comparison.oracleCountChange}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>快照数量: {selectedSnapshot.priceData.length} 个</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">预言机价格对比</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">预言机</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">快照价格</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">当前价格</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">变化</th>
                </tr>
              </thead>
              <tbody>
                {selectedSnapshot.priceData.map((snapshotItem) => {
                  const currentOracle = currentPriceData.find(
                    (p) => p.provider === snapshotItem.provider
                  );
                  const change = currentOracle
                    ? ((currentOracle.price - snapshotItem.price) / snapshotItem.price) * 100
                    : null;
                  
                  return (
                    <tr key={snapshotItem.provider} className="border-b border-gray-100">
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-900">
                          {oracleNames[snapshotItem.provider]}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600 font-mono">
                        ${formatPrice(snapshotItem.price)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-900 font-mono">
                        {currentOracle ? `$${formatPrice(currentOracle.price)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {change !== null ? (
                          <span className={`font-medium ${getChangeColor(change)}`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {currentPriceData
                  .filter((p) => !selectedSnapshot.priceData.find((s) => s.provider === p.provider))
                  .map((currentOracle) => (
                    <tr key={currentOracle.provider} className="border-b border-gray-100 bg-green-50">
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-900">
                          {oracleNames[currentOracle.provider]}
                        </span>
                        <span className="ml-2 text-xs text-green-600">(新增)</span>
                      </td>
                      <td className="py-2 px-3 text-right text-gray-400">-</td>
                      <td className="py-2 px-3 text-right text-gray-900 font-mono">
                        ${formatPrice(currentOracle.price)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-gray-400">-</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>快照ID: {selectedSnapshot.id}</span>
            <span>交易对: {selectedSnapshot.symbol}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
