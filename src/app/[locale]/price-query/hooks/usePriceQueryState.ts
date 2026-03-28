'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import { usePreferences } from '@/hooks';
import { OracleProvider, Blockchain } from '@/lib/oracles';
import { parseQueryParams, updateUrlParams, type QueryConfig } from '@/utils/urlParams';

export interface TimeComparisonConfig {
  primaryPeriod: {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
    range: '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';
  };
  comparisonPeriod: {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
    range: '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';
  };
  comparisonType: 'previous' | 'custom' | 'year_over_year';
}

export interface UsePriceQueryStateReturn {
  selectedOracles: OracleProvider[];
  setSelectedOracles: (oracles: OracleProvider[]) => void;
  selectedChains: Blockchain[];
  setSelectedChains: (chains: Blockchain[]) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (timeRange: number) => void;
  filterText: string;
  setFilterText: (text: string) => void;
  sortField: 'oracle' | 'blockchain' | 'price' | 'timestamp';
  sortDirection: 'asc' | 'desc';
  hiddenSeries: Set<string>;
  setHiddenSeries: (series: Set<string>) => void;
  isCompareMode: boolean;
  setIsCompareMode: (mode: boolean) => void;
  compareTimeRange: number;
  setCompareTimeRange: (timeRange: number) => void;
  showBaseline: boolean;
  setShowBaseline: (show: boolean) => void;
  timeComparisonConfig: TimeComparisonConfig;
  setTimeComparisonConfig: (config: TimeComparisonConfig) => void;
  urlParamsParsed: boolean;
  selectedRow: string | null;
  setSelectedRow: (row: string | null) => void;
  toggleSeries: (seriesName: string) => void;
  handleSort: (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => void;
  selectedOraclesRef: React.MutableRefObject<OracleProvider[]>;
  selectedChainsRef: React.MutableRefObject<Blockchain[]>;
  selectedSymbolRef: React.MutableRefObject<string>;
  selectedTimeRangeRef: React.MutableRefObject<number>;
  isCompareModeRef: React.MutableRefObject<boolean>;
  compareTimeRangeRef: React.MutableRefObject<number>;
}

export function usePriceQueryState(): UsePriceQueryStateReturn {
  const { preferences, isLoading: isPrefsLoading } = usePreferences();

  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
  ]);
  const [selectedChains, setSelectedChains] = useState<Blockchain[]>([Blockchain.ETHEREUM]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24);
  const [filterText, setFilterText] = useState<string>('');
  const [sortField, setSortField] = useState<'oracle' | 'blockchain' | 'price' | 'timestamp'>(
    'oracle'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareTimeRange, setCompareTimeRange] = useState<number>(24);
  const [showBaseline, setShowBaseline] = useState<boolean>(false);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [urlParamsParsed, setUrlParamsParsed] = useState(false);

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

  const selectedOraclesRef = useRef<OracleProvider[]>(selectedOracles);
  const selectedChainsRef = useRef<Blockchain[]>(selectedChains);
  const selectedSymbolRef = useRef<string>(selectedSymbol);
  const selectedTimeRangeRef = useRef<number>(selectedTimeRange);
  const isCompareModeRef = useRef<boolean>(isCompareMode);
  const compareTimeRangeRef = useRef<number>(compareTimeRange);

  const applyPreferences = useCallback(() => {
    if (isPrefsLoading) return;

    const oracleMapping: Record<string, OracleProvider> = {
      chainlink: OracleProvider.CHAINLINK,
      'band-protocol': OracleProvider.BAND_PROTOCOL,
      uma: OracleProvider.UMA,
      pyth: OracleProvider.PYTH,
      api3: OracleProvider.API3,
      redstone: OracleProvider.REDSTONE,
      dia: OracleProvider.DIA,
      tellor: OracleProvider.TELLOR,
      chronicle: OracleProvider.CHRONICLE,
      winklink: OracleProvider.WINKLINK,
    };

    const timeRangeMapping: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168,
      '30d': 720,
    };

    const defaultOracle = oracleMapping[preferences.defaultOracle] || OracleProvider.CHAINLINK;
    const defaultTimeRange = timeRangeMapping[preferences.defaultTimeRange] || 24;
    const defaultSymbol = preferences.defaultSymbol.split('/')[0] || 'BTC';

    setSelectedOracles([defaultOracle]);
    setSelectedSymbol(defaultSymbol);
    setSelectedTimeRange(defaultTimeRange);
  }, [preferences, isPrefsLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const config = parseQueryParams(window.location.search);

    const hasUrlParams =
      config.oracles?.length || config.chains?.length || config.symbol || config.timeRange;

    if (!hasUrlParams) {
      applyPreferences();
    } else {
      setSelectedOracles((prev) =>
        config.oracles && config.oracles.length > 0 ? config.oracles : prev
      );
      setSelectedChains((prev) =>
        config.chains && config.chains.length > 0 ? config.chains : prev
      );
      setSelectedSymbol((prev) => (config.symbol ? config.symbol : prev));
      setSelectedTimeRange((prev) => (config.timeRange ? config.timeRange : prev));
    }
    setUrlParamsParsed(true);
  }, [applyPreferences]);

  useEffect(() => {
    selectedOraclesRef.current = selectedOracles;
    selectedChainsRef.current = selectedChains;
    selectedSymbolRef.current = selectedSymbol;
    selectedTimeRangeRef.current = selectedTimeRange;
    isCompareModeRef.current = isCompareMode;
    compareTimeRangeRef.current = compareTimeRange;
  }, [
    selectedOracles,
    selectedChains,
    selectedSymbol,
    selectedTimeRange,
    isCompareMode,
    compareTimeRange,
  ]);

  useEffect(() => {
    if (!urlParamsParsed) return;
    const config: QueryConfig = {
      oracles: selectedOracles,
      chains: selectedChains,
      symbol: selectedSymbol,
      timeRange: selectedTimeRange,
    };
    updateUrlParams(config);
  }, [selectedOracles, selectedChains, selectedSymbol, selectedTimeRange, urlParamsParsed]);

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

  return {
    selectedOracles,
    setSelectedOracles,
    selectedChains,
    setSelectedChains,
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeRange,
    setSelectedTimeRange,
    filterText,
    setFilterText,
    sortField,
    sortDirection,
    hiddenSeries,
    setHiddenSeries,
    isCompareMode,
    setIsCompareMode,
    compareTimeRange,
    setCompareTimeRange,
    showBaseline,
    setShowBaseline,
    timeComparisonConfig,
    setTimeComparisonConfig,
    urlParamsParsed,
    selectedRow,
    setSelectedRow,
    toggleSeries,
    handleSort,
    selectedOraclesRef,
    selectedChainsRef,
    selectedSymbolRef,
    selectedTimeRangeRef,
    isCompareModeRef,
    compareTimeRangeRef,
  };
}
