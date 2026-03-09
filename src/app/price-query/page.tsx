'use client';

import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';
import AdvancedCard, {
  AdvancedCardHeader,
  AdvancedCardTitle,
  AdvancedCardContent,
  AdvancedCardFooter,
} from '@/components/AdvancedCard';
import AdvancedTable, {
  AdvancedTableHeader,
  AdvancedTableBody,
  AdvancedTableRow,
  AdvancedTableHead,
  AdvancedTableCell,
} from '@/components/AdvancedTable';
import StatCard from '@/components/StatCard';
import AdvancedSelect from '@/components/AdvancedSelect';
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
  { value: 1, key: 'timeRange1Hour' },
  { value: 6, key: 'timeRange6Hours' },
  { value: 24, key: 'timeRange24Hours' },
  { value: 168, key: 'timeRange7Days' },
];

interface QueryResult {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData;
}

export default function PriceQueryPage() {
  const { t } = useI18n();
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
  ]);
  const [selectedChains, setSelectedChains] = useState<Blockchain[]>([
    Blockchain.ETHEREUM,
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [historicalData, setHistoricalData] = useState<
    Partial<Record<string, PriceData[]>>
  >({});
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
      const dataPoint: any = {
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

  const oracleOptions = Object.values(OracleProvider).map((provider) => ({
    value: provider,
    label: providerNames[provider],
  }));

  const chainOptions = Object.values(Blockchain).map((chain) => ({
    value: chain,
    label: chainNames[chain],
  }));

  const symbolOptions = symbols.map((symbol) => ({
    value: symbol,
    label: symbol,
  }));

  const timeRangeOptions = TIME_RANGES.map((range) => ({
    value: range.value,
    label: t(range.key as keyof typeof t) || `${range.value}小时`,
  }));

  const getConsistencyRating = (stdDevPercent: number): string => {
    if (stdDevPercent < 0.1) return 'excellent';
    if (stdDevPercent < 0.3) return 'good';
    if (stdDevPercent < 0.5) return 'fair';
    return 'poor';
  };

  const consistencyRatingColorMap: Record<string, any> = {
    excellent: 'green',
    good: 'blue',
    fair: 'orange',
    poor: 'red',
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">价格查询</h1>
          <p className="text-gray-600">灵活查询任意预言机、任意链的价格数据</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <span className="text-sm text-gray-600">导出:</span>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              disabled={loading || queryResults.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-md hover:shadow-lg"
            >
              CSV
            </button>
            <button
              onClick={exportToJSON}
              disabled={loading || queryResults.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-md hover:shadow-lg"
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      <AdvancedCard className="mb-8" variant="glass">
        <AdvancedCardContent className="pt-6">
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-semibold text-slate-700">选择交易对</span>
            </div>
            <div className="flex flex-wrap gap-3 mb-8">
              {symbols.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                    selectedSymbol === symbol
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200 transform scale-105'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span className="text-sm font-semibold text-slate-700">选择预言机</span>
            </div>
            <div className="flex flex-wrap gap-3 mb-8">
              {Object.values(OracleProvider).map((oracle) => {
                const isSelected = selectedOracles.includes(oracle);
                return (
                  <button
                    key={oracle}
                    onClick={() => toggleOracle(oracle)}
                    className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200 transform scale-105'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {isSelected ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {providerNames[oracle]}
                  </button>
                );
              })}
            </div>

            <div className="mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <span className="text-sm font-semibold text-slate-700">选择区块链</span>
            </div>
            <div className="flex flex-wrap gap-3 mb-8">
              {Object.values(Blockchain).map((chain) => {
                const isSelected = selectedChains.includes(chain);
                return (
                  <button
                    key={chain}
                    onClick={() => toggleChain(chain)}
                    className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 transform scale-105'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {isSelected ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {chainNames[chain]}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AdvancedSelect
                label="时间范围"
                options={timeRangeOptions}
                value={selectedTimeRange}
                onChange={(value) => setSelectedTimeRange(Number(value))}
                size="md"
                variant="filled"
              />
            </div>
          </div>
          <div className="flex justify-center">
            <button
              onClick={fetchQueryData}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              {loading ? '加载中...' : '查询'}
            </button>
          </div>
        </AdvancedCardContent>
      </AdvancedCard>

      {loading ? (
        <AdvancedCard variant="glass">
          <AdvancedCardContent className="py-16 flex flex-col justify-center items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-gray-600 text-lg font-medium">加载数据中...</div>
          </AdvancedCardContent>
        </AdvancedCard>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="平均价格"
              value={
                avgPrice > 0
                  ? avgPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '-'
              }
              prefix="$"
              accentColor="blue"
            />
            <StatCard
              title="最高价格 / 最低价格"
              value={
                maxPrice > 0
                  ? maxPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '-'
              }
              prefix="$"
              accentColor="green"
              description={
                minPrice > 0
                  ? `最低价格: $${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : ''
              }
            />
            <StatCard
              title="价格区间"
              value={
                priceRange > 0
                  ? priceRange.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '-'
              }
              prefix="$"
              accentColor="purple"
            />
            <StatCard
              title="标准差"
              value={standardDeviation > 0 ? standardDeviationPercent.toFixed(4) : '-'}
              suffix="%"
              accentColor="orange"
              description={
                standardDeviation > 0
                  ? `绝对值: $${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : ''
              }
            />
            <StatCard
              title="数据点数"
              value={queryResults.length.toString()}
              accentColor="cyan"
            />
            <StatCard
              title="一致性评级"
              value={
                standardDeviationPercent > 0
                  ? (getConsistencyRating(standardDeviationPercent) === 'excellent' ? '优秀' :
                     getConsistencyRating(standardDeviationPercent) === 'good' ? '良好' :
                     getConsistencyRating(standardDeviationPercent) === 'fair' ? '一般' : '较差')
                  : '-'
              }
              accentColor={
                consistencyRatingColorMap[getConsistencyRating(standardDeviationPercent)]
              }
            />
          </div>

          <AdvancedCard className="mb-8" variant="default" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle>价格查询结果</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent className="px-4">
              {queryResults.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  请选择预言机和区块链进行查询
                </div>
              ) : (
                <AdvancedTable striped hoverable>
                  <AdvancedTableHeader>
                    <AdvancedTableRow hoverable={false}>
                      <AdvancedTableHead>预言机</AdvancedTableHead>
                      <AdvancedTableHead>区块链</AdvancedTableHead>
                      <AdvancedTableHead className="text-right">价格</AdvancedTableHead>
                      <AdvancedTableHead className="text-right">时间戳</AdvancedTableHead>
                      <AdvancedTableHead className="text-right">来源</AdvancedTableHead>
                    </AdvancedTableRow>
                  </AdvancedTableHeader>
                  <AdvancedTableBody>
                    {queryResults.map((result, index) => (
                      <AdvancedTableRow key={`${result.provider}-${result.chain}`}>
                        <AdvancedTableCell>
                          <div className="flex items-center">
                            <div
                              className="w-4 h-4 rounded-full mr-3 shadow-sm"
                              style={{ backgroundColor: oracleColors[result.provider] }}
                            />
                            <span className="font-semibold text-gray-800">
                              {providerNames[result.provider]}
                            </span>
                          </div>
                        </AdvancedTableCell>
                        <AdvancedTableCell>
                          <div className="flex items-center">
                            <div
                              className="w-4 h-4 rounded-full mr-3 shadow-sm"
                              style={{ backgroundColor: chainColors[result.chain] }}
                            />
                            <span className="font-semibold text-gray-800">
                              {chainNames[result.chain]}
                            </span>
                          </div>
                        </AdvancedTableCell>
                        <AdvancedTableCell className="text-right font-mono text-gray-800">
                          $
                          {result.priceData.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </AdvancedTableCell>
                        <AdvancedTableCell className="text-right text-gray-600">
                          {new Date(result.priceData.timestamp).toLocaleString()}
                        </AdvancedTableCell>
                        <AdvancedTableCell className="text-right text-gray-600">
                          {result.priceData.source ? (
                            <span className="font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              {result.priceData.source}
                            </span>
                          ) : (
                            '-'
                          )}
                        </AdvancedTableCell>
                      </AdvancedTableRow>
                    ))}
                  </AdvancedTableBody>
                </AdvancedTable>
              )}
            </AdvancedCardContent>
          </AdvancedCard>

          {chartData.length > 0 && (
            <AdvancedCard variant="default" hoverable={false}>
              <AdvancedCardHeader>
                <AdvancedCardTitle>价格趋势图表</AdvancedCardTitle>
              </AdvancedCardHeader>
              <AdvancedCardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                      <defs>
                        {queryResults.map(({ provider, chain }) => {
                          const key = `${provider}-${chain}`;
                          const label = `${providerNames[provider]} (${chainNames[chain]})`;
                          const color = oracleColors[provider];
                          return (
                            <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="5 5" stroke="#f3f4f6" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        stroke="#9ca3af"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                        stroke="#9ca3af"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: 'none',
                          borderRadius: '16px',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          padding: '16px 20px',
                          backdropFilter: 'blur(10px)'
                        }}
                        formatter={(value) => [`$${Number(value).toFixed(4)}`, '']}
                        labelFormatter={(label) => label}
                        cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: '24px', 
                          display: 'flex', 
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                          gap: '16px'
                        }}
                        iconType="circle"
                        iconSize={8}
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
                            dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                            strokeWidth={3}
                            activeDot={{ r: 7, strokeWidth: 0 }}
                            fill={`url(#color${key})`}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </AdvancedCardContent>
            </AdvancedCard>
          )}

          <AdvancedCard className="mb-8" variant="glass">
            <AdvancedCardHeader>
              <AdvancedCardTitle>快速跳转</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <a
                  href="/cross-chain"
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">跨链比较</p>
                    <p className="text-sm text-gray-500">单个预言机在不同链上的价格比较</p>
                  </div>
                </a>
                <a
                  href="/cross-oracle"
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">跨预言机比较</p>
                    <p className="text-sm text-gray-500">多个预言机在同一条链上的价格比较</p>
                  </div>
                </a>
                <a
                  href="/chainlink"
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Chainlink</p>
                    <p className="text-sm text-gray-500">去中心化预言机网络</p>
                  </div>
                </a>
              </div>
            </AdvancedCardContent>
          </AdvancedCard>
        </>
      )}
    </div>
  );
}
