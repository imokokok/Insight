'use client';

/**
 * @fileoverview 价格对比 Tab 组件（简化版）
 * @description 精简版价格对比展示，保留核心信息，供 QueryResults 使用
 */

import { memo } from 'react';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  ArrowRightLeft,
  Activity,
  Award,
} from 'lucide-react';

import type { OracleProvider, PriceData } from '@/types/oracle';
import { SimplePriceTable } from '../SimplePriceTable';

// ============================================================================
// 类型定义
// ============================================================================

interface SimplePriceComparisonTabProps {
  priceData: PriceData[];
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  deviationRate: number;
  consistencyRating: string;
  validPrices: number[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ============================================================================
// 辅助函数
// ============================================================================

function formatPrice(value: number): string {
  if (value <= 0) return '-';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function getRatingColor(rating: string): { bg: string; text: string; border: string } {
  switch (rating) {
    case 'A':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'B':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'C':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    case 'D':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
}

// ============================================================================
// 统计卡片组件
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  colorClass?: string;
}

function StatCard({ icon, label, value, subValue, colorClass = 'text-gray-900' }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
          {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div className="p-2 bg-gray-50 rounded-lg text-gray-500">{icon}</div>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function SimplePriceComparisonTabComponent({
  priceData,
  selectedOracles,
  selectedSymbol,
  medianPrice,
  minPrice,
  maxPrice,
  priceRange,
  deviationRate,
  consistencyRating,
  validPrices,
  t,
}: SimplePriceComparisonTabProps) {
  const [baseAsset, quoteAsset] = selectedSymbol.split('/');
  const ratingColors = getRatingColor(consistencyRating);

  return (
    <div className="space-y-6">
      {/* 交易对信息头部 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded text-[10px] font-medium text-emerald-700 uppercase tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
              </span>
              {t('crossOracle.live') || 'Live'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-gray-900">{baseAsset}</span>
            <span className="text-base text-gray-400 font-medium">/{quoteAsset}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">{t('crossOracle.oracleCount') || '预言机数量'}</p>
            <p className="text-lg font-semibold text-gray-900">{selectedOracles.length}</p>
          </div>
        </div>
      </div>

      {/* 核心统计指标 - 4个卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label={t('crossOracle.medianPrice') || '中位数价格'}
          value={formatPrice(medianPrice)}
          colorClass="text-gray-900"
        />
        <StatCard
          icon={<ArrowRightLeft className="w-5 h-5" />}
          label={t('crossOracle.priceRange') || '价格区间'}
          value={formatPrice(priceRange)}
          subValue={`${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`}
          colorClass="text-gray-900"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label={t('crossOracle.deviationRate') || '偏差率'}
          value={formatPercent(deviationRate)}
          colorClass={deviationRate > 1 ? 'text-red-600' : 'text-emerald-600'}
        />
        <div className={`rounded-xl p-4 border ${ratingColors.bg} ${ratingColors.border}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('crossOracle.consistencyRating') || '一致性评级'}</p>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${ratingColors.text}`}>{consistencyRating}</span>
                <Award className={`w-5 h-5 ${ratingColors.text}`} />
              </div>
            </div>
            <div className={`p-2 rounded-lg bg-white/60 ${ratingColors.text}`}>
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 价格对比表格 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          {t('crossOracle.priceComparison') || '价格对比'}
        </h4>
        <SimplePriceTable
          priceData={priceData}
          medianPrice={medianPrice}
          validPrices={validPrices}
          t={t}
        />
      </div>

      {/* 数据说明 */}
      <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {t('crossOracle.dataNote') || '数据说明'}
            </h4>
            <p className="text-xs text-gray-600 mt-1">
              {t('crossOracle.priceComparisonNote') || 
                '价格数据实时获取自各预言机，偏差率基于中位数价格计算。一致性评级A表示数据高度一致，D表示存在较大偏差。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const SimplePriceComparisonTab = memo(SimplePriceComparisonTabComponent);
SimplePriceComparisonTab.displayName = 'SimplePriceComparisonTab';

export default SimplePriceComparisonTab;
