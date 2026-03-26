'use client';

import { useMemo, useState } from 'react';

import {
  EnhancedComparisonTable,
  type ComparisonDataItem,
  type DeviationThreshold,
} from '@/components/comparison/EnhancedComparisonTable';
import { oracleColors } from '@/components/oracle/charts/CrossOracleComparison/crossOracleConfig';
import { useTranslations } from '@/i18n';
import { OracleProvider, type PriceData } from '@/types/oracle';

interface OracleComparisonSectionProps {
  priceData: PriceData[];
  benchmarkOracle?: OracleProvider;
  showTable?: boolean;
}

// 默认偏离阈值配置
const DEFAULT_DEVIATION_THRESHOLD: DeviationThreshold = {
  warning: 1,
  danger: 2,
};

export function OracleComparisonSection({
  priceData,
  benchmarkOracle = OracleProvider.CHAINLINK,
  showTable = true,
}: OracleComparisonSectionProps) {
  const t = useTranslations();
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 计算统计数据
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

  // 将 PriceData 转换为 EnhancedComparisonTable 需要的格式
  const comparisonData: ComparisonDataItem[] = useMemo(() => {
    if (!stats) return [];

    return priceData.map((data) => {
      const deviation = ((data.price - stats.avgPrice) / stats.avgPrice) * 100;

      return {
        provider: data.provider,
        name: data.source || data.provider,
        price: data.price,
        deviation,
        confidence: data.confidence ? data.confidence * 100 : undefined,
        responseTime: undefined, // PriceData 中没有响应时间字段
        color: oracleColors[data.provider] || '#6B7280',
      };
    });
  }, [priceData, stats]);

  // 处理排序
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

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

      {/* Enhanced Price Comparison Table */}
      {showTable && (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('crossOracle.priceComparisonDetails')}
            </h3>
          </div>
          <div className="p-4">
            <EnhancedComparisonTable
              data={comparisonData}
              benchmarkProvider={benchmarkOracle}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              deviationThreshold={DEFAULT_DEVIATION_THRESHOLD}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default OracleComparisonSection;
