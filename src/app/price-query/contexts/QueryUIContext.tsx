'use client';

import { createContext, useContext, useMemo, useState, useCallback, useRef } from 'react';

import { type TimeComparisonConfig } from '../hooks/usePriceQueryState';

interface QueryUIContextValue {
  filterText: string;
  setFilterText: (text: string) => void;
  sortField: 'oracle' | 'blockchain' | 'price' | 'timestamp';
  sortDirection: 'asc' | 'desc';
  hiddenSeries: Set<string>;
  setHiddenSeries: (series: Set<string>) => void;
  toggleSeries: (seriesName: string) => void;
  handleSort: (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => void;
  selectedRow: string | null;
  setSelectedRow: (row: string | null) => void;
  showBaseline: boolean;
  setShowBaseline: (show: boolean) => void;
  timeComparisonConfig: TimeComparisonConfig;
  setTimeComparisonConfig: (config: TimeComparisonConfig) => void;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
}

const QueryUIContext = createContext<QueryUIContextValue | null>(null);

export function QueryUIProvider({ children }: { children: React.ReactNode }) {
  const [filterText, setFilterText] = useState<string>('');
  const [sortField, setSortField] = useState<'oracle' | 'blockchain' | 'price' | 'timestamp'>(
    'oracle'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [showBaseline, setShowBaseline] = useState<boolean>(false);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);

  const [timeComparisonConfig, setTimeComparisonConfig] = useState<TimeComparisonConfig>(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return {
      primaryPeriod: {
        id: 'primary-24h',
        label: 'Last 24h',
        startDate: start,
        endDate: now,
        range: '24h',
      },
      comparisonPeriod: {
        id: 'comparison-24h',
        label: 'Previous Period',
        startDate: new Date(start.getTime() - 24 * 60 * 60 * 1000),
        endDate: start,
        range: '24h',
      },
      comparisonType: 'previous',
    };
  });

  const favoritesDropdownRef = useRef<HTMLDivElement>(null);

  const toggleSeries = useCallback((seriesName: string) => {
    setHiddenSeries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName);
      } else {
        newSet.add(seriesName);
      }
      return newSet;
    });
  }, []);

  const handleSort = useCallback((field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return prev;
      } else {
        setSortDirection('asc');
        return field;
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      filterText,
      setFilterText,
      sortField,
      sortDirection,
      hiddenSeries,
      setHiddenSeries,
      toggleSeries,
      handleSort,
      selectedRow,
      setSelectedRow,
      showBaseline,
      setShowBaseline,
      timeComparisonConfig,
      setTimeComparisonConfig,
      showFavoritesDropdown,
      setShowFavoritesDropdown,
      favoritesDropdownRef,
    }),
    [
      filterText,
      sortField,
      sortDirection,
      hiddenSeries,
      toggleSeries,
      handleSort,
      selectedRow,
      showBaseline,
      timeComparisonConfig,
      showFavoritesDropdown,
    ]
  );

  return <QueryUIContext.Provider value={value}>{children}</QueryUIContext.Provider>;
}

export function useQueryUI() {
  const context = useContext(QueryUIContext);
  if (!context) {
    throw new Error('useQueryUI must be used within a QueryUIProvider');
  }
  return context;
}
