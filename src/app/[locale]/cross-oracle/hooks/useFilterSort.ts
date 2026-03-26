/**
 * @fileoverview 筛选排序 Hook
 * @description 从现有代码中提取的筛选排序逻辑，实现价格数据的筛选和排序功能
 */

import { useMemo, useCallback, useState } from 'react';

import { type OracleProvider, type PriceData } from '@/types/oracle';

import {
  oracleNames,
  calculateZScore,
  isOutlier,
  type SortColumn,
  type SortDirection,
  type DeviationFilter,
  type TimeRange,
} from '../constants';

import type {
  FilterSortResult,
  UseFilterSortReturn,
  OutlierStats,
  OutlierInfo,
} from '../types/index';

interface UseFilterSortParams {
  priceData: PriceData[];
  validPrices: number[];
  avgPrice: number;
  standardDeviation: number;
  t: (key: string, params?: Record<string, string | number>) => string;
  initialSortColumn?: SortColumn;
  initialSortDirection?: SortDirection;
  initialDeviationFilter?: DeviationFilter;
  initialOracleFilter?: OracleProvider | 'all';
  initialTimeRange?: TimeRange;
}

/**
 * 筛选排序 Hook
 * @param params - 参数对象
 * @returns 筛选排序结果和状态管理方法
 */
export function useFilterSort({
  priceData,
  validPrices,
  avgPrice,
  standardDeviation,
  t,
  initialSortColumn = null,
  initialSortDirection = 'asc',
  initialDeviationFilter = 'all',
  initialOracleFilter = 'all',
  initialTimeRange = '24H',
}: UseFilterSortParams): UseFilterSortReturn {
  // ============================================================================
  // 状态管理
  // ============================================================================

  const [sortColumn, setSortColumn] = useState<SortColumn>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [deviationFilter, setDeviationFilter] = useState<DeviationFilter>(initialDeviationFilter);
  const [oracleFilter, setOracleFilter] = useState<OracleProvider | 'all'>(initialOracleFilter);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);

  // ============================================================================
  // 排序逻辑
  // ============================================================================

  /**
   * 处理排序列切换
   * @param column - 排序列
   */
  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn]
  );

  /**
   * 排序后的价格数据
   */
  const sortedPriceData = useMemo(() => {
    if (!sortColumn) return priceData;

    return [...priceData].sort((a, b) => {
      if (sortColumn === 'price') {
        return sortDirection === 'asc' ? a.price - b.price : b.price - a.price;
      }
      if (sortColumn === 'timestamp') {
        return sortDirection === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
      }
      return 0;
    });
  }, [priceData, sortColumn, sortDirection]);

  // ============================================================================
  // 筛选逻辑
  // ============================================================================

  /**
   * 计算价格偏离百分比
   * @param price - 当前价格
   * @returns 偏离百分比或 null
   */
  const calculateDeviationPercent = useCallback(
    (price: number): number | null => {
      if (validPrices.length <= 1 || avgPrice <= 0 || price <= 0) {
        return null;
      }
      return Math.abs(((price - avgPrice) / avgPrice) * 100);
    },
    [validPrices.length, avgPrice]
  );

  /**
   * 检查价格是否符合偏差筛选条件
   * @param deviationPercent - 偏离百分比
   * @returns 是否符合条件
   */
  const matchesDeviationFilter = useCallback(
    (deviationPercent: number | null): boolean => {
      if (deviationFilter === 'all') return true;
      if (deviationPercent === null) return false;

      switch (deviationFilter) {
        case 'excellent':
          return deviationPercent < 0.1;
        case 'good':
          return deviationPercent >= 0.1 && deviationPercent < 0.5;
        case 'poor':
          return deviationPercent >= 0.5;
        default:
          return true;
      }
    },
    [deviationFilter]
  );

  /**
   * 筛选后的价格数据
   */
  const filteredPriceData = useMemo(() => {
    return sortedPriceData.filter((data) => {
      // 预言机筛选
      if (oracleFilter !== 'all' && data.provider !== oracleFilter) {
        return false;
      }

      // 偏差筛选
      const deviationPercent = calculateDeviationPercent(data.price);
      return matchesDeviationFilter(deviationPercent);
    });
  }, [sortedPriceData, oracleFilter, calculateDeviationPercent, matchesDeviationFilter]);

  // ============================================================================
  // 筛选统计
  // ============================================================================

  /**
   * 当前激活的筛选器数量
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (deviationFilter !== 'all') count++;
    if (oracleFilter !== 'all') count++;
    if (timeRange !== '24H') count++;
    return count;
  }, [deviationFilter, oracleFilter, timeRange]);

  // ============================================================================
  // 异常值统计
  // ============================================================================

  /**
   * 异常值统计信息
   */
  const outlierStats = useMemo<OutlierStats>(() => {
    const outliers: OutlierInfo[] = [];

    filteredPriceData.forEach((data, index) => {
      const zScore = calculateZScore(data.price, avgPrice, standardDeviation);

      if (isOutlier(zScore)) {
        const deviation = avgPrice > 0 ? Math.abs(((data.price - avgPrice) / avgPrice) * 100) : 0;

        outliers.push({
          index,
          provider: data.provider,
          zScore: zScore!,
          deviation,
        });
      }
    });

    const avgDeviation =
      outliers.length > 0 ? outliers.reduce((sum, o) => sum + o.deviation, 0) / outliers.length : 0;

    return {
      count: outliers.length,
      avgDeviation,
      outliers,
      oracleNames: outliers.map((o) => oracleNames[o.provider]),
    };
  }, [filteredPriceData, avgPrice, standardDeviation]);

  // ============================================================================
  // 操作方法
  // ============================================================================

  /**
   * 清除所有筛选器
   */
  const handleClearFilters = useCallback(() => {
    setDeviationFilter('all');
    setOracleFilter('all');
    setTimeRange('24H');
    setSortColumn(null);
    setSortDirection('asc');
  }, []);

  /**
   * 获取筛选摘要
   * @returns 筛选条件描述数组
   */
  const getFilterSummary = useCallback((): string[] => {
    const summary: string[] = [];

    if (deviationFilter !== 'all') {
      const label =
        deviationFilter === 'excellent'
          ? '<0.1%'
          : deviationFilter === 'good'
            ? '0.1-0.5%'
            : '>0.5%';
      summary.push(`${t('crossOracle.filterSummary.deviation')}: ${label}`);
    }

    if (oracleFilter !== 'all') {
      summary.push(`${t('crossOracle.filterSummary.oracle')}: ${oracleNames[oracleFilter]}`);
    }

    if (timeRange !== '24H') {
      summary.push(`${t('crossOracle.filterSummary.time')}: ${timeRange}`);
    }

    return summary;
  }, [deviationFilter, oracleFilter, timeRange, t]);

  // ============================================================================
  // 返回值
  // ============================================================================

  return {
    // 数据
    sortedPriceData,
    filteredPriceData,
    activeFilterCount,
    outlierStats,

    // 排序状态
    sortColumn,
    sortDirection,

    // 筛选器状态
    deviationFilter,
    setDeviationFilter,
    oracleFilter,
    setOracleFilter,

    // 操作方法
    handleSort,
    handleClearFilters,
    getFilterSummary,
  };
}

export default useFilterSort;
