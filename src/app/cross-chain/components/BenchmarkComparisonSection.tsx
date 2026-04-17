'use client';

import { useMemo } from 'react';

interface ChainPriceData {
  chain: string;
  price: number;
  timestamp: number;
}

interface BenchmarkComparisonSectionProps {
  chainPrices: ChainPriceData[];
  loading?: boolean;
}

export function BenchmarkComparisonSection({ chainPrices }: BenchmarkComparisonSectionProps) {
  const benchmarkData = useMemo(() => {
    if (chainPrices.length === 0) {
      return {
        industryAverage: 0,
        industryMedian: 0,
        industryBest: 0,
        metrics: [],
      };
    }

    const prices = chainPrices.map((d) => d.price).filter((p) => p > 0);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const medianPrice =
      sortedPrices.length > 0
        ? sortedPrices.length % 2 === 0
          ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
          : sortedPrices[Math.floor(sortedPrices.length / 2)]
        : 0;
    const bestPrice = sortedPrices.length > 0 ? sortedPrices[sortedPrices.length - 1] : 0;

    const metrics = chainPrices.map((data) => {
      const diffFromAvg = avgPrice > 0 ? ((data.price - avgPrice) / avgPrice) * 100 : 0;
      const diffFromMedian = medianPrice > 0 ? ((data.price - medianPrice) / medianPrice) * 100 : 0;
      const diffFromBest = bestPrice > 0 ? ((data.price - bestPrice) / bestPrice) * 100 : 0;

      let rank = 1;
      for (const p of sortedPrices) {
        if (p > data.price) rank++;
      }

      return {
        name: data.chain,
        value: data.price,
        diffFromAvg,
        diffFromMedian,
        diffFromBest,
        rank,
      };
    });

    return {
      industryAverage: avgPrice,
      industryMedian: medianPrice,
      industryBest: bestPrice,
      metrics,
    };
  }, [chainPrices]);

  if (chainPrices.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">{'crossChain.benchmark.title'}</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {'crossChain.benchmark.average'}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {benchmarkData.industryAverage.toFixed(2)}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {'crossChain.benchmark.median'}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {benchmarkData.industryMedian.toFixed(2)}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {'crossChain.benchmark.highestPrice'}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {benchmarkData.industryBest.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {'crossChain.benchmark.chain'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {'crossChain.benchmark.price'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {'crossChain.benchmark.diffFromAvg'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {'crossChain.benchmark.rank'}
                </th>
              </tr>
            </thead>
            <tbody>
              {benchmarkData.metrics.map((metric, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{metric.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{metric.value.toFixed(2)}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${
                      metric.diffFromAvg > 0
                        ? 'text-success-600'
                        : metric.diffFromAvg < 0
                          ? 'text-danger-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {metric.diffFromAvg >= 0 ? '+' : ''}
                    {metric.diffFromAvg.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono">#{metric.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BenchmarkComparisonSection;
