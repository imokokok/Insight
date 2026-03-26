/**
 * @fileoverview useFilterState Hook
 * @description 管理筛选状态
 */

import { useState, useRef, RefObject } from 'react';

import { type OracleProvider } from '@/types/oracle';

import { type DeviationFilter, type SortColumn, type SortDirection } from '../../constants';

export function useFilterState() {
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deviationFilter, setDeviationFilter] = useState<DeviationFilter>('all');
  const [oracleFilter, setOracleFilter] = useState<OracleProvider | 'all'>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  return {
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    deviationFilter,
    setDeviationFilter,
    oracleFilter,
    setOracleFilter,
    expandedRow,
    setExpandedRow,
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    filterPanelRef,
  };
}
