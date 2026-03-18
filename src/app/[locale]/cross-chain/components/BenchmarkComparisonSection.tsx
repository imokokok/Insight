'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { BenchmarkComparison } from '@/components/comparison';
import { BenchmarkData } from '@/components/comparison/types';

interface ChainPriceData {
  chain: string;
  price: number;
  timestamp: number;
}

interface BenchmarkComparisonSectionProps {
  chainPrices: ChainPriceData[];
  loading?: boolean;
}

export function BenchmarkComparisonSection({
  chainPrices,
  loading = false,
}: BenchmarkComparisonSectionProps) {
  const t = useTranslations();

  // Convert chain price data to benchmark data format
  const benchmarkData = useMemo((): BenchmarkData => {
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
    const medianPrice = sortedPrices.length > 0
      ? sortedPrices.length % 2 === 0
        ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
        : sortedPrices[Math.floor(sortedPrices.length / 2)]
      : 0;
    const bestPrice = sortedPrices.length > 0 ? sortedPrices[sortedPrices.length - 1] : 0;

    // Calculate metrics for each chain
    const metrics = chainPrices.map((data) => {
      const diffFromAvg = avgPrice > 0 ? ((data.price - avgPrice) / avgPrice) * 100 : 0;
      const diffFromMedian = medianPrice > 0 ? ((data.price - medianPrice) / medianPrice) * 100 : 0;
      const diffFromBest = bestPrice > 0 ? ((data.price - bestPrice) / bestPrice) * 100 : 0;

      return {
        name: data.chain,
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
  }, [chainPrices]);

  if (chainPrices.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('crossChain.benchmark.title')}
        </h3>
      </div>
      <div className="p-4">
        <BenchmarkComparison
          data={benchmarkData}
          loading={loading}
        />
      </div>
    </div>
  );
}
