'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { OracleProvider, PriceData } from '@/types/oracle';

interface BenchmarkComparisonSectionProps {
  priceData: PriceData[];
  loading?: boolean;
}

interface BenchmarkMetric {
  name: string;
  value: number;
  diffFromAvg: number;
  diffFromMedian: number;
  diffFromBest: number;
  rank: number;
}

interface ExtendedBenchmarkData {
  industryAverage: number;
  industryMedian: number;
  industryBest: number;
  metrics: BenchmarkMetric[];
}

export function BenchmarkComparisonSection({
  priceData,
  loading = false,
}: BenchmarkComparisonSectionProps) {
  const t = useTranslations();

  // Convert price data to benchmark data format
  const benchmarkData = useMemo((): ExtendedBenchmarkData => {
    if (priceData.length === 0) {
      return {
        industryAverage: 0,
        industryMedian: 0,
        industryBest: 0,
        metrics: [],
      };
    }

    const prices = priceData.map((d) => d.price).filter((p) => p > 0);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const medianPrice = sortedPrices.length > 0
      ? sortedPrices.length % 2 === 0
        ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
        : sortedPrices[Math.floor(sortedPrices.length / 2)]
      : 0;
    const bestPrice = sortedPrices.length > 0 ? sortedPrices[sortedPrices.length - 1] : 0;

    // Calculate metrics for each oracle
    const metrics = priceData.map((data) => {
      const diffFromAvg = avgPrice > 0 ? ((data.price - avgPrice) / avgPrice) * 100 : 0;
      const diffFromMedian = medianPrice > 0 ? ((data.price - medianPrice) / medianPrice) * 100 : 0;
      const diffFromBest = bestPrice > 0 ? ((data.price - bestPrice) / bestPrice) * 100 : 0;

      return {
        name: `${data.provider} (${data.chain || 'ethereum'})`,
        value: data.price,
        diffFromAvg,
        diffFromMedian,
        diffFromBest,
        rank: sortedPrices.indexOf(data.price) + 1,
      };
    });

    return {
      industryAverage: avgPrice,
      industryMedian: medianPrice,
      industryBest: bestPrice,
      metrics,
    };
  }, [priceData]);

  if (priceData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('crossOracle.benchmark.title')}
        </h3>
      </div>
      <div className="p-4">
        <div className="space-y-4">
          {/* 行业基准统计 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">{t('comparison.benchmark.industryAverage')}</p>
              <p className="text-lg font-semibold text-gray-900">
                ${benchmarkData.industryAverage.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">{t('comparison.oracleComparison.medianPrice')}</p>
              <p className="text-lg font-semibold text-gray-900">
                ${benchmarkData.industryMedian.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">{t('comparison.benchmark.marketLeader')}</p>
              <p className="text-lg font-semibold text-green-600">
                ${benchmarkData.industryBest.toFixed(2)}
              </p>
            </div>
          </div>

          {/* 指标表格 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('comparison.oracleComparison.oracle')}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('comparison.oracleComparison.price')}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('comparison.benchmark.gap')}
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    {t('oracleCommon.oraclePageTemplate.rank')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {benchmarkData.metrics.map((metric) => (
                  <tr key={metric.name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{metric.name}</td>
                    <td className="px-3 py-2 text-right font-mono">${metric.value.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={metric.diffFromAvg > 0 ? 'text-green-600' : 'text-red-600'}>
                        {metric.diffFromAvg > 0 ? '+' : ''}{metric.diffFromAvg.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-gray-100 text-gray-700">
                        {metric.rank}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
