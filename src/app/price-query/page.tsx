'use client';

import { useState, useEffect, useMemo } from 'react';
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
};

const symbols = ['BTC', 'ETH', 'SOL', 'USDC'];

const chainColors: Record<Blockchain, string> = {
  [Blockchain.ETHEREUM]: '#6366F1',
  [Blockchain.ARBITRUM]: '#06B6D4',
  [Blockchain.OPTIMISM]: '#EF4444',
  [Blockchain.POLYGON]: '#A855F7',
  [Blockchain.SOLANA]: '#10B981',
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

interface QueryResult {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData;
}

// Icons
const Icons = {
  currency: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  oracle: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
  blockchain: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  ),
  clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  arrowUp: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7 7 7" />
    </svg>
  ),
  arrowDown: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7-7-7" />
    </svg>
  ),
  chart: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
      />
    </svg>
  ),
};

export default function PriceQueryPage() {
  useI18n();
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
  ]);
  const [selectedChains, setSelectedChains] = useState<Blockchain[]>([Blockchain.ETHEREUM]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [historicalData, setHistoricalData] = useState<Partial<Record<string, PriceData[]>>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const generateFilename = (extension: string): string => {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    return `price-query-${selectedSymbol}-${timestamp}.${extension}`;
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
    try {
      const results: QueryResult[] = [];
      const histories: Partial<Record<string, PriceData[]>> = {};

      for (const provider of selectedOracles) {
        const client = oracleClients[provider];
        const supportedChains = client.supportedChains;

        for (const chain of selectedChains) {
          if (supportedChains.includes(chain)) {
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
          }
        }
      }

      setQueryResults(results);
      setHistoricalData(histories);
    } catch (error) {
      console.error('Error fetching query data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOracles, selectedChains, selectedSymbol, selectedTimeRange]);

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">价格查询</h1>
          <p className="text-sm text-gray-500 mt-1">灵活查询任意预言机、任意链的价格数据</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={exportToCSV}
            disabled={loading || queryResults.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Icons.download />
            CSV
          </button>
          <button
            onClick={exportToJSON}
            disabled={loading || queryResults.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Icons.download />
            JSON
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        {/* Symbol Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Icons.currency />
            <span className="text-sm font-semibold text-gray-700">交易对</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
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
          <div className="flex items-center gap-2 mb-3">
            <Icons.oracle />
            <span className="text-sm font-semibold text-gray-700">预言机</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(OracleProvider).map((oracle) => {
              const isSelected = selectedOracles.includes(oracle);
              return (
                <button
                  key={oracle}
                  onClick={() => toggleOracle(oracle)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: oracleColors[oracle] }}
                  />
                  {providerNames[oracle]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chain Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Icons.blockchain />
            <span className="text-sm font-semibold text-gray-700">区块链</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(Blockchain).map((chain) => {
              const isSelected = selectedChains.includes(chain);
              return (
                <button
                  key={chain}
                  onClick={() => toggleChain(chain)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: chainColors[chain] }}
                  />
                  {chainNames[chain]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Range & Query Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icons.clock />
            <span className="text-sm font-semibold text-gray-700 mr-2">时间范围</span>
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
                  {range.label}
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
            {loading ? '加载中...' : '查询'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-16 flex flex-col justify-center items-center gap-4 border-b border-gray-200">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin" />
          <div className="text-sm text-gray-500">加载数据中...</div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 border-b border-gray-200 mb-8">
            <div className="px-4 border-r border-gray-200 last:border-r-0">
              <StatItem
                label="平均价格"
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
                label="最高价格"
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
                    ? `最低: $${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : undefined
                }
              />
            </div>
            <div className="px-4 border-r border-gray-200 last:border-r-0">
              <StatItem
                label="价格区间"
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
                label="标准差"
                value={standardDeviation > 0 ? standardDeviationPercent.toFixed(4) : '-'}
                suffix="%"
                subValue={
                  standardDeviation > 0
                    ? `绝对值: $${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : undefined
                }
              />
            </div>
            <div className="px-4 border-r border-gray-200 last:border-r-0">
              <StatItem label="数据点数" value={queryResults.length.toString()} />
            </div>
            <div className="px-4">
              <div className="py-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  一致性评级
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icons.chart />
              价格查询结果
            </h2>
            {queryResults.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                请选择预言机和区块链进行查询
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                        预言机
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                        区块链
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                        价格
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                        时间戳
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                        来源
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {queryResults.map((result) => (
                      <tr
                        key={`${result.provider}-${result.chain}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: oracleColors[result.provider] }}
                            />
                            <span className="font-medium text-gray-900">
                              {providerNames[result.provider]}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: chainColors[result.chain] }}
                            />
                            <span className="font-medium text-gray-900">
                              {chainNames[result.chain]}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-900">
                          $
                          {result.priceData.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Icons.chart />
                价格趋势图表
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <defs>
                      {queryResults.map(({ provider, chain }) => {
                        const key = `${provider}-${chain}`;
                        const color = oracleColors[provider];
                        return (
                          <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        padding: '12px',
                        fontSize: '12px',
                      }}
                      formatter={(value) => [`$${Number(value).toFixed(4)}`, '']}
                      labelStyle={{ color: '#374151', fontWeight: 600, marginBottom: '8px' }}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: '16px',
                        fontSize: '12px',
                      }}
                      iconType="circle"
                      iconSize={6}
                    />
                    {queryResults.map(({ provider, chain }) => {
                      const key = `${provider}-${chain}`;
                      const label = `${providerNames[provider]} (${chainNames[chain]})`;
                      const color = oracleColors[provider];
                      return (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={label}
                          name={label}
                          stroke={color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">快速跳转</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/cross-chain"
                className="group p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600">
                    <Icons.blockchain />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                      跨链比较
                    </p>
                    <p className="text-xs text-gray-500">单个预言机在不同链上的价格比较</p>
                  </div>
                </div>
              </a>
              <a
                href="/cross-oracle"
                className="group p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 text-purple-600">
                    <Icons.oracle />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                      跨预言机比较
                    </p>
                    <p className="text-xs text-gray-500">多个预言机在同一条链上的价格比较</p>
                  </div>
                </div>
              </a>
              <a
                href="/chainlink"
                className="group p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 text-green-600">
                    <Icons.currency />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                      Chainlink
                    </p>
                    <p className="text-xs text-gray-500">去中心化预言机网络</p>
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
