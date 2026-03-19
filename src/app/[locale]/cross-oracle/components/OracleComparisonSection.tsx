'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { OracleProvider, PriceData } from '@/types/oracle';
import { oracleColors } from '@/components/oracle/charts/CrossOracleComparison/crossOracleConfig';

interface OracleComparisonSectionProps {
  priceData: PriceData[];
  benchmarkOracle?: OracleProvider;
  showCharts?: boolean;
  showRadar?: boolean;
  showTable?: boolean;
}

export function OracleComparisonSection({
  priceData,
  benchmarkOracle = OracleProvider.CHAINLINK,
  showCharts = true,
  showRadar = true,
  showTable = true,
}: OracleComparisonSectionProps) {
  const t = useTranslations();

  // Calculate statistics
  const stats = useMemo(() => {
    if (priceData.length === 0) return null;

    const prices = priceData.map((item) => item.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;

    // Calculate consistency score (based on coefficient of variation)
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgPrice > 0 ? stdDev / avgPrice : 0;
    const consistencyScore = Math.max(0, Math.min(100, 100 - cv * 100));

    return {
      avgPrice,
      maxPrice,
      minPrice,
      priceRange,
      consistencyScore,
      oracleCount: priceData.length,
    };
  }, [priceData]);

  if (priceData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="bg-white border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('crossOracle.comparison.summary')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                {t('crossOracle.comparison.avgPrice')}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                $
                {stats.avgPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                {t('crossOracle.comparison.priceRange')}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                $
                {stats.priceRange.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                {t('crossOracle.comparison.consistency')}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.consistencyScore.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                {t('crossOracle.comparison.oracleCount')}
              </div>
              <div className="text-lg font-semibold text-gray-900">{stats.oracleCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Price Comparison Table */}
      {showTable && (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('crossOracle.priceComparisonDetails')}
            </h3>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('crossOracle.oracle')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      {t('crossOracle.price')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      {t('crossOracle.deviation')}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {t('crossOracle.confidence')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {priceData.map((data) => {
                    const deviation = stats?.avgPrice
                      ? ((data.price - stats.avgPrice) / stats.avgPrice) * 100
                      : 0;
                    const isBenchmark = data.provider === benchmarkOracle;

                    return (
                      <tr
                        key={data.provider}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${
                          isBenchmark ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5"
                              style={{ backgroundColor: oracleColors[data.provider] }}
                            />
                            <span className="font-medium text-gray-900">{data.provider}</span>
                            {isBenchmark && (
                              <span className="text-xs text-blue-600">
                                ({t('comparison.oracleComparison.benchmark')})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">${data.price.toFixed(2)}</td>
                        <td
                          className={`px-3 py-2 text-right font-mono ${
                            deviation > 0
                              ? 'text-green-600'
                              : deviation < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {deviation > 0 ? '+' : ''}
                          {deviation.toFixed(3)}%
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500">
                          {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
