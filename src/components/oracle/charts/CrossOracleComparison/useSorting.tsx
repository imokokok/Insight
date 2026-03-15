import { useState, useMemo } from 'react';
import {
  SortField,
  SortDirection,
  SortConfig,
  PriceComparisonData,
  oracleNames,
} from './crossOracleConfig';

interface PriceStats {
  avg: number;
  max: number;
  min: number;
  range: number;
  stdDev: number;
  median: number;
}

interface UseSortingReturn {
  sortConfig: SortConfig;
  handleSort: (field: SortField) => void;
  getSortIcon: (field: SortField) => React.ReactNode;
  sortedPriceData: PriceComparisonData[];
}

export function useSorting(
  priceData: PriceComparisonData[],
  priceStats: PriceStats | null
): UseSortingReturn {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: null });

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        if (prev.direction === 'asc') {
          return { field, direction: 'desc' };
        } else if (prev.direction === 'desc') {
          return { field, direction: null };
        }
      }
      return { field, direction: 'asc' };
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    if (sortConfig.direction === 'asc') {
      return (
        <svg
          className="w-4 h-4 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    if (sortConfig.direction === 'desc') {
      return (
        <svg
          className="w-4 h-4 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
    return null;
  };

  const sortedPriceData = useMemo(() => {
    if (!sortConfig.direction) return priceData;

    return [...priceData].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortConfig.field) {
        case 'name':
          aValue = oracleNames[a.provider];
          bValue = oracleNames[b.provider];
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'deviation':
          aValue = priceStats ? Math.abs((a.price - priceStats.avg) / priceStats.avg) * 100 : 0;
          bValue = priceStats ? Math.abs((b.price - priceStats.avg) / priceStats.avg) * 100 : 0;
          break;
        case 'confidence':
          aValue = a.confidence || 0;
          bValue = b.confidence || 0;
          break;
        case 'responseTime':
          aValue = a.responseTime;
          bValue = b.responseTime;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [priceData, sortConfig, priceStats]);

  return {
    sortConfig,
    handleSort,
    getSortIcon,
    sortedPriceData,
  };
}
