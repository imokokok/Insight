'use client';

/**
 * @fileoverview 价格离散度指数卡片组件
 * @description 展示变异系数(CV)和专业解读
 */

import { memo, useMemo } from 'react';

import { BarChart3 } from 'lucide-react';

import { DispersionGauge } from './DispersionGauge';

interface PriceDispersionCardProps {
  standardDeviation: number;
  avgPrice: number;
  oracleCount: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function PriceDispersionCardComponent({
  standardDeviation,
  avgPrice,
  oracleCount,
  t,
}: PriceDispersionCardProps) {
  // 计算变异系数 (CV)
  const cv = useMemo(() => {
    if (avgPrice === 0) return 0;
    return (standardDeviation / avgPrice) * 100;
  }, [standardDeviation, avgPrice]);

  // 计算标准误差
  const standardError = useMemo(() => {
    if (oracleCount === 0) return 0;
    return standardDeviation / Math.sqrt(oracleCount);
  }, [standardDeviation, oracleCount]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium text-gray-500">
          {t('crossOracle.priceDispersion')}
        </span>
      </div>

      <DispersionGauge cv={cv} size={100} />

      {/* 统计详情 */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
        <div className="text-center group relative">
          <div className="text-lg font-semibold text-gray-900">{standardDeviation.toFixed(4)}</div>
          <div className="text-xs text-gray-500">{t('crossOracle.stdDev')}</div>
          <div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            role="tooltip"
          >
            各预言机报价偏离均值的程度，值越小表示预言机间一致性越高
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-4 border-gray-900 border-l-transparent border-r-transparent border-b-transparent" />
          </div>
        </div>
        <div className="text-center group relative">
          <div className="text-lg font-semibold text-gray-900">{cv.toFixed(4)}%</div>
          <div className="text-xs text-gray-500">{t('crossOracle.cv')}</div>
          <div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            role="tooltip"
          >
            标准差与均值的比值，用于比较不同价格水平的波动性
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-4 border-gray-900 border-l-transparent border-r-transparent border-b-transparent" />
          </div>
        </div>
        <div className="text-center border-t border-gray-100 pt-4">
          <div className="text-lg font-semibold text-gray-900">{standardError.toFixed(4)}</div>
          <div className="text-xs text-gray-500">{t('crossOracle.stdError')}</div>
        </div>
        <div className="text-center border-t border-gray-100 pt-4">
          <div className="text-lg font-semibold text-gray-900">{oracleCount}</div>
          <div className="text-xs text-gray-500">{t('crossOracle.sampleSize')}</div>
        </div>
      </div>
    </div>
  );
}

export const PriceDispersionCard = memo(PriceDispersionCardComponent);
PriceDispersionCard.displayName = 'PriceDispersionCard';

export default PriceDispersionCard;
