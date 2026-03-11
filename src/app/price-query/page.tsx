'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  OracleProvider,
  Blockchain,
  PriceData,
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
import {
  saveQueryHistory,
  getQueryHistory,
  clearQueryHistory,
  formatHistoryTime,
  QueryHistoryItem,
} from '@/utils/queryHistory';
import { parseQueryParams, updateUrlParams, QueryConfig } from '@/utils/urlParams';

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

const providerNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
};

const chainNames: Record<Blockchain, string> = {
  [Blockchain.ETHEREUM]: 'Ethereum',
  [Blockchain.ARBITRUM]: 'Arbitrum',
  [Blockchain.OPTIMISM]: 'Optimism',
  [Blockchain.POLYGON]: 'Polygon',
  [Blockchain.SOLANA]: 'Solana',
  [Blockchain.AVALANCHE]: 'Avalanche',
  [Blockchain.FANTOM]: 'Fantom',
  [Blockchain.CRONOS]: 'Cronos',
  [Blockchain.JUNO]: 'Juno',
  [Blockchain.COSMOS]: 'Cosmos',
  [Blockchain.OSMOSIS]: 'Osmosis',
};

const symbols = ['BTC', 'ETH', 'SOL', 'USDC'];

const chainColors: Record<Blockchain, string> = {
  [Blockchain.ETHEREUM]: '#6366F1',
  [Blockchain.ARBITRUM]: '#06B6D4',
  [Blockchain.OPTIMISM]: '#EF4444',
  [Blockchain.POLYGON]: '#A855F7',
  [Blockchain.SOLANA]: '#10B981',
  [Blockchain.AVALANCHE]: '#E84133',
  [Blockchain.FANTOM]: '#1969FF',
  [Blockchain.CRONOS]: '#002D74',
  [Blockchain.JUNO]: '#DC1FFF',
  [Blockchain.COSMOS]: '#2E3148',
  [Blockchain.OSMOSIS]: '#FAAB3B',
};

const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: '#3B82F6',
  [OracleProvider.BAND_PROTOCOL]: '#10B981',
  [OracleProvider.UMA]: '#F59E0B',
  [OracleProvider.PYTH_NETWORK]: '#8B5CF6',
  [OracleProvider.API3]: '#EC4899',
};

const TIME_RANGES = [
  { value: 1, key: 'timeRange1Hour', label: '1小时' },
  { value: 6, key: 'timeRange6Hours', label: '6小时' },
  { value: 24, key: 'timeRange24Hours', label: '24小时' },
  { value: 168, key: 'timeRange7Days', label: '7天' },
];

const DEVIATION_THRESHOLD = 0.01;

interface QueryResult {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData;
}

// Icons
const Icons = {
  currency: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  oracle: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
  blockchain: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  ),
  clock: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  download: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  refresh: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  arrowUp: () => (
    <svg
      className="w-3 h-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7 7 7" />
    </svg>
  ),
  arrowDown: () => (
    <svg
      className="w-3 h-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7-7-7" />
    </svg>
  ),
  chart: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
      />
    </svg>
  ),
  search: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  zoomIn: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
      />
    </svg>
  ),
  zoomOut: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
      />
    </svg>
  ),
  reset: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  image: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
};

export default function PriceQueryPage() {
  const { t } = useI18n();
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
  ]);
  const [selectedChains, setSelectedChains] = useState<Blockchain[]>([Blockchain.ETHEREUM]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [historicalData, setHistoricalData] = useState<Partial<Record<string, PriceData[]>>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>('');
  const [sortField, setSortField] = useState<'oracle' | 'blockchain' | 'price' | 'timestamp'>(
    'oracle'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const chartContainerRef = useRef<HTMLDivElement>(null);
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
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const config = parseQueryParams(window.location.search);
    if (config.oracles && config.oracles.length > 0) {
      setSelectedOracles(config.oracles);
    }
    if (config.chains && config.chains.length > 0) {
      setSelectedChains(config.chains);
    }
    if (config.symbol) {
      setSelectedSymbol(config.symbol);
    }
    if (config.timeRange) {
      setSelectedTimeRange(config.timeRange);
    }
    isInitialized.current = true;
  }, []);

  useEffect(() => {
    if (!isInitialized.current) return;
    const config: QueryConfig = {
      oracles: selectedOracles,
      chains: selectedChains,
      symbol: selectedSymbol,
      timeRange: selectedTimeRange,
    };
    updateUrlParams(config);
  }, [selectedOracles, selectedChains, selectedSymbol, selectedTimeRange]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const toggleSeries = (seriesName: string) => {
    setHiddenSeries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName);
      } else {
        newSet.add(seriesName);
      }
      return newSet;
    });
  };

  const generateFilename = useCallback(
    (extension: string): string => {
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
      return `price-query-${selectedSymbol}-${timestamp}.${extension}`;
    },
    [selectedSymbol]
  );

  const handleExportChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const chartElement = chartContainerRef.current;
      const svgElement = chartElement.querySelector('svg');
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = generateFilename('png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (error) {
      console.error('Failed to export chart:', error);
    }
  }, [selectedSymbol]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white border border-gray-200 shadow-lg p-3 min-w-[200px]">
        <div className="text-xs font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">
          {t('priceQuery.chart.tooltip.time')}: {label}
        </div>
        <div className="space-y-1.5">
          {payload.map((entry, index) => {
            return (
              <div key={index} className="flex items-start gap-2">
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">{entry.name}</div>
                  <div className="text-sm font-mono text-gray-700">
                    $
                    {Number(entry.value).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
          {t('priceQuery.chart.tooltip.dataPoints')}: {payload.length}
        </div>
      </div>
    );
  };

  const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string }> }) => {
    if (!payload) return null;

    return (
      <div className="flex flex-wrap justify-center gap-4 pt-4">
        {payload.map((entry, index) => {
          const isHidden = hiddenSeries.has(entry.value);
          return (
            <button
              key={index}
              onClick={() => toggleSeries(entry.value)}
              className={`flex items-center gap-2 px-2 py-1 transition-opacity cursor-pointer ${
                isHidden ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs">{entry.value}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const exportToCSV = () => {
    const csvLines: string[] = [];
    csvLines.push('=== 价格查询结果 ===');
    const headers = ['预言机', '区块链', '价格', '时间戳', '来源'];
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
  };

  const exportToJSON = () => {
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
  };

  const fetchQueryData = async () => {
    setLoading(true);
    const startTime = Date.now();
    setQueryStartTime(startTime);
    setQueryDuration(null);
    setQueryProgress({ completed: 0, total: 0 });
    setCurrentQueryTarget({ oracle: null, chain: null });

    let totalQueries = 0;
    for (const provider of selectedOracles) {
      const client = oracleClients[provider];
      const supportedChains = client.supportedChains;
      for (const chain of selectedChains) {
        if (supportedChains.includes(chain)) {
          totalQueries++;
        }
      }
    }
    setQueryProgress({ completed: 0, total: totalQueries });

    try {
      const results: QueryResult[] = [];
      const histories: Partial<Record<string, PriceData[]>> = {};
      let completedQueries = 0;

      for (const provider of selectedOracles) {
        const client = oracleClients[provider];
        const supportedChains = client.supportedChains;

        for (const chain of selectedChains) {
          if (supportedChains.includes(chain)) {
            setCurrentQueryTarget({ oracle: provider, chain: chain });
            try {
              const price = await client.getPrice(selectedSymbol, chain);
              results.push({
                provider,
                chain,
                priceData: price,
              });

              const history = await client.getHistoricalPrices(
                selectedSymbol,
                chain,
                selectedTimeRange
              );
              const key = `${provider}-${chain}`;
              histories[key] = history;
            } catch (error) {
              console.error(`Error fetching ${provider} on ${chain}:`, error);
            }
            completedQueries++;
            setQueryProgress({ completed: completedQueries, total: totalQueries });
          }
        }
      }

      setQueryResults(results);
      setHistoricalData(histories);

      if (results.length > 0) {
        saveQueryHistory({
          oracles: selectedOracles,
          chains: selectedChains,
          symbol: selectedSymbol,
          timeRange: selectedTimeRange,
        });
        setHistoryItems(getQueryHistory());
      }
    } catch (error) {
      console.error('Error fetching query data:', error);
    } finally {
      setLoading(false);
      setQueryDuration(Date.now() - startTime);
      setCurrentQueryTarget({ oracle: null, chain: null });
    }
  };

  useEffect(() => {
    fetchQueryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOracles, selectedChains, selectedSymbol, selectedTimeRange]);

  useEffect(() => {
    setHistoryItems(getQueryHistory());
  }, []);

  const chartData = useMemo(() => {
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

    return sortedTimestamps.map((timestamp) => {
      const dataPoint: Record<string, string | number> = {
        timestamp,
        time: new Date(timestamp).toLocaleString([], getTimeFormat()),
      };

      queryResults.forEach(({ provider, chain }) => {
        const key = `${provider}-${chain}`;
        const history = historicalData[key];
        const price = history?.find((p) => p.timestamp === timestamp);
        if (price) {
          const label = `${providerNames[provider]} (${chainNames[chain]})`;
          dataPoint[label] = price.price;
        }
      });

      return dataPoint;
    });
  }, [historicalData, queryResults, selectedTimeRange]);

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
      const oracleTranslation = t(`navbar.${result.provider.toLowerCase()}`).toLowerCase();
      const chainTranslation = t(`blockchain.${result.chain.toLowerCase()}`).toLowerCase();
      return (
        oracleName.includes(lowerFilter) ||
        chainName.includes(lowerFilter) ||
        oracleTranslation.includes(lowerFilter) ||
        chainTranslation.includes(lowerFilter)
      );
    });
  }, [sortedQueryResults, filterText, t]);

  const handleSort = (field: 'oracle' | 'blockchain' | 'price' | 'timestamp') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const validPrices = useMemo(() => {
    return queryResults.map((r) => r.priceData.price).filter((p) => p > 0);
  }, [queryResults]);

  const avgPrice = useMemo(() => {
    return validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
  }, [validPrices]);

  const maxPrice = useMemo(() => {
    return validPrices.length > 0 ? Math.max(...validPrices) : 0;
  }, [validPrices]);

  const minPrice = useMemo(() => {
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
  }, [validPrices]);

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

  const getConsistencyRating = (stdDevPercent: number): { label: string; color: string } => {
    if (stdDevPercent < 0.1) return { label: '优秀', color: 'text-green-600' };
    if (stdDevPercent < 0.3) return { label: '良好', color: 'text-blue-600' };
    if (stdDevPercent < 0.5) return { label: '一般', color: 'text-orange-600' };
    return { label: '较差', color: 'text-red-600' };
  };

  const calculateDeviation = (price: number, avg: number): number => {
    if (avg === 0) return 0;
    return ((price - avg) / avg) * 100;
  };

  const toggleOracle = (oracle: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
  };

  const toggleChain = (chain: Blockchain) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]
    );
  };

  const supportedChainsBySelectedOracles = useMemo(() => {
    if (selectedOracles.length === 0) return new Set<Blockchain>();
    const supported = new Set<Blockchain>();
    selectedOracles.forEach((oracle) => {
      const client = oracleClients[oracle];
      client.supportedChains.forEach((chain) => supported.add(chain));
    });
    return supported;
  }, [selectedOracles]);

  const isChainSupported = (chain: Blockchain): boolean => {
    if (selectedOracles.length === 0) return true;
    return supportedChainsBySelectedOracles.has(chain);
  };

  // Stat Item Component
  const StatItem = ({
    label,
    value,
    prefix = '',
    suffix = '',
    subValue,
  }: {
    label: string;
    value: string;
    prefix?: string;
    suffix?: string;
    subValue?: string;
  }) => (
    <div className="py-4 border-b border-gray-200 last:border-b-0">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-lg text-gray-400">{prefix}</span>}
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {suffix && <span className="text-lg text-gray-400">{suffix}</span>}
      </div>
      {subValue && <div className="text-sm text-gray-500 mt-1">{subValue}</div>}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div aria-live="polite" className="sr-only">
        {loading
          ? t('priceQuery.loadingData')
          : `${queryResults.length} ${t('priceQuery.results.title')}`}
      </div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('priceQuery.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('priceQuery.description')}</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className="relative">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Icons.clock />
              历史记录
            </button>
            {showHistory && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowHistory(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-lg z-20">
                  {historyItems.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">暂无历史记录</div>
                  ) : (
                    <>
                      <div className="max-h-80 overflow-y-auto">
                        {historyItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedOracles(item.oracles);
                              setSelectedChains(item.chains);
                              setSelectedSymbol(item.symbol);
                              setSelectedTimeRange(item.timeRange);
                              setShowHistory(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="text-sm font-medium text-gray-900">{item.symbol}</div>
                              <div className="text-xs text-gray-500">
                                {formatHistoryTime(item.timestamp)}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {item.oracles.length} 个预言机 · {item.chains.length} 条链
                            </div>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          clearQueryHistory();
                          setHistoryItems([]);
                          setShowHistory(false);
                        }}
                        className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-200 transition-colors"
                      >
                        清除历史记录
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={exportToCSV}
            disabled={loading || queryResults.length === 0}
            aria-label={t('priceQuery.export.csv')}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            <Icons.download />
            {t('priceQuery.export.csv')}
          </button>
          <button
            onClick={exportToJSON}
            disabled={loading || queryResults.length === 0}
            aria-label={t('priceQuery.export.json')}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            <Icons.download />
            {t('priceQuery.export.json')}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        {/* Symbol Selector */}
        <div className="mb-6">
          <div id="symbol-selector-label" className="flex items-center gap-2 mb-3">
            <Icons.currency />
            <span className="text-sm font-semibold text-gray-700">
              {t('priceQuery.selectors.symbol')}
            </span>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby="symbol-selector-label"
          >
            {symbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                aria-label={`${t('priceQuery.selectors.symbol')}: ${symbol}`}
                aria-pressed={selectedSymbol === symbol}
                className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
                  selectedSymbol === symbol
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Oracle Selector */}
        <div className="mb-6">
          <div id="oracle-selector-label" className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Icons.oracle />
              <span className="text-sm font-semibold text-gray-700">
                {t('priceQuery.selectors.oracle')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedOracles(Object.values(OracleProvider))}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                全选
              </button>
              <button
                onClick={() => setSelectedOracles([])}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                取消全选
              </button>
            </div>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby="oracle-selector-label"
          >
            {Object.values(OracleProvider).map((oracle) => {
              const isSelected = selectedOracles.includes(oracle);
              return (
                <button
                  key={oracle}
                  onClick={() => toggleOracle(oracle)}
                  aria-label={`${t('priceQuery.selectors.oracle')}: ${t(`navbar.${oracle.toLowerCase()}`)}`}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
                    isSelected
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: oracleColors[oracle] }}
                    aria-hidden="true"
                  />
                  {t(`navbar.${oracle.toLowerCase()}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chain Selector */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Icons.blockchain />
              <span className="text-sm font-semibold text-gray-700">
                {t('priceQuery.selectors.blockchain')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const supportedChains = Array.from(supportedChainsBySelectedOracles);
                  if (supportedChains.length > 0) {
                    setSelectedChains(supportedChains);
                  } else {
                    setSelectedChains(Object.values(Blockchain));
                  }
                }}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                全选
              </button>
              <button
                onClick={() => setSelectedChains([])}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                取消全选
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(Blockchain).map((chain) => {
              const isSelected = selectedChains.includes(chain);
              const isSupported = isChainSupported(chain);
              return (
                <button
                  key={chain}
                  onClick={() => {
                    if (isSupported) {
                      toggleChain(chain);
                    }
                  }}
                  disabled={!isSupported}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    !isSupported
                      ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
                      : isSelected
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: chainColors[chain] }}
                  />
                  {t(`blockchain.${chain.toLowerCase()}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Range & Query Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icons.clock />
            <span className="text-sm font-semibold text-gray-700 mr-2">
              {t('priceQuery.selectors.timeRange')}
            </span>
            <div className="flex gap-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setSelectedTimeRange(range.value)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedTimeRange === range.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t(`priceQuery.timeRanges.${range.key}`)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={fetchQueryData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Icons.refresh />
            )}
            {loading ? t('priceQuery.loading') : t('priceQuery.query')}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div
          className="py-16 flex flex-col justify-center items-center gap-4 border-b border-gray-200"
          role="status"
          aria-live="polite"
        >
          <div
            className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"
            aria-hidden="true"
          />
          <div className="text-sm text-gray-500">{t('priceQuery.loadingData')}</div>
          {currentQueryTarget.oracle && currentQueryTarget.chain && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">{t('priceQuery.querying')}:</span>
                <span className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: oracleColors[currentQueryTarget.oracle] }}
                  />
                  {t(`navbar.${currentQueryTarget.oracle.toLowerCase()}`)}
                </span>
                <span className="text-gray-400">/</span>
                <span className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: chainColors[currentQueryTarget.chain] }}
                  />
                  {t(`blockchain.${currentQueryTarget.chain.toLowerCase()}`)}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {t('priceQuery.progress')}: {queryProgress.completed} / {queryProgress.total}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-0 border-b border-gray-200 mb-8">
            <div className="px-4 border-r border-gray-200 last:border-r-0">
              <StatItem
                label={t('priceQuery.stats.avgPrice')}
                value={
                  avgPrice > 0
                    ? avgPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '-'
                }
                prefix="$"
              />
            </div>
            <div className="px-4 border-r border-gray-200 last:border-r-0">
              <StatItem
                label={t('priceQuery.stats.maxPrice')}
                value={
                  maxPrice > 0
                    ? maxPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '-'
                }
                prefix="$"
                subValue={
                  minPrice > 0
                    ? `${t('priceQuery.stats.minPrice')}: $${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : undefined
                }
              />
            </div>
            <div className="px-4 border-r border-gray-200 last:border-r-0">
              <StatItem
                label={t('priceQuery.stats.priceRange')}
                value={
                  priceRange > 0
                    ? priceRange.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '-'
                }
                prefix="$"
              />
            </div>
            <div className="px-4 border-r border-gray-200 last:border-r-0">
              <StatItem
                label={t('priceQuery.stats.standardDeviation')}
                value={standardDeviation > 0 ? standardDeviationPercent.toFixed(4) : '-'}
                suffix="%"
                subValue={
                  standardDeviation > 0
                    ? `${t('priceQuery.stats.absoluteValue')}: $${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : undefined
                }
              />
            </div>
            <div className="px-4 border-r border-gray-200 last:border-r-0">
              <StatItem
                label={t('priceQuery.stats.dataPoints')}
                value={queryResults.length.toString()}
              />
            </div>
            <div className="px-4 border-r border-gray-200 last:border-r-0">
              <StatItem
                label={t('priceQuery.stats.queryDuration')}
                value={queryDuration !== null ? queryDuration.toString() : '-'}
                suffix=" ms"
              />
            </div>
            <div className="px-4">
              <div className="py-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  {t('priceQuery.stats.consistencyRating')}
                </div>
                <div
                  className={`text-2xl font-bold ${standardDeviationPercent > 0 ? getConsistencyRating(standardDeviationPercent).color : 'text-gray-900'}`}
                >
                  {standardDeviationPercent > 0
                    ? getConsistencyRating(standardDeviationPercent).label
                    : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Price Results Table */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Icons.chart />
                {t('priceQuery.results.title')}
              </h2>
              {queryResults.length > 0 && (
                <div className="relative">
                  <div
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    aria-hidden="true"
                  >
                    <Icons.search />
                  </div>
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder={t('priceQuery.filter.placeholder')}
                    aria-label={t('priceQuery.filter.placeholder')}
                    className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
              )}
            </div>
            {queryResults.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                {t('priceQuery.results.empty')}
              </div>
            ) : filteredQueryResults.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                {t('priceQuery.filter.noResults')}
              </div>
            ) : (
              <>
                {filterText && (
                  <div className="mb-3 text-sm text-gray-500">
                    {t('priceQuery.filter.results')
                      .replace('{count}', filteredQueryResults.length.toString())
                      .replace('{total}', queryResults.length.toString())}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm"
                    role="table"
                    aria-label={t('priceQuery.results.title')}
                  >
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th
                          scope="col"
                          onClick={() => handleSort('oracle')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSort('oracle');
                            }
                          }}
                          tabIndex={0}
                          aria-label={`${t('priceQuery.results.table.oracle')}, ${sortField === 'oracle' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
                          className={`text-left py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                            sortField === 'oracle'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {t('priceQuery.results.table.oracle')}
                            {sortField === 'oracle' && (
                              <span className="text-gray-900" aria-hidden="true">
                                {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort('blockchain')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSort('blockchain');
                            }
                          }}
                          tabIndex={0}
                          aria-label={`${t('priceQuery.results.table.blockchain')}, ${sortField === 'blockchain' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
                          className={`text-left py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                            sortField === 'blockchain'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {t('priceQuery.results.table.blockchain')}
                            {sortField === 'blockchain' && (
                              <span className="text-gray-900" aria-hidden="true">
                                {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort('price')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSort('price');
                            }
                          }}
                          tabIndex={0}
                          aria-label={`${t('priceQuery.results.table.price')}, ${sortField === 'price' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
                          className={`text-right py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                            sortField === 'price'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {t('priceQuery.results.table.price')}
                            {sortField === 'price' && (
                              <span className="text-gray-900" aria-hidden="true">
                                {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSort('timestamp')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSort('timestamp');
                            }
                          }}
                          tabIndex={0}
                          aria-label={`${t('priceQuery.results.table.timestamp')}, ${sortField === 'timestamp' ? (sortDirection === 'asc' ? '升序排列' : '降序排列') : '点击排序'}`}
                          className={`text-right py-3 px-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                            sortField === 'timestamp'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {t('priceQuery.results.table.timestamp')}
                            {sortField === 'timestamp' && (
                              <span className="text-gray-900" aria-hidden="true">
                                {sortDirection === 'asc' ? <Icons.arrowUp /> : <Icons.arrowDown />}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50"
                        >
                          {t('priceQuery.results.table.source')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredQueryResults.map((result) => {
                        const deviation = calculateDeviation(result.priceData.price, avgPrice);
                        const isHighDeviation = Math.abs(deviation) > DEVIATION_THRESHOLD * 100;

                        return (
                          <tr
                            key={`${result.provider}-${result.chain}`}
                            className={`hover:bg-gray-50 transition-colors ${
                              isHighDeviation ? 'bg-amber-50' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: oracleColors[result.provider] }}
                                  aria-hidden="true"
                                />
                                <span className="font-medium text-gray-900">
                                  {t(`navbar.${result.provider.toLowerCase()}`)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: chainColors[result.chain] }}
                                  aria-hidden="true"
                                />
                                <span className="font-medium text-gray-900">
                                  {t(`blockchain.${result.chain.toLowerCase()}`)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-gray-900">
                              <div className="flex items-center justify-end gap-2">
                                <span>
                                  $
                                  {result.priceData.price.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 4,
                                  })}
                                </span>
                                {isHighDeviation && (
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                      deviation > 0
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}
                                  >
                                    {deviation > 0 ? '+' : ''}
                                    {deviation.toFixed(2)}%
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-500">
                              {new Date(result.priceData.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {result.priceData.source ? (
                                <span className="inline-block px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100">
                                  {result.priceData.source}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="md:hidden mt-2 text-xs text-gray-400 text-center">
                    {t('priceQuery.scrollHint')}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="mb-8 pb-8 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Icons.chart />
                  {t('priceQuery.chart.title')}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-gray-300">
                    <button
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 0.5}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title={t('priceQuery.chart.zoomOut')}
                    >
                      <Icons.zoomOut />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium text-gray-700 border-x border-gray-300 min-w-[60px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 3}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title={t('priceQuery.chart.zoomIn')}
                    >
                      <Icons.zoomIn />
                    </button>
                  </div>
                  <button
                    onClick={handleResetZoom}
                    disabled={zoomLevel === 1}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('priceQuery.chart.reset')}
                  >
                    <Icons.reset />
                    {t('priceQuery.chart.reset')}
                  </button>
                  <button
                    onClick={handleExportChart}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                    title={t('priceQuery.chart.exportImage')}
                  >
                    <Icons.image />
                    {t('priceQuery.chart.exportImage')}
                  </button>
                </div>
              </div>
              <div
                ref={chartContainerRef}
                className="overflow-hidden"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top left',
                  width: `${100 / zoomLevel}%`,
                }}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                    >
                      <defs>
                        {queryResults.map(({ provider, chain }) => {
                          const key = `${provider}-${chain}`;
                          const color = oracleColors[provider];
                          return (
                            <linearGradient
                              key={key}
                              id={`color${key}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="time"
                        stroke="#9ca3af"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                        stroke="#9ca3af"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                      {queryResults.map(({ provider, chain }) => {
                        const key = `${provider}-${chain}`;
                        const label = `${t(`navbar.${provider.toLowerCase()}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                        const color = oracleColors[provider];
                        const isHidden = hiddenSeries.has(label);
                        return (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={label}
                            name={label}
                            stroke={isHidden ? 'transparent' : color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={isHidden ? false : { r: 5, strokeWidth: 0 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div>
            <h2 id="quick-links-title" className="text-lg font-semibold text-gray-900 mb-4">
              {t('priceQuery.quickLinks.title')}
            </h2>
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              role="navigation"
              aria-labelledby="quick-links-title"
            >
              <a
                href="/cross-chain"
                className="group p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                aria-label={t('priceQuery.quickLinks.crossChain')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600" aria-hidden="true">
                    <Icons.blockchain />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                      {t('priceQuery.quickLinks.crossChain')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('priceQuery.quickLinks.crossChainDesc')}
                    </p>
                  </div>
                </div>
              </a>
              <a
                href="/cross-oracle"
                className="group p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                aria-label={t('priceQuery.quickLinks.crossOracle')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 text-purple-600" aria-hidden="true">
                    <Icons.oracle />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                      {t('priceQuery.quickLinks.crossOracle')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('priceQuery.quickLinks.crossOracleDesc')}
                    </p>
                  </div>
                </div>
              </a>
              <a
                href="/chainlink"
                className="group p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                aria-label={t('navbar.chainlink')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 text-green-600" aria-hidden="true">
                    <Icons.currency />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                      {t('navbar.chainlink')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('priceQuery.quickLinks.chainlinkDesc')}
                    </p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
