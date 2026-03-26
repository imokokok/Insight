'use client';

/**
 * @fileoverview 移动端对比表格组件
 * @description 专为移动端优化的卡片式对比表格，支持滑动浏览和展开详情
 */

import { useState, useRef, useCallback, memo } from 'react';

import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

import { type OracleProvider, type PriceData } from '@/types/oracle';

import {
  oracleNames,
  getDeviationColorClass,
  getDeviationBgClass,
  getFreshnessInfo,
  getFreshnessDotColor,
  calculateZScore,
  isOutlier,
} from '../constants';

interface MobileComparisonTableProps {
  priceData: PriceData[];
  filteredPriceData: PriceData[];
  isLoading: boolean;
  chartColors: Record<OracleProvider, string>;
  avgPrice: number;
  standardDeviation: number;
  validPrices: number[];
  onSort: (column: 'price' | 'timestamp' | null) => void;
  onHoverOracle?: (oracle: OracleProvider | null) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface OracleCardData {
  provider: OracleProvider;
  price: number;
  deviation: number | null;
  confidence: number | null;
  source: string;
  freshness: string;
  freshnessSeconds: number;
  timestamp: number;
  zScore: number | null;
  isOutlier: boolean;
  isHighest: boolean;
  isLowest: boolean;
  originalIndex: number;
}

type SortField = 'price' | 'deviation' | 'freshness' | 'confidence';
type SortOrder = 'asc' | 'desc';

// 自定义比较函数用于 memo
function arePropsEqual(
  prevProps: MobileComparisonTableProps,
  nextProps: MobileComparisonTableProps
): boolean {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.avgPrice !== nextProps.avgPrice) return false;
  if (prevProps.standardDeviation !== nextProps.standardDeviation) return false;
  if (prevProps.onSort !== nextProps.onSort) return false;
  if (prevProps.onHoverOracle !== nextProps.onHoverOracle) return false;
  if (prevProps.t !== nextProps.t) return false;
  if (prevProps.priceData.length !== nextProps.priceData.length) return false;
  if (prevProps.filteredPriceData.length !== nextProps.filteredPriceData.length) return false;
  if (prevProps.validPrices.length !== nextProps.validPrices.length) return false;
  if (prevProps.chartColors !== nextProps.chartColors) return false;
  return true;
}

function MobileComparisonTableComponent({
  filteredPriceData,
  isLoading,
  chartColors,
  avgPrice,
  standardDeviation,
  validPrices,
  onHoverOracle,
  t,
}: MobileComparisonTableProps) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('price');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterOutliers, setFilterOutliers] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

  // 转换数据为卡片格式
  const cardData: OracleCardData[] = filteredPriceData.map((data, index) => {
    let deviationPercent: number | null = null;
    if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
      deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
    }
    const zScore = calculateZScore(data.price, avgPrice, standardDeviation);
    const outlier = isOutlier(zScore);
    const freshness = getFreshnessInfo(data.timestamp);
    const isHighest = data.price === maxPrice && maxPrice !== minPrice;
    const isLowest = data.price === minPrice && maxPrice !== minPrice;

    return {
      provider: data.provider,
      price: data.price,
      deviation: deviationPercent,
      confidence: data.confidence ?? null,
      source: data.source || '-',
      freshness: freshness.text,
      freshnessSeconds: freshness.seconds,
      timestamp: data.timestamp,
      zScore,
      isOutlier: outlier,
      isHighest,
      isLowest,
      originalIndex: index,
    };
  });

  // 排序和过滤
  const sortedAndFilteredData = cardData
    .filter((card) => !filterOutliers || !card.isOutlier)
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'deviation':
          comparison = (a.deviation ?? 0) - (b.deviation ?? 0);
          break;
        case 'freshness':
          comparison = a.freshnessSeconds - b.freshnessSeconds;
          break;
        case 'confidence':
          comparison = (a.confidence ?? 0) - (b.confidence ?? 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // 处理排序
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 展开/收起卡片
  const toggleExpand = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  // 触摸处理
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent, index: number) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    // 向上滑动超过 50px 展开，向下滑动收起
    if (Math.abs(diff) > 50) {
      if (diff > 0 && expandedCard !== index) {
        setExpandedCard(index);
      } else if (diff < 0 && expandedCard === index) {
        setExpandedCard(null);
      }
    }
    touchStartY.current = null;
  };

  // 渲染偏差指示器
  const renderDeviation = (deviation: number | null) => {
    if (deviation === null) {
      return <span className="text-gray-400 text-sm">-</span>;
    }

    const isPositive = deviation >= 0;
    const absDeviation = Math.abs(deviation);

    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getDeviationColorClass(
            deviation
          )}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${getDeviationBgClass(deviation)}`} />
          {isPositive ? '+' : ''}
          {absDeviation.toFixed(3)}%
        </span>
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-rose-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-emerald-500" />
        )}
      </div>
    );
  };

  // 渲染置信度条
  const renderConfidence = (confidence: number | null) => {
    if (confidence === null) {
      return <span className="text-gray-400 text-sm">-</span>;
    }

    const percentage = Math.round(confidence * 100);
    let colorClass = 'bg-emerald-500';
    if (percentage < 50) colorClass = 'bg-rose-500';
    else if (percentage < 80) colorClass = 'bg-amber-500';

    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClass} rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 min-w-[36px]">{percentage}%</span>
      </div>
    );
  };

  // 渲染新鲜度指示
  const renderFreshness = (freshness: string, seconds: number) => {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${getFreshnessDotColor(seconds)}`} />
        <span className="text-sm text-gray-600">{freshness}</span>
      </div>
    );
  };

  // 渲染状态标签
  const renderStatus = (card: OracleCardData) => {
    if (card.isOutlier) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <AlertTriangle className="w-3 h-3" />
          {t('crossOracle.outlier') || 'Outlier'}
        </span>
      );
    }
    if (card.isHighest) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
          <TrendingUp className="w-3 h-3" />
          {t('crossOracle.priceTable.highest') || 'Highest'}
        </span>
      );
    }
    if (card.isLowest) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <TrendingDown className="w-3 h-3" />
          {t('crossOracle.priceTable.lowest') || 'Lowest'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <CheckCircle2 className="w-3 h-3" />
        {t('crossOracle.priceTable.normal') || 'Normal'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="md:hidden space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (sortedAndFilteredData.length === 0) {
    return (
      <div className="md:hidden">
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">
            {t('crossOracle.noData') || 'No data available'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {t('crossOracle.tryAdjustingFilters') || 'Try adjusting your filters'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden space-y-3">
      {/* 排序和过滤工具栏 */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-2">
            {t('crossOracle.sortBy') || 'Sort by'}:
          </span>
          {[
            { key: 'price', label: t('crossOracle.price') || 'Price' },
            { key: 'deviation', label: t('crossOracle.deviation') || 'Dev' },
            { key: 'freshness', label: t('crossOracle.freshness') || 'Fresh' },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => handleSort(option.key as SortField)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                sortField === option.key
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-1">
                {option.label}
                {sortField === option.key && <ArrowUpDown className="w-3 h-3" />}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setFilterOutliers(!filterOutliers)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            filterOutliers ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {filterOutliers
            ? t('crossOracle.showAll') || 'Show All'
            : t('crossOracle.hideOutliers') || 'Hide Outliers'}
        </button>
      </div>

      {/* 卡片列表 */}
      <div className="space-y-3">
        {sortedAndFilteredData.map((card, index) => (
          <div
            key={card.provider}
            className={`bg-white rounded-xl border transition-all duration-200 ${
              card.isOutlier
                ? 'border-amber-200 shadow-sm'
                : expandedCard === index
                  ? 'border-primary-200 shadow-md'
                  : 'border-gray-200'
            }`}
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, index)}
            onMouseEnter={() => onHoverOracle?.(card.provider)}
            onMouseLeave={() => onHoverOracle?.(null)}
          >
            {/* 卡片头部 */}
            <button onClick={() => toggleExpand(index)} className="w-full p-4 text-left">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* 颜色指示器 */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${chartColors[card.provider]}20` }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: chartColors[card.provider] }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {oracleNames[card.provider]}
                      </span>
                      {renderStatus(card)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t('crossOracle.source') || 'Source'}: {card.source}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    $
                    {card.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  {expandedCard === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* 快速信息行 */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">
                    {t('crossOracle.deviation') || 'Deviation'}
                  </div>
                  {renderDeviation(card.deviation)}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">
                    {t('crossOracle.confidence') || 'Confidence'}
                  </div>
                  {renderConfidence(card.confidence)}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">
                    {t('crossOracle.freshness') || 'Freshness'}
                  </div>
                  {renderFreshness(card.freshness, card.freshnessSeconds)}
                </div>
              </div>
            </button>

            {/* 展开的详情 */}
            {expandedCard === index && (
              <div className="px-4 pb-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                <div className="pt-3 grid grid-cols-2 gap-4">
                  {/* Z-Score */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      <Shield className="w-3.5 h-3.5" />
                      Z-Score
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        card.zScore !== null && Math.abs(card.zScore) > 2
                          ? 'text-amber-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {card.zScore !== null ? card.zScore.toFixed(3) : '-'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {card.zScore !== null && Math.abs(card.zScore) > 2
                        ? t('crossOracle.significantDeviation') || 'Significant deviation'
                        : t('crossOracle.withinNormalRange') || 'Within normal range'}
                    </div>
                  </div>

                  {/* 更新时间 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t('crossOracle.lastUpdated') || 'Last Updated'}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {new Date(card.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(card.timestamp).toLocaleDateString()}
                    </div>
                  </div>

                  {/* 与平均值差异 */}
                  {card.deviation !== null && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        {t('crossOracle.diffFromAvg') || 'Diff from Avg'}
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          card.deviation >= 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {card.deviation >= 0 ? '+' : ''}
                        {(card.price - avgPrice).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        $
                        {avgPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {t('crossOracle.avg') || 'avg'}
                      </div>
                    </div>
                  )}

                  {/* 价格位置 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">
                      {t('crossOracle.pricePosition') || 'Price Position'}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {validPrices.length > 1
                        ? `${
                            validPrices.filter((p) => p < card.price).length + 1
                          } / ${validPrices.length}`
                        : '-'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t('crossOracle.rankAmongOracles') || 'Rank among oracles'}
                    </div>
                  </div>
                </div>

                {/* 关闭按钮 */}
                <button
                  onClick={() => setExpandedCard(null)}
                  className="mt-3 w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="flex items-center justify-center gap-1">
                    <X className="w-3.5 h-3.5" />
                    {t('crossOracle.closeDetails') || 'Close Details'}
                  </span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部提示 */}
      <div className="text-center text-xs text-gray-400 py-2">
        {t('crossOracle.swipeToExpand') || 'Swipe up on card to expand details'}
      </div>
    </div>
  );
}

// 导出 memoized 组件
export const MobileComparisonTable = memo(MobileComparisonTableComponent, arePropsEqual);
