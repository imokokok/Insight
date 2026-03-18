'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { OracleComparisonView, DifferenceBadge } from '@/components/comparison';
import { OracleComparisonItem } from '@/components/comparison/types';
import { OracleProvider } from '@/lib/oracles';

interface PriceData {
  provider: OracleProvider;
  chain: string;
  price: number;
  timestamp: number;
  confidence?: number;
  latency?: number;
  deviation?: number;
}

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

  // Convert price data to oracle comparison items
  const oracleItems = useMemo((): OracleComparisonItem[] => {
    if (priceData.length === 0) return [];

    // Calculate average price for deviation calculation
    const prices = priceData.map((d) => d.price).filter((p) => p > 0);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    return priceData.map((data) => {
      const deviation = avgPrice > 0 ? ((data.price - avgPrice) / avgPrice) * 100 : 0;

      return {
        provider: data.provider,
        chain: data.chain,
        price: data.price,
        timestamp: data.timestamp,
        confidence: data.confidence ?? 0.95,
        latency: data.latency ?? 500,
        deviation,
        isBenchmark: data.provider === benchmarkOracle,
      };
    });
  }, [priceData, benchmarkOracle]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (oracleItems.length === 0) return null;

    const prices = oracleItems.map((item) => item.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;

    // Calculate consistency score (based on coefficient of variation)
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgPrice > 0 ? stdDev / avgPrice : 0;
    const consistencyScore = Math.max(0, Math.min(100, 100 - cv * 100));

    return {
      avgPrice,
      maxPrice,
      minPrice,
      priceRange,
      consistencyScore,
      oracleCount: oracleItems.length,
    };
  }, [oracleItems]);

  if (priceData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary with Difference Badges */}
      {stats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('crossOracle.comparison.summary')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">{t('crossOracle.comparison.avgPrice')}</div>
              <div className="text-lg font-semibold text-gray-900">
                ${stats.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">{t('crossOracle.comparison.priceRange')}</div>
              <div className="text-lg font-semibold text-gray-900">
                ${stats.priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <DifferenceBadge
                value={stats.priceRange / stats.avgPrice * 100}
                type="percentage"
                size="sm"
                showIcon={false}
              />
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">{t('crossOracle.comparison.consistency')}</div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.consistencyScore.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">{t('crossOracle.comparison.oracleCount')}</div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.oracleCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Oracle Comparison View */}
      <OracleComparisonView
        oracles={oracleItems}
        benchmarkOracle={benchmarkOracle}
        showCharts={showCharts}
        showRadar={showRadar}
        showTable={showTable}
      />
    </div>
  );
}
