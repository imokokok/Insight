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

interface HeatmapData {
  x: string;
  y: string;
  value: number;
  percent: number;
  xChain: Blockchain;
  yChain: Blockchain;
}
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

const TIME_RANGES = [
  { value: 1, key: 'timeRange1Hour' },
  { value: 6, key: 'timeRange6Hours' },
  { value: 24, key: 'timeRange24Hours' },
  { value: 168, key: 'timeRange7Days' },
];

export default function CrossChainPage() {
  const { t } = useI18n();
  const [selectedProvider, setSelectedProvider] = useState<OracleProvider>(
    OracleProvider.CHAINLINK
  );
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24);
  const [currentPrices, setCurrentPrices] = useState<PriceData[]>([]);
  const [historicalPrices, setHistoricalPrices] = useState<
    Partial<Record<Blockchain, PriceData[]>>
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBaseChain, setSelectedBaseChain] = useState<Blockchain | null>(null);

  const generateFilename = (extension: string): string => {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    return `cross-chain-${selectedSymbol}-${timestamp}.${extension}`;
  };

  const exportToCSV = () => {
    const csvLines: string[] = [];

    csvLines.push('=== ' + t('currentPrices') + ' ===');
    const currentHeaders = [t('blockchain'), t('price'), t('difference'), t('percentDifference')];
    csvLines.push(currentHeaders.join(','));

    priceDifferences.forEach((item) => {
      const row = [
        chainNames[item.chain as Blockchain],
        item.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        }),
        item.diff.toFixed(4),
        item.diffPercent.toFixed(4) + '%',
      ];
      csvLines.push(row.join(','));
    });

    csvLines.push('');
    csvLines.push('=== ' + t('historicalPrices') + ' ===');

    const allTimestamps = new Set<number>();
    supportedChains.forEach((chain) => {
      historicalPrices[chain]?.forEach((price) => allTimestamps.add(price.timestamp));
    });
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    const historicalHeaders = [
      t('timestamp'),
      ...supportedChains.map((chain) => chainNames[chain]),
    ];
    csvLines.push(historicalHeaders.join(','));

    sortedTimestamps.forEach((timestamp) => {
      const row: string[] = [new Date(timestamp).toLocaleString()];
      supportedChains.forEach((chain) => {
        const price = historicalPrices[chain]?.find((p) => p.timestamp === timestamp);
        row.push(
          price
            ? price.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })
            : ''
        );
      });
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
        oracleProvider: providerNames[selectedProvider],
        exportTimestamp: new Date().toISOString(),
        baseChain: selectedBaseChain ? chainNames[selectedBaseChain] : null,
      },
      currentPrices: priceDifferences.map((item) => ({
        blockchain: chainNames[item.chain as Blockchain],
        price: item.price,
        difference: item.diff,
        percentDifference: item.diffPercent,
      })),
      historicalPrices: supportedChains.map((chain) => ({
        blockchain: chainNames[chain],
        prices:
          historicalPrices[chain]?.map((price) => ({
            price: price.price,
            timestamp: new Date(price.timestamp).toISOString(),
            source: price.source,
          })) || [],
      })),
      summary: {
        averagePrice: avgPrice,
        highestPrice: maxPrice,
        lowestPrice: minPrice,
        priceRange: priceRange,
        standardDeviationPercent: standardDeviationPercent,
        consistencyRating: getConsistencyRating(standardDeviationPercent),
      },
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

  const currentClient = oracleClients[selectedProvider];
  const supportedChains = currentClient.supportedChains;

  const fetchData = async () => {
    setLoading(true);
    try {
      const currentPromises = supportedChains.map((chain) =>
        currentClient.getPrice(selectedSymbol, chain)
      );
      const currentResults = await Promise.all(currentPromises);
      setCurrentPrices(currentResults);

      const historicalPromises = supportedChains.map((chain) =>
        currentClient.getHistoricalPrices(selectedSymbol, chain, selectedTimeRange)
      );
      const historicalResults = await Promise.all(historicalPromises);
      const historicalMap: Partial<Record<Blockchain, PriceData[]>> = {};
      supportedChains.forEach((chain, index) => {
        historicalMap[chain] = historicalResults[index];
      });
      setHistoricalPrices(historicalMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProvider, selectedSymbol, selectedTimeRange]);

  useEffect(() => {
    if (supportedChains.length > 0 && !selectedBaseChain) {
      setSelectedBaseChain(supportedChains[0]);
    }
    if (
      supportedChains.length > 0 &&
      selectedBaseChain &&
      !supportedChains.includes(selectedBaseChain)
    ) {
      setSelectedBaseChain(supportedChains[0]);
    }
  }, [supportedChains, selectedBaseChain]);

  const chartData = useMemo(() => {
    if (Object.keys(historicalPrices).length === 0) return [];
    const timestamps = new Set<number>();
    supportedChains.forEach((chain) => {
      historicalPrices[chain]?.forEach((price) => timestamps.add(price.timestamp));
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
      supportedChains.forEach((chain) => {
        const price = historicalPrices[chain]?.find((p) => p.timestamp === timestamp);
        if (price) {
          dataPoint[chain] = price.price;
        }
      });
      return dataPoint;
    });
  }, [historicalPrices, supportedChains, selectedTimeRange]);

  const priceDifferences = useMemo(() => {
    if (currentPrices.length < 2 || !selectedBaseChain) return [];
    const basePriceData = currentPrices.find((p) => p.chain === selectedBaseChain);
    if (!basePriceData) return [];
    const basePrice = basePriceData.price;
    return currentPrices.map((priceData) => {
      const diff = priceData.price - basePrice;
      const diffPercent = (diff / basePrice) * 100;
      return {
        chain: priceData.chain,
        price: priceData.price,
        diff,
        diffPercent,
      };
    });
  }, [currentPrices, selectedBaseChain]);

  const validPrices = useMemo(() => {
    return currentPrices.map((d) => d.price).filter((p) => p > 0);
  }, [currentPrices]);

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

  const coefficientOfVariation = useMemo(() => {
    return avgPrice > 0 ? standardDeviation / avgPrice : 0;
  }, [standardDeviation, avgPrice]);

  const getConsistencyRating = (stdDevPercent: number): string => {
    if (stdDevPercent < 0.1) return 'excellent';
    if (stdDevPercent < 0.3) return 'good';
    if (stdDevPercent < 0.5) return 'fair';
    return 'poor';
  };

  const getStabilityRating = (volatility: number): string => {
    if (volatility < 0.1) return 'stable';
    if (volatility < 0.3) return 'moderate';
    return 'unstable';
  };

  const chainVolatility = useMemo(() => {
    const volatility: Partial<Record<Blockchain, number>> = {};
    supportedChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      if (prices.length < 2) {
        volatility[chain] = 0;
        return;
      }
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance =
        prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      volatility[chain] = mean > 0 ? (stdDev / mean) * 100 : 0;
    });
    return volatility;
  }, [historicalPrices, supportedChains]);

  const updateDelays = useMemo(() => {
    if (supportedChains.length === 0) return {};
    const baseChain = supportedChains[0];
    const delays: Partial<Record<Blockchain, { avgDelay: number; maxDelay: number }>> = {};

    const basePrices = historicalPrices[baseChain] || [];
    if (basePrices.length === 0) return delays;

    supportedChains.forEach((chain) => {
      if (chain === baseChain) {
        delays[chain] = { avgDelay: 0, maxDelay: 0 };
        return;
      }

      const chainPrices = historicalPrices[chain] || [];
      if (chainPrices.length === 0) return;

      const matchedDelays: number[] = [];
      basePrices.forEach((basePrice) => {
        let closestChainPrice: PriceData | null = null;
        let minDiff = Infinity;

        chainPrices.forEach((chainPrice) => {
          const diff = Math.abs(chainPrice.timestamp - basePrice.timestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestChainPrice = chainPrice;
          }
        });

        if (closestChainPrice) {
          matchedDelays.push(Math.abs((closestChainPrice as PriceData).timestamp - basePrice.timestamp) / 1000);
        }
      });

      if (matchedDelays.length > 0) {
        const avgDelay = matchedDelays.reduce((a, b) => a + b, 0) / matchedDelays.length;
        const maxDelay = Math.max(...matchedDelays);
        delays[chain] = { avgDelay, maxDelay };
      }
    });

    return delays;
  }, [historicalPrices, supportedChains]);

  const heatmapData = useMemo(() => {
    if (currentPrices.length < 2) return [];
    const data: HeatmapData[] = [];

    supportedChains.forEach((xChain) => {
      supportedChains.forEach((yChain) => {
        const xPrice = currentPrices.find((p) => p.chain === xChain)?.price || 0;
        const yPrice = currentPrices.find((p) => p.chain === yChain)?.price || 0;
        const diff = Math.abs(xPrice - yPrice);
        const percent = xPrice > 0 ? (diff / xPrice) * 100 : 0;

        data.push({
          x: chainNames[xChain],
          y: chainNames[yChain],
          value: diff,
          percent,
          xChain,
          yChain,
        });
      });
    });

    return data;
  }, [currentPrices, supportedChains]);

  const maxHeatmapValue = useMemo(() => {
    if (heatmapData.length === 0) return 1;
    return Math.max(...heatmapData.map((d) => d.percent));
  }, [heatmapData]);

  const getHeatmapColor = (percent: number, maxPercent: number): string => {
    const normalized = Math.min(percent / Math.max(maxPercent, 0.1), 1);

    if (normalized < 0.33) {
      const t = normalized / 0.33;
      const r = Math.floor(76 + (251 - 76) * t);
      const g = Math.floor(191 + (191 - 191) * t);
      const b = Math.floor(109 + (45 - 109) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (normalized < 0.66) {
      const t = (normalized - 0.33) / 0.33;
      const r = Math.floor(251 + (245 - 251) * t);
      const g = Math.floor(191 + (158 - 191) * t);
      const b = Math.floor(45 + (11 - 45) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = (normalized - 0.66) / 0.34;
      const r = Math.floor(245 + (239 - 245) * t);
      const g = Math.floor(158 + (68 - 158) * t);
      const b = Math.floor(11 + (68 - 11) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const providerOptions = Object.values(OracleProvider).map((provider) => ({
    value: provider,
    label: providerNames[provider],
  }));

  const symbolOptions = symbols.map((symbol) => ({
    value: symbol,
    label: symbol,
  }));

  const timeRangeOptions = TIME_RANGES.map((range) => ({
    value: range.value,
    label: t(range.key),
  }));

  const baseChainOptions = supportedChains.map((chain) => ({
    value: chain,
    label: chainNames[chain],
  }));

  const consistencyRatingColorMap: Record<string, any> = {
    excellent: 'green',
    good: 'blue',
    fair: 'orange',
    poor: 'red',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle') || '跨链价格分析与监控'}</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <span className="text-sm text-gray-600">{t('export')}:</span>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              disabled={loading || currentPrices.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-md hover:shadow-lg"
            >
              CSV
            </button>
            <button
              onClick={exportToJSON}
              disabled={loading || currentPrices.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-md hover:shadow-lg"
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      <AdvancedCard className="mb-8" variant="glass">
        <AdvancedCardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <AdvancedSelect
              label={t('oracleProvider')}
              options={providerOptions}
              value={selectedProvider}
              onChange={(value) => setSelectedProvider(value as OracleProvider)}
              size="md"
              variant="filled"
            />
            <AdvancedSelect
              label={t('symbol')}
              options={symbolOptions}
              value={selectedSymbol}
              onChange={(value) => setSelectedSymbol(value as string)}
              size="md"
              variant="filled"
            />
            <AdvancedSelect
              label={t('timeRange')}
              options={timeRangeOptions}
              value={selectedTimeRange}
              onChange={(value) => setSelectedTimeRange(Number(value))}
              size="md"
              variant="filled"
            />
            <AdvancedSelect
              label={t('baseChain')}
              options={baseChainOptions}
              value={selectedBaseChain || ''}
              onChange={(value) => setSelectedBaseChain(value as Blockchain)}
              size="md"
              variant="filled"
            />
          </div>
          <div className="flex justify-center">
            <button
              onClick={fetchData}
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
              {loading ? t('loading') : t('refresh')}
            </button>
          </div>
        </AdvancedCardContent>
      </AdvancedCard>

      {loading ? (
        <AdvancedCard variant="glass">
          <AdvancedCardContent className="py-16 flex flex-col justify-center items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-gray-600 text-lg font-medium">{t('loadingData')}</div>
          </AdvancedCardContent>
        </AdvancedCard>
      ) : (
        <>
          <AdvancedCard className="mb-8" variant="default" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle>{t('priceVolatilityHeatmap')}</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <div className="flex">
                    <div className="w-28 shrink-0"></div>
                    {supportedChains.map((chain) => (
                      <div key={chain} className="flex-1 min-w-24 text-center px-2 py-2">
                        <span className="text-sm font-semibold text-gray-700">
                          {chainNames[chain]}
                        </span>
                      </div>
                    ))}
                  </div>
                  {supportedChains.map((xChain) => (
                    <div key={xChain} className="flex">
                      <div className="w-28 shrink-0 flex items-center py-2">
                        <span className="text-sm font-semibold text-gray-700">
                          {chainNames[xChain]}
                        </span>
                      </div>
                      {supportedChains.map((yChain) => {
                        const cell = heatmapData.find(
                          (d) => d.xChain === xChain && d.yChain === yChain
                        );
                        const percent = cell?.percent || 0;
                        const isDiagonal = xChain === yChain;

                        return (
                          <div
                            key={`${xChain}-${yChain}`}
                            className="flex-1 min-w-24 h-16 flex items-center justify-center px-1 mx-0.5 my-0.5 rounded-lg"
                            style={{
                              backgroundColor: isDiagonal
                                ? '#f3f4f6'
                                : getHeatmapColor(percent, maxHeatmapValue),
                            }}
                            title={
                              isDiagonal
                                ? '-'
                                : `${chainNames[xChain]} vs ${chainNames[yChain]}: ${percent.toFixed(4)}%`
                            }
                          >
                            {isDiagonal ? (
                              <span className="text-gray-400 text-lg">—</span>
                            ) : (
                              <span
                                className={`text-xs font-bold ${percent > maxHeatmapValue * 0.5 ? 'text-white' : 'text-gray-900'}`}
                              >
                                {percent.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <span className="text-sm text-gray-600 font-medium">{t('low')}</span>
                    <div
                      className="w-40 h-4 rounded-xl shadow-inner"
                      style={{ background: 'linear-gradient(to right, #4CAF50, #F59E0B, #EF4444)' }}
                    ></div>
                    <span className="text-sm text-gray-600 font-medium">{t('high')}</span>
                  </div>
                </div>
              </div>
            </AdvancedCardContent>
          </AdvancedCard>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              title={t('averagePrice')}
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
              title={`${t('highestPrice')} / ${t('lowestPrice')}`}
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
                  ? `${t('lowestPrice')}: $${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : ''
              }
            />
            <StatCard
              title={t('priceRange')}
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
              title={t('standardDeviation')}
              value={standardDeviation > 0 ? standardDeviationPercent.toFixed(4) : '-'}
              suffix="%"
              accentColor="orange"
              description={
                standardDeviation > 0
                  ? `${t('absoluteValue')}: $${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : ''
              }
            />
            <StatCard
              title={t('coefficientOfVariation')}
              value={coefficientOfVariation > 0 ? (coefficientOfVariation * 100).toFixed(4) : '-'}
              suffix="%"
              accentColor="cyan"
            />
            <StatCard
              title={t('consistencyRating')}
              value={
                standardDeviationPercent > 0
                  ? t(`consistency.${getConsistencyRating(standardDeviationPercent)}`)
                  : '-'
              }
              accentColor={
                consistencyRatingColorMap[getConsistencyRating(standardDeviationPercent)]
              }
            />
          </div>

          <AdvancedCard className="mb-8" variant="default" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle>{t('priceComparisonTable')}</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent className="px-4">
              <AdvancedTable striped hoverable>
                <AdvancedTableHeader>
                  <AdvancedTableRow hoverable={false}>
                    <AdvancedTableHead>{t('blockchain')}</AdvancedTableHead>
                    <AdvancedTableHead className="text-right">{t('price')}</AdvancedTableHead>
                    <AdvancedTableHead className="text-right">
                      {t('differenceVs')}: {selectedBaseChain ? chainNames[selectedBaseChain] : ''}
                    </AdvancedTableHead>
                    <AdvancedTableHead className="text-right">
                      {t('percentDifference')}
                    </AdvancedTableHead>
                  </AdvancedTableRow>
                </AdvancedTableHeader>
                <AdvancedTableBody>
                  {priceDifferences.map((item, index) => (
                    <AdvancedTableRow key={item.chain}>
                      <AdvancedTableCell>
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-3 shadow-sm"
                            style={{ backgroundColor: chainColors[item.chain as Blockchain] }}
                          />
                          <span className="font-semibold text-gray-800">
                            {chainNames[item.chain as Blockchain]}
                          </span>
                        </div>
                      </AdvancedTableCell>
                      <AdvancedTableCell className="text-right font-mono text-gray-800">
                        $
                        {item.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </AdvancedTableCell>
                      <AdvancedTableCell className="text-right font-mono">
                        <span
                          className={
                            item.diff >= 0
                              ? 'text-green-600 font-semibold'
                              : 'text-red-600 font-semibold'
                          }
                        >
                          {item.diff >= 0 ? '+' : ''}${item.diff.toFixed(4)}
                        </span>
                      </AdvancedTableCell>
                      <AdvancedTableCell className="text-right font-mono">
                        <span
                          className={
                            item.diffPercent >= 0
                              ? 'text-green-600 font-semibold'
                              : 'text-red-600 font-semibold'
                          }
                        >
                          {item.diffPercent >= 0 ? '+' : ''}
                          {item.diffPercent.toFixed(4)}%
                        </span>
                      </AdvancedTableCell>
                    </AdvancedTableRow>
                  ))}
                </AdvancedTableBody>
              </AdvancedTable>
            </AdvancedCardContent>
          </AdvancedCard>

          <AdvancedCard className="mb-8" variant="default" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle>{t('stabilityAnalysis')}</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent className="px-4">
              <AdvancedTable striped hoverable>
                <AdvancedTableHeader>
                  <AdvancedTableRow hoverable={false}>
                    <AdvancedTableHead>{t('blockchain')}</AdvancedTableHead>
                    <AdvancedTableHead className="text-right">
                      {t('priceVolatility')}
                    </AdvancedTableHead>
                    <AdvancedTableHead className="text-right">
                      {t('stabilityRating')}
                    </AdvancedTableHead>
                    <AdvancedTableHead className="text-right">
                      {t('averageDelay')}
                    </AdvancedTableHead>
                    <AdvancedTableHead className="text-right">{t('maxDelay')}</AdvancedTableHead>
                  </AdvancedTableRow>
                </AdvancedTableHeader>
                <AdvancedTableBody>
                  {supportedChains.map((chain, index) => {
                    const volatility = chainVolatility[chain] ?? 0;
                    const delay = updateDelays[chain];
                    const stabilityRating = getStabilityRating(volatility);

                    const stabilityColorMap: Record<string, any> = {
                      stable: 'text-green-600',
                      moderate: 'text-yellow-600',
                      unstable: 'text-red-600',
                    };

                    return (
                      <AdvancedTableRow key={chain}>
                        <AdvancedTableCell>
                          <div className="flex items-center">
                            <div
                              className="w-4 h-4 rounded-full mr-3 shadow-sm"
                              style={{ backgroundColor: chainColors[chain] }}
                            />
                            <span className="font-semibold text-gray-800">{chainNames[chain]}</span>
                          </div>
                        </AdvancedTableCell>
                        <AdvancedTableCell className="text-right font-mono text-gray-800">
                          {volatility > 0 ? `${volatility.toFixed(4)}%` : '-'}
                        </AdvancedTableCell>
                        <AdvancedTableCell className="text-right">
                          <span className={`font-bold ${stabilityColorMap[stabilityRating]}`}>
                            {volatility > 0 ? t(`stability.${stabilityRating}`) : '-'}
                          </span>
                        </AdvancedTableCell>
                        <AdvancedTableCell className="text-right font-mono text-gray-800">
                          {delay ? `${delay.avgDelay.toFixed(2)} ${t('seconds')}` : '-'}
                        </AdvancedTableCell>
                        <AdvancedTableCell className="text-right font-mono text-gray-800">
                          {delay ? `${delay.maxDelay.toFixed(2)} ${t('seconds')}` : '-'}
                        </AdvancedTableCell>
                      </AdvancedTableRow>
                    );
                  })}
                </AdvancedTableBody>
              </AdvancedTable>
            </AdvancedCardContent>
          </AdvancedCard>

          <AdvancedCard variant="default" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle>{t('priceChart')}</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                    <defs>
                      {supportedChains.map((chain) => (
                        <linearGradient key={chain} id={`color${chain}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chainColors[chain]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={chainColors[chain]} stopOpacity={0} />
                        </linearGradient>
                      ))}
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
                    {supportedChains.map((chain) => (
                      <Line
                        key={chain}
                        type="monotone"
                        dataKey={chain}
                        name={chainNames[chain]}
                        stroke={chainColors[chain]}
                        dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                        strokeWidth={3}
                        activeDot={{ r: 7, strokeWidth: 0 }}
                        fill={`url(#color${chain})`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </AdvancedCardContent>
          </AdvancedCard>
        </>
      )}
    </div>
  );
}
