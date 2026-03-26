import { useMemo, useCallback } from 'react';

import { type OracleProvider, type PriceData } from '@/types/oracle';

import {
  type SortColumn,
  type SortDirection,
  type DeviationFilter,
  oracleNames,
  type TimeRange,
  calculateZScore,
  isOutlier,
} from './constants';
import { type FilterSortResult } from './types';

interface UseFilterSortParams {
  priceData: PriceData[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  setSortColumn: React.Dispatch<React.SetStateAction<SortColumn>>;
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  deviationFilter: DeviationFilter;
  oracleFilter: OracleProvider | 'all';
  timeRange: TimeRange;
  setDeviationFilter: React.Dispatch<React.SetStateAction<DeviationFilter>>;
  setOracleFilter: React.Dispatch<React.SetStateAction<OracleProvider | 'all'>>;
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>;
  validPrices: number[];
  avgPrice: number;
  standardDeviation: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function useFilterSort({
  priceData,
  sortColumn,
  sortDirection,
  setSortColumn,
  setSortDirection,
  deviationFilter,
  oracleFilter,
  timeRange,
  setDeviationFilter,
  setOracleFilter,
  setTimeRange,
  validPrices,
  avgPrice,
  standardDeviation,
  t,
}: UseFilterSortParams): FilterSortResult {
  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn, sortDirection, setSortColumn, setSortDirection]
  );

  const sortedPriceData = useMemo(() => {
    return [...priceData].sort((a, b) => {
      if (!sortColumn) return 0;
      if (sortColumn === 'price') {
        return sortDirection === 'asc' ? a.price - b.price : b.price - a.price;
      }
      if (sortColumn === 'timestamp') {
        return sortDirection === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
      }
      return 0;
    });
  }, [priceData, sortColumn, sortDirection]);

  const filteredPriceData = useMemo(() => {
    return sortedPriceData.filter((data) => {
      if (oracleFilter !== 'all' && data.provider !== oracleFilter) return false;
      if (deviationFilter === 'all') return true;

      let deviationPercent: number | null = null;
      if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
        deviationPercent = Math.abs(((data.price - avgPrice) / avgPrice) * 100);
      }

      if (deviationFilter === 'excellent')
        return deviationPercent !== null && deviationPercent < 0.1;
      if (deviationFilter === 'good')
        return deviationPercent !== null && deviationPercent >= 0.1 && deviationPercent < 0.5;
      if (deviationFilter === 'poor') return deviationPercent !== null && deviationPercent >= 0.5;
      return true;
    });
  }, [sortedPriceData, oracleFilter, deviationFilter, validPrices, avgPrice]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (deviationFilter !== 'all') count++;
    if (oracleFilter !== 'all') count++;
    if (timeRange !== '24H') count++;
    return count;
  }, [deviationFilter, oracleFilter, timeRange]);

  const outlierStats = useMemo(() => {
    const outliers: {
      index: number;
      provider: OracleProvider;
      zScore: number;
      deviation: number;
    }[] = [];
    filteredPriceData.forEach((data, index) => {
      const zScore = calculateZScore(data.price, avgPrice, standardDeviation);
      if (isOutlier(zScore)) {
        const deviation = avgPrice > 0 ? Math.abs(((data.price - avgPrice) / avgPrice) * 100) : 0;
        outliers.push({ index, provider: data.provider, zScore: zScore!, deviation });
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

  const handleClearFilters = useCallback(() => {
    setDeviationFilter('all');
    setOracleFilter('all');
    setTimeRange('24H');
  }, [setDeviationFilter, setOracleFilter, setTimeRange]);

  const getFilterSummary = useCallback(() => {
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

  return {
    sortedPriceData,
    filteredPriceData,
    activeFilterCount,
    outlierStats,
    handleSort,
    handleClearFilters,
    getFilterSummary,
  };
}
