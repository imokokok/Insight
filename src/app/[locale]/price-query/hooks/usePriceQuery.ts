'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import { usePreferences } from '@/hooks';
import { useFavorites, type FavoriteConfig } from '@/hooks';
import { useTranslations } from '@/i18n';
import {
  OracleProvider,
  Blockchain,
  type PriceData,
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
  RedStoneClient,
  DIAClient,
  TellorClient,
  ChronicleClient,
  WINkLinkClient,
} from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import { useUser } from '@/stores/authStore';
import {
  saveQueryHistory,
  getQueryHistory,
  clearQueryHistory,
  type QueryHistoryItem,
} from '@/utils/queryHistory';
import { parseQueryParams, updateUrlParams, type QueryConfig } from '@/utils/urlParams';

import { type QueryResult, providerNames, chainNames, oracleI18nKeys } from '../constants';

const logger = createLogger('price-query-hook');

export interface QueryError {
  provider: OracleProvider;
  chain: Blockchain;
  error: string;
}

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH]: new PythClient(),
  [OracleProvider.API3]: new API3Client(),
  [OracleProvider.REDSTONE]: new RedStoneClient(),
  [OracleProvider.DIA]: new DIAClient(),
  [OracleProvider.TELLOR]: new TellorClient(),
  [OracleProvider.CHRONICLE]: new ChronicleClient(),
  [OracleProvider.WINKLINK]: new WINkLinkClient(),
};

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

export interface UsePriceQueryReturn {
  // State
  selectedOracles: OracleProvider[];
  setSelectedOracles: (oracles: OracleProvider[]) => void;
  selectedChains: Blockchain[];
  setSelectedChains: (chains: Blockchain[]) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (timeRange: number) => void;
  queryResults: QueryResult[];
  historicalData: Partial<Record<string, PriceData[]>>;
  isLoading: boolean;
  filterText: string;
  setFilterText: (text: string) => void;
  sortField: 'oracle' | 'blockchain' | 'price' | 'timestamp';
  sortDirection: 'asc' | 'desc';
  hiddenSeries: Set<string>;
  setHiddenSeries: (series: Set<string>) => void;
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
  queryErrors: QueryError[];
  clearErrors: () => void;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  historyItems: QueryHistoryItem[];
  selectedRow: string | null;
  setSelectedRow: (row: string | null) => void;
  isCompareMode: boolean;
  setIsCompareMode: (mode: boolean) => void;
  compareTimeRange: number;
  setCompareTimeRange: (timeRange: number) => void;
  compareHistoricalData: Partial<Record<string, PriceData[]>>;
  compareQueryResults: QueryResult[];
  showBaseline: boolean;
  setShowBaseline: (show: boolean) => void;
  showExportConfig: boolean;
  setShowExportConfig: (show: boolean) => void;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  timeComparisonConfig: TimeComparisonConfig;
  setTimeComparisonConfig: (config: TimeComparisonConfig) => void;
  urlParamsParsed: boolean;
  primaryDataFetchTime: Date | null;
  compareDataFetchTime: Date | null;
  // Favorites
  user: ReturnType<typeof useUser>;
  symbolFavorites: ReturnType<typeof useFavorites>['favorites'];
  currentFavoriteConfig: FavoriteConfig;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleApplyFavorite: (config: FavoriteConfig) => void;

  // Computed values
  chartData: ChartDataPoint[];
  compareChartData: ChartDataPoint[];
  sortedQueryResults: QueryResult[];
  filteredQueryResults: QueryResult[];
  validPrices: number[];
  avgPrice: number;
  avgChange24hPercent: number | undefined;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  compareValidPrices: number[];
  compareAvgPrice: number;
  compareAvgChange24hPercent: number | undefined;
  compareMaxPrice: number;
  compareMinPrice: number;
  comparePriceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  supportedChainsBySelectedOracles: Set<Blockchain>;

  // Actions
  toggleSeries: (seriesName: string) => void;
  handleSort: (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => void;
  fetchQueryData: () => Promise<void>;
  handleHistorySelect: (item: QueryHistoryItem) => void;
  handleClearHistory: () => void;
  generateFilename: (extension: string) => string;
  handleExportCSV: () => void;
  handleExportJSON: () => void;
}

export interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

export function usePriceQuery(): UsePriceQueryReturn {
  const t = useTranslations();
  const { preferences, isLoading: isPrefsLoading } = usePreferences();
  const user = useUser();
  const { favorites: symbolFavorites } = useFavorites({ configType: 'symbol' });

  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
  ]);
  const [selectedChains, setSelectedChains] = useState<Blockchain[]>([Blockchain.ETHEREUM]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [historicalData, setHistoricalData] = useState<Partial<Record<string, PriceData[]>>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>('');
  const [sortField, setSortField] = useState<'oracle' | 'blockchain' | 'price' | 'timestamp'>(
    'oracle'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [queryStartTime, setQueryStartTime] = useState<number | null>(null);
  const [queryDuration, setQueryDuration] = useState<number | null>(null);
  const [queryProgress, setQueryProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });
  const [currentQueryTarget, setCurrentQueryTarget] = useState<{
    oracle: OracleProvider | null;
    chain: Blockchain | null;
  }>({ oracle: null, chain: null });
  const [queryErrors, setQueryErrors] = useState<QueryError[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareTimeRange, setCompareTimeRange] = useState<number>(24);
  const [compareHistoricalData, setCompareHistoricalData] = useState<
    Partial<Record<string, PriceData[]>>
  >({});
  const [compareQueryResults, setCompareQueryResults] = useState<QueryResult[]>([]);
  const [showBaseline, setShowBaseline] = useState<boolean>(false);
  const [showExportConfig, setShowExportConfig] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [primaryDataFetchTime, setPrimaryDataFetchTime] = useState<Date | null>(null);
  const [compareDataFetchTime, setCompareDataFetchTime] = useState<Date | null>(null);

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

  const [urlParamsParsed, setUrlParamsParsed] = useState(false);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const prevParamsRef = useRef<string>('');
  const selectedOraclesRef = useRef<OracleProvider[]>(selectedOracles);
  const selectedChainsRef = useRef<Blockchain[]>(selectedChains);
  const selectedSymbolRef = useRef<string>(selectedSymbol);
  const selectedTimeRangeRef = useRef<number>(selectedTimeRange);
  const isCompareModeRef = useRef<boolean>(isCompareMode);
  const compareTimeRangeRef = useRef<number>(compareTimeRange);
  const abortControllerRef = useRef<AbortController | null>(null);

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
  }, [selectedOracles, selectedChains, selectedSymbol, selectedTimeRange, isCompareMode, compareTimeRange]);

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

  const generateFilename = useCallback(
    (extension: string): string => {
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
      return `price-query-${selectedSymbol}-${timestamp}.${extension}`;
    },
    [selectedSymbol]
  );

  const handleExportCSV = useCallback(() => {
    const csvLines: string[] = [];
    csvLines.push(`=== ${t('priceQuery.export.header')} ===`);
    const headers = [
      t('priceQuery.export.oracle'),
      t('priceQuery.export.blockchain'),
      t('priceQuery.export.price'),
      t('priceQuery.export.timestamp'),
      t('priceQuery.export.source'),
    ];
    csvLines.push(headers.join(','));

    queryResults.forEach((result) => {
      const row = [
        providerNames[result.provider],
        chainNames[result.chain],
        result.priceData.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        }),
        new Date(result.priceData.timestamp).toLocaleString(),
        result.priceData.source || '',
      ];
      csvLines.push(row.join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', generateFilename('csv'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [queryResults, generateFilename, t]);

  const handleExportJSON = useCallback(() => {
    const exportData = {
      metadata: {
        symbol: selectedSymbol,
        selectedOracles: selectedOracles.map((o) => providerNames[o]),
        selectedChains: selectedChains.map((c) => chainNames[c]),
        exportTimestamp: new Date().toISOString(),
      },
      results: queryResults.map((result) => ({
        oracle: providerNames[result.provider],
        blockchain: chainNames[result.chain],
        price: result.priceData.price,
        timestamp: new Date(result.priceData.timestamp).toISOString(),
        source: result.priceData.source,
      })),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', generateFilename('json'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [queryResults, selectedSymbol, selectedOracles, selectedChains, generateFilename]);

  const fetchQueryData = useCallback(async () => {
    const currentSelectedOracles = selectedOraclesRef.current;
    const currentSelectedChains = selectedChainsRef.current;
    const currentSelectedSymbol = selectedSymbolRef.current;
    const currentSelectedTimeRange = selectedTimeRangeRef.current;
    const currentIsCompareMode = isCompareModeRef.current;
    const currentCompareTimeRange = compareTimeRangeRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    const startTime = Date.now();
    setQueryStartTime(startTime);
    setQueryDuration(null);
    setQueryProgress({ completed: 0, total: 0 });
    setCurrentQueryTarget({ oracle: null, chain: null });

    let totalQueries = 0;
    for (const provider of currentSelectedOracles) {
      const client = oracleClients[provider];
      const supportedChains = client.supportedChains;
      for (const chain of currentSelectedChains) {
        if (supportedChains.includes(chain)) {
          totalQueries++;
        }
      }
    }

    const actualTotalQueries = currentIsCompareMode ? totalQueries * 2 : totalQueries;
    setQueryProgress({ completed: 0, total: actualTotalQueries });

    try {
      const results: QueryResult[] = [];
      const histories: Partial<Record<string, PriceData[]>> = {};
      let completedQueries = 0;

      for (const provider of currentSelectedOracles) {
        const client = oracleClients[provider];
        const supportedChains = client.supportedChains;

        for (const chain of currentSelectedChains) {
          if (supportedChains.includes(chain)) {
            if (!isMounted.current) return;
            setCurrentQueryTarget({ oracle: provider, chain: chain });
            try {
              const price = await client.getPrice(currentSelectedSymbol, chain);
              results.push({
                provider,
                chain,
                priceData: price,
              });

              const history = await client.getHistoricalPrices(
                currentSelectedSymbol,
                chain,
                currentSelectedTimeRange
              );
              const key = `${provider}-${chain}`;
              histories[key] = history;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              setQueryErrors((prev) => [
                ...prev,
                {
                  provider,
                  chain,
                  error: errorMessage,
                },
              ]);
              logger.error(
                `Error fetching ${provider} on ${chain}`,
                error instanceof Error ? error : new Error(String(error))
              );
            }
            completedQueries++;
            if (isMounted.current) {
              setQueryProgress({ completed: completedQueries, total: actualTotalQueries });
            }
          }
        }
      }

      if (!isMounted.current) return;
      setQueryResults(results);
      setHistoricalData(histories);
      setPrimaryDataFetchTime(new Date());

      if (currentIsCompareMode) {
        const compareResults: QueryResult[] = [];
        const compareHistories: Partial<Record<string, PriceData[]>> = {};

        for (const provider of currentSelectedOracles) {
          const client = oracleClients[provider];
          const supportedChains = client.supportedChains;

          for (const chain of currentSelectedChains) {
            if (supportedChains.includes(chain)) {
              if (!isMounted.current) return;
              setCurrentQueryTarget({ oracle: provider, chain: chain });
              try {
                const price = await client.getPrice(currentSelectedSymbol, chain);
                compareResults.push({
                  provider,
                  chain,
                  priceData: price,
                });

                const history = await client.getHistoricalPrices(
                  currentSelectedSymbol,
                  chain,
                  currentCompareTimeRange
                );
                const key = `${provider}-${chain}`;
                compareHistories[key] = history;
              } catch (error) {
                logger.error(
                  `Error fetching compare data ${provider} on ${chain}`,
                  error instanceof Error ? error : new Error(String(error))
                );
              }
              completedQueries++;
              if (isMounted.current) {
                setQueryProgress({ completed: completedQueries, total: actualTotalQueries });
              }
            }
          }
        }

        if (!isMounted.current) return;
        setCompareQueryResults(compareResults);
        setCompareHistoricalData(compareHistories);
        setCompareDataFetchTime(new Date());
      } else {
        setCompareQueryResults([]);
        setCompareHistoricalData({});
      }

      if (results.length > 0) {
        saveQueryHistory({
          oracles: currentSelectedOracles,
          chains: currentSelectedChains,
          symbol: currentSelectedSymbol,
          timeRange: currentSelectedTimeRange,
        });
        setHistoryItems(getQueryHistory());
      }
    } catch (error) {
      logger.error(
        'Error fetching query data',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setQueryDuration(Date.now() - startTime);
        setCurrentQueryTarget({ oracle: null, chain: null });
      }
    }
  }, []);

  useEffect(() => {
    if (!urlParamsParsed) return;

    const paramsSignature = JSON.stringify({
      oracles: selectedOracles,
      chains: selectedChains,
      symbol: selectedSymbol,
      timeRange: selectedTimeRange,
    });

    if (prevParamsRef.current !== paramsSignature) {
      prevParamsRef.current = paramsSignature;
      fetchQueryData();
    }
  }, [urlParamsParsed, selectedOracles, selectedChains, selectedSymbol, selectedTimeRange, fetchQueryData]);

  useEffect(() => {
    setHistoryItems(getQueryHistory());
  }, []);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const chartData = useMemo((): ChartDataPoint[] => {
    if (Object.keys(historicalData).length === 0) return [];

    const timestamps = new Set<number>();
    Object.values(historicalData).forEach((history) => {
      history?.forEach((price) => timestamps.add(price.timestamp));
    });
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const getTimeFormat = (): Intl.DateTimeFormatOptions => {
      if (selectedTimeRange <= 6) {
        return { hour: '2-digit', minute: '2-digit' };
      } else if (selectedTimeRange <= 24) {
        return { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      } else {
        return { month: 'short', day: 'numeric' };
      }
    };

    const lastValidValues: Record<string, number> = {};

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: new Date(timestamp).toLocaleString([], getTimeFormat()),
      };

      queryResults.forEach(({ provider, chain }) => {
        const key = `${provider}-${chain}`;
        const history = historicalData[key];
        const price = history?.find((p) => p.timestamp === timestamp);
        const label = `${providerNames[provider]} (${chainNames[chain]})`;

        if (price) {
          lastValidValues[label] = price.price;
          dataPoint[label] = price.price;
        } else if (lastValidValues[label] !== undefined) {
          dataPoint[label] = lastValidValues[label];
        }
      });

      return dataPoint;
    });
  }, [historicalData, queryResults, selectedTimeRange]);

  const compareChartData = useMemo((): ChartDataPoint[] => {
    if (!isCompareMode || Object.keys(compareHistoricalData).length === 0) return [];

    const timestamps = new Set<number>();
    Object.values(compareHistoricalData).forEach((history) => {
      history?.forEach((price) => timestamps.add(price.timestamp));
    });
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const getTimeFormat = (): Intl.DateTimeFormatOptions => {
      if (compareTimeRange <= 6) {
        return { hour: '2-digit', minute: '2-digit' };
      } else if (compareTimeRange <= 24) {
        return { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      } else {
        return { month: 'short', day: 'numeric' };
      }
    };

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: new Date(timestamp).toLocaleString([], getTimeFormat()),
      };

      compareQueryResults.forEach(({ provider, chain }) => {
        const key = `${provider}-${chain}`;
        const history = compareHistoricalData[key];
        const price = history?.find((p) => p.timestamp === timestamp);
        if (price) {
          const label = `${providerNames[provider]} (${chainNames[chain]})`;
          dataPoint[label] = price.price;
        }
      });

      return dataPoint;
    });
  }, [compareHistoricalData, compareQueryResults, compareTimeRange, isCompareMode]);

  const sortedQueryResults = useMemo(() => {
    return [...queryResults].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'oracle':
          comparison = providerNames[a.provider].localeCompare(providerNames[b.provider]);
          break;
        case 'blockchain':
          comparison = chainNames[a.chain].localeCompare(chainNames[b.chain]);
          break;
        case 'price':
          comparison = a.priceData.price - b.priceData.price;
          break;
        case 'timestamp':
          comparison = a.priceData.timestamp - b.priceData.timestamp;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [queryResults, sortField, sortDirection]);

  const filteredQueryResults = useMemo(() => {
    if (!filterText.trim()) return sortedQueryResults;
    const lowerFilter = filterText.toLowerCase();
    return sortedQueryResults.filter((result) => {
      const oracleName = providerNames[result.provider].toLowerCase();
      const chainName = chainNames[result.chain].toLowerCase();
      const oracleTranslation = t(`navbar.${oracleI18nKeys[result.provider]}`).toLowerCase();
      const chainTranslation = t(`blockchain.${result.chain.toLowerCase()}`).toLowerCase();
      return (
        oracleName.includes(lowerFilter) ||
        chainName.includes(lowerFilter) ||
        oracleTranslation.includes(lowerFilter) ||
        chainTranslation.includes(lowerFilter)
      );
    });
  }, [sortedQueryResults, filterText, t]);

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

  const validPrices = useMemo(() => {
    return queryResults.map((r) => r.priceData.price).filter((p) => p > 0);
  }, [queryResults]);

  const avgPrice = useMemo(() => {
    return validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
  }, [validPrices]);

  const avgChange24hPercent = useMemo(() => {
    const changes = queryResults
      .map((r) => r.priceData.change24hPercent)
      .filter((c): c is number => c !== undefined);
    return changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : undefined;
  }, [queryResults]);

  const maxPrice = useMemo(() => {
    return validPrices.length > 0 ? Math.max(...validPrices) : 0;
  }, [validPrices]);

  const minPrice = useMemo(() => {
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
  }, [validPrices]);

  const compareValidPrices = useMemo(() => {
    return compareQueryResults.map((r) => r.priceData.price).filter((p) => p > 0);
  }, [compareQueryResults]);

  const compareAvgPrice = useMemo(() => {
    return compareValidPrices.length > 0
      ? compareValidPrices.reduce((a, b) => a + b, 0) / compareValidPrices.length
      : 0;
  }, [compareValidPrices]);

  const compareAvgChange24hPercent = useMemo(() => {
    const changes = compareQueryResults
      .map((r) => r.priceData.change24hPercent)
      .filter((c): c is number => c !== undefined);
    return changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : undefined;
  }, [compareQueryResults]);

  const compareMaxPrice = useMemo(() => {
    return compareValidPrices.length > 0 ? Math.max(...compareValidPrices) : 0;
  }, [compareValidPrices]);

  const compareMinPrice = useMemo(() => {
    return compareValidPrices.length > 0 ? Math.min(...compareValidPrices) : 0;
  }, [compareValidPrices]);

  const comparePriceRange = useMemo(() => {
    return compareMaxPrice - compareMinPrice;
  }, [compareMaxPrice, compareMinPrice]);

  const priceRange = useMemo(() => {
    return maxPrice - minPrice;
  }, [maxPrice, minPrice]);

  const calculateVariance = (prices: number[], mean: number): number => {
    if (prices.length < 2) return 0;
    const sumSquaredDiff = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
    return sumSquaredDiff / prices.length;
  };

  const calculateStandardDeviation = (variance: number): number => {
    return Math.sqrt(variance);
  };

  const variance = useMemo(() => {
    return calculateVariance(validPrices, avgPrice);
  }, [validPrices, avgPrice]);

  const standardDeviation = useMemo(() => {
    return calculateStandardDeviation(variance);
  }, [variance]);

  const standardDeviationPercent = useMemo(() => {
    return avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0;
  }, [standardDeviation, avgPrice]);

  const supportedChainsBySelectedOracles = useMemo(() => {
    if (selectedOracles.length === 0) return new Set<Blockchain>();
    const supported = new Set<Blockchain>();
    selectedOracles.forEach((oracle) => {
      const client = oracleClients[oracle];
      client.supportedChains.forEach((chain) => supported.add(chain));
    });
    return supported;
  }, [selectedOracles]);

  const handleHistorySelect = useCallback((item: QueryHistoryItem) => {
    setSelectedOracles(item.oracles);
    setSelectedChains(item.chains);
    setSelectedSymbol(item.symbol);
    setSelectedTimeRange(item.timeRange);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearQueryHistory();
    setHistoryItems([]);
  }, []);

  const currentFavoriteConfig: FavoriteConfig = useMemo(
    () => ({
      symbol: selectedSymbol,
      selectedOracles: selectedOracles.map((o) => o as string),
      chains: selectedChains.map((c) => c as string),
    }),
    [selectedSymbol, selectedOracles, selectedChains]
  );

  const handleApplyFavorite = useCallback((config: FavoriteConfig) => {
    if (config.symbol) {
      setSelectedSymbol(config.symbol);
    }
    if (config.selectedOracles) {
      setSelectedOracles(config.selectedOracles as OracleProvider[]);
    }
    if (config.chains) {
      setSelectedChains(config.chains as Blockchain[]);
    }
    setShowFavoritesDropdown(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        favoritesDropdownRef.current &&
        !favoritesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFavoritesDropdown(false);
      }
    };
    if (showFavoritesDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFavoritesDropdown]);

  return {
    selectedOracles,
    setSelectedOracles,
    selectedChains,
    setSelectedChains,
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeRange,
    setSelectedTimeRange,
    queryResults,
    historicalData,
    isLoading,
    filterText,
    setFilterText,
    sortField,
    sortDirection,
    hiddenSeries,
    setHiddenSeries,
    queryDuration,
    queryProgress,
    currentQueryTarget,
    showHistory,
    setShowHistory,
    historyItems,
    selectedRow,
    setSelectedRow,
    isCompareMode,
    setIsCompareMode,
    compareTimeRange,
    setCompareTimeRange,
    compareHistoricalData,
    compareQueryResults,
    showBaseline,
    setShowBaseline,
    showExportConfig,
    setShowExportConfig,
    chartContainerRef,
    timeComparisonConfig,
    setTimeComparisonConfig,
    urlParamsParsed,
    chartData,
    compareChartData,
    sortedQueryResults,
    filteredQueryResults,
    validPrices,
    avgPrice,
    avgChange24hPercent,
    maxPrice,
    minPrice,
    priceRange,
    compareValidPrices,
    compareAvgPrice,
    compareAvgChange24hPercent,
    compareMaxPrice,
    compareMinPrice,
    comparePriceRange,
    variance,
    standardDeviation,
    standardDeviationPercent,
    supportedChainsBySelectedOracles,
    toggleSeries,
    handleSort,
    fetchQueryData,
    handleHistorySelect,
    handleClearHistory,
    generateFilename,
    handleExportCSV,
    handleExportJSON,
    user,
    symbolFavorites,
    currentFavoriteConfig,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    favoritesDropdownRef,
    handleApplyFavorite,
    queryErrors,
    clearErrors: () => setQueryErrors([]),
    primaryDataFetchTime,
    compareDataFetchTime,
  };
}
