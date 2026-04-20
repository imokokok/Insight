'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import { usePreferences } from '@/hooks';
import { parseQueryParams, updateUrlParams, type QueryConfig } from '@/lib/utils/urlParams';
import { OracleProvider, Blockchain } from '@/types/oracle';

export interface TimeComparisonConfig {
  primaryPeriod: {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
    range: '1h' | '6h' | '24h' | '7d' | 'custom';
  };
  comparisonPeriod: {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
    range: '1h' | '6h' | '24h' | '7d' | 'custom';
  };
  comparisonType: 'previous' | 'custom';
}

interface UsePriceQueryStateReturn {
  selectedOracle: OracleProvider | null;
  setSelectedOracle: (oracle: OracleProvider | null) => void;
  selectedChain: Blockchain | null;
  setSelectedChain: (chain: Blockchain | null) => void;
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
  selectedOracleRef: React.MutableRefObject<OracleProvider | null>;
  selectedChainRef: React.MutableRefObject<Blockchain | null>;
  selectedSymbolRef: React.MutableRefObject<string>;
  selectedTimeRangeRef: React.MutableRefObject<number>;
  isCompareModeRef: React.MutableRefObject<boolean>;
  compareTimeRangeRef: React.MutableRefObject<number>;
}

function usePriceQueryState(): UsePriceQueryStateReturn {
  const { preferences } = usePreferences();

  const [selectedOracle, _setSelectedOracle] = useState<OracleProvider | null>(
    OracleProvider.CHAINLINK
  );
  const [selectedChain, _setSelectedChain] = useState<Blockchain | null>(Blockchain.ETHEREUM);
  const [selectedSymbol, _setSelectedSymbol] = useState<string>('BTC');
  const [selectedTimeRange, _setSelectedTimeRange] = useState<number>(24);
  const [filterText, setFilterText] = useState<string>('');
  const [sortField, setSortField] = useState<'oracle' | 'blockchain' | 'price' | 'timestamp'>(
    'oracle'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [isCompareMode, _setIsCompareMode] = useState<boolean>(false);
  const [compareTimeRange, _setCompareTimeRange] = useState<number>(24);
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

  const selectedOracleRef = useRef<OracleProvider | null>(OracleProvider.CHAINLINK);
  const selectedChainRef = useRef<Blockchain | null>(Blockchain.ETHEREUM);
  const selectedSymbolRef = useRef<string>('BTC');
  const selectedTimeRangeRef = useRef<number>(24);
  const isCompareModeRef = useRef<boolean>(false);
  const compareTimeRangeRef = useRef<number>(24);

  const setSelectedOracle = useCallback((oracle: OracleProvider | null) => {
    selectedOracleRef.current = oracle;
    _setSelectedOracle(oracle);
  }, []);

  const setSelectedChain = useCallback((chain: Blockchain | null) => {
    selectedChainRef.current = chain;
    _setSelectedChain(chain);
  }, []);

  const setSelectedSymbol = useCallback((symbol: string) => {
    selectedSymbolRef.current = symbol;
    _setSelectedSymbol(symbol);
  }, []);

  const setSelectedTimeRange = useCallback((timeRange: number) => {
    selectedTimeRangeRef.current = timeRange;
    _setSelectedTimeRange(timeRange);
  }, []);

  const setIsCompareMode = useCallback((mode: boolean) => {
    isCompareModeRef.current = mode;
    _setIsCompareMode(mode);
  }, []);

  const setCompareTimeRange = useCallback((timeRange: number) => {
    compareTimeRangeRef.current = timeRange;
    _setCompareTimeRange(timeRange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const config = parseQueryParams(window.location.search);

    const hasUrlParams =
      config.oracles?.length || config.chains?.length || config.symbol || config.timeRange;

    if (!hasUrlParams) {
      const oracleMapping: Record<string, OracleProvider> = {
        chainlink: OracleProvider.CHAINLINK,
        pyth: OracleProvider.PYTH,
        api3: OracleProvider.API3,
        redstone: OracleProvider.REDSTONE,
        dia: OracleProvider.DIA,
        winklink: OracleProvider.WINKLINK,
        supra: OracleProvider.SUPRA,
      };

      const timeRangeMapping: Record<string, number> = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168,
      };

      const defaultOracle = oracleMapping[preferences.defaultOracle] || OracleProvider.CHAINLINK;
      const defaultTimeRange = timeRangeMapping[preferences.defaultTimeRange] || 24;
      const defaultSymbol = preferences.defaultSymbol.split('/')[0] || 'BTC';

      selectedOracleRef.current = defaultOracle;
      selectedChainRef.current = Blockchain.ETHEREUM;
      selectedSymbolRef.current = defaultSymbol;
      selectedTimeRangeRef.current = defaultTimeRange;
      requestAnimationFrame(() => {
        setSelectedOracle(defaultOracle);
        setSelectedSymbol(defaultSymbol);
        setSelectedTimeRange(defaultTimeRange);
        setUrlParamsParsed(true);
      });
    } else {
      const oracleFromUrl =
        config.oracles && config.oracles.length > 0 ? config.oracles[0] : selectedOracleRef.current;
      const chainFromUrl =
        config.chains && config.chains.length > 0 ? config.chains[0] : selectedChainRef.current;
      const symbolFromUrl = config.symbol || selectedSymbolRef.current;
      const timeRangeFromUrl = config.timeRange || selectedTimeRangeRef.current;

      selectedOracleRef.current = oracleFromUrl;
      selectedChainRef.current = chainFromUrl;
      selectedSymbolRef.current = symbolFromUrl;
      selectedTimeRangeRef.current = timeRangeFromUrl;

      requestAnimationFrame(() => {
        setSelectedOracle(oracleFromUrl);
        setSelectedChain(chainFromUrl);
        setSelectedSymbol(symbolFromUrl);
        setSelectedTimeRange(timeRangeFromUrl);
        setUrlParamsParsed(true);
      });
    }
  }, [
    preferences.defaultOracle,
    preferences.defaultTimeRange,
    preferences.defaultSymbol,
    setSelectedChain,
    setSelectedOracle,
    setSelectedSymbol,
    setSelectedTimeRange,
  ]);

  useEffect(() => {
    if (!urlParamsParsed) return;
    const config: QueryConfig = {
      oracles: selectedOracle ? [selectedOracle] : [],
      chains: selectedChain ? [selectedChain] : [],
      symbol: selectedSymbol,
      timeRange: selectedTimeRange,
    };
    updateUrlParams(config);
  }, [selectedOracle, selectedChain, selectedSymbol, selectedTimeRange, urlParamsParsed]);

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
    selectedOracle,
    setSelectedOracle,
    selectedChain,
    setSelectedChain,
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
    selectedOracleRef,
    selectedChainRef,
    selectedSymbolRef,
    selectedTimeRangeRef,
    isCompareModeRef,
    compareTimeRangeRef,
  };
}
