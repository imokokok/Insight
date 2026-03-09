'use client';

import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card';
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
  [Blockchain.ETHEREUM]: '#627EEA',
  [Blockchain.ARBITRUM]: '#28A0F0',
  [Blockchain.OPTIMISM]: '#FF0420',
  [Blockchain.POLYGON]: '#8247E5',
  [Blockchain.SOLANA]: '#14F195',
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
        item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
        item.diff.toFixed(4),
        item.diffPercent.toFixed(4) + '%'
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
    
    const historicalHeaders = [t('timestamp'), ...supportedChains.map(chain => chainNames[chain])];
    csvLines.push(historicalHeaders.join(','));
    
    sortedTimestamps.forEach((timestamp) => {
      const row: string[] = [new Date(timestamp).toLocaleString()];
      supportedChains.forEach((chain) => {
        const price = historicalPrices[chain]?.find((p) => p.timestamp === timestamp);
        row.push(price ? price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '');
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
        baseChain: selectedBaseChain ? chainNames[selectedBaseChain] : null
      },
      currentPrices: priceDifferences.map((item) => ({
        blockchain: chainNames[item.chain as Blockchain],
        price: item.price,
        difference: item.diff,
        percentDifference: item.diffPercent
      })),
      historicalPrices: supportedChains.map((chain) => ({
        blockchain: chainNames[chain],
        prices: historicalPrices[chain]?.map((price) => ({
          price: price.price,
          timestamp: new Date(price.timestamp).toISOString(),
          source: price.source
        })) || []
      })),
      summary: {
        averagePrice: avgPrice,
        highestPrice: maxPrice,
        lowestPrice: minPrice,
        priceRange: priceRange,
        standardDeviationPercent: standardDeviationPercent,
        consistencyRating: getConsistencyRating(standardDeviationPercent)
      }
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
    if (supportedChains.length > 0 && selectedBaseChain && !supportedChains.includes(selectedBaseChain)) {
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

    const getTimeFormat = () => {
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
    const basePriceData = currentPrices.find(p => p.chain === selectedBaseChain);
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
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
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
        let closestChainPrice = null;
        let minDiff = Infinity;
        
        chainPrices.forEach((chainPrice) => {
          const diff = Math.abs(chainPrice.timestamp - basePrice.timestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestChainPrice = chainPrice;
          }
        });
        
        if (closestChainPrice) {
          matchedDelays.push(Math.abs(closestChainPrice.timestamp - basePrice.timestamp) / 1000);
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
        const xPrice = currentPrices.find(p => p.chain === xChain)?.price || 0;
        const yPrice = currentPrices.find(p => p.chain === yChain)?.price || 0;
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
    return Math.max(...heatmapData.map(d => d.percent));
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{t('export')}:</span>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              disabled={loading || currentPrices.length === 0}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              CSV
            </button>
            <button
              onClick={exportToJSON}
              disabled={loading || currentPrices.length === 0}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">{t('oracleProvider')}</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as OracleProvider)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.values(OracleProvider).map((provider) => (
                  <option key={provider} value={provider}>
                    {providerNames[provider]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">{t('symbol')}</label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {symbols.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">{t('timeRange')}</label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TIME_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {t(range.key)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">{t('baseChain')}</label>
              <select
                value={selectedBaseChain || ''}
                onChange={(e) => setSelectedBaseChain(e.target.value as Blockchain)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {supportedChains.map((chain) => (
                  <option key={chain} value={chain}>
                    {chainNames[chain]}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('loading') : t('refresh')}
            </button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex justify-center items-center">
            <div className="text-gray-500">{t('loadingData')}</div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t('priceVolatilityHeatmap')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <div className="flex">
                    <div className="w-24 shrink-0"></div>
                    {supportedChains.map((chain) => (
                      <div key={chain} className="flex-1 min-w-20 text-center px-1">
                        <span className="text-xs font-medium text-gray-600">{chainNames[chain]}</span>
                      </div>
                    ))}
                  </div>
                  {supportedChains.map((xChain) => (
                    <div key={xChain} className="flex">
                      <div className="w-24 shrink-0 flex items-center">
                        <span className="text-xs font-medium text-gray-600">{chainNames[xChain]}</span>
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
                            className="flex-1 min-w-20 h-14 flex items-center justify-center px-1"
                            style={{
                              backgroundColor: isDiagonal ? '#f3f4f6' : getHeatmapColor(percent, maxHeatmapValue),
                            }}
                            title={isDiagonal ? '-' : `${chainNames[xChain]} vs ${chainNames[yChain]}: ${percent.toFixed(4)}%`}
                          >
                            {isDiagonal ? (
                              <span className="text-gray-300">-</span>
                            ) : (
                              <span className={`text-xs font-semibold ${percent > maxHeatmapValue * 0.5 ? 'text-white' : 'text-gray-900'}`}>
                                {percent.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-500">{t('low')}</span>
                    <div className="w-32 h-3 rounded" style={{ background: 'linear-gradient(to right, #4CAF50, #F59E0B, #EF4444)' }}></div>
                    <span className="text-xs text-gray-500">{t('high')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="py-6">
                <p className="text-sm font-medium text-gray-600 mb-1">{t('averagePrice')}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {avgPrice > 0
                      ? `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {t('highestPrice')} / {t('lowestPrice')}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {maxPrice > 0
                      ? `$${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </p>
                </div>
                {minPrice > 0 && (
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-sm text-gray-500">
                      {t('lowestPrice')}: $
                      {minPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6">
                <p className="text-sm font-medium text-gray-600 mb-1">{t('priceRange')}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {priceRange > 0
                      ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6">
                <p className="text-sm font-medium text-gray-600 mb-1">{t('standardDeviation')}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-'}
                  </p>
                </div>
                {standardDeviation > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {t('absoluteValue')}: $
                    {standardDeviation.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6">
                <p className="text-sm font-medium text-gray-600 mb-1">{t('coefficientOfVariation')}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {coefficientOfVariation > 0 ? `${(coefficientOfVariation * 100).toFixed(4)}%` : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6">
                <p className="text-sm font-medium text-gray-600 mb-1">{t('consistencyRating')}</p>
                <div className="flex items-baseline gap-2">
                  <p
                    className={`text-3xl font-bold ${
                      getConsistencyRating(standardDeviationPercent) === 'excellent'
                        ? 'text-green-600'
                        : getConsistencyRating(standardDeviationPercent) === 'good'
                          ? 'text-blue-600'
                          : getConsistencyRating(standardDeviationPercent) === 'fair'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                    }`}
                  >
                    {standardDeviationPercent > 0
                      ? t(`consistency.${getConsistencyRating(standardDeviationPercent)}`)
                      : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t('priceComparisonTable')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('blockchain')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('price')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('differenceVs', {
                          chain: selectedBaseChain ? chainNames[selectedBaseChain] : '',
                        })}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('percentDifference')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {priceDifferences.map((item, index) => (
                      <tr key={item.chain} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-3"
                              style={{ backgroundColor: chainColors[item.chain as Blockchain] }}
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {chainNames[item.chain as Blockchain]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-gray-900">
                          $
                          {item.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono">
                          <span className={item.diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.diff >= 0 ? '+' : ''}${item.diff.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono">
                          <span
                            className={item.diffPercent >= 0 ? 'text-green-600' : 'text-red-600'}
                          >
                            {item.diffPercent >= 0 ? '+' : ''}
                            {item.diffPercent.toFixed(4)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t('stabilityAnalysis')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('blockchain')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('priceVolatility')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('stabilityRating')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('averageDelay')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('maxDelay')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supportedChains.map((chain, index) => {
                      const volatility = chainVolatility[chain] ?? 0;
                      const delay = updateDelays[chain];
                      const stabilityRating = getStabilityRating(volatility);
                      
                      return (
                        <tr key={chain} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-3"
                                style={{ backgroundColor: chainColors[chain] }}
                              />
                              <span className="text-sm font-medium text-gray-900">
                                {chainNames[chain]}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-gray-900">
                            {volatility > 0 ? `${volatility.toFixed(4)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span
                              className={`text-sm font-semibold ${
                                stabilityRating === 'stable'
                                  ? 'text-green-600'
                                  : stabilityRating === 'moderate'
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {volatility > 0 ? t(`stability.${stabilityRating}`) : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-gray-900">
                            {delay ? `${delay.avgDelay.toFixed(2)} ${t('seconds')}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-gray-900">
                            {delay ? `${delay.maxDelay.toFixed(2)} ${t('seconds')}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('priceChart')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                    />
                    <Tooltip
                      formatter={(value) => [`$${Number(value).toFixed(4)}`, '']}
                      labelFormatter={(label) => label}
                    />
                    <Legend />
                    {supportedChains.map((chain) => (
                      <Line
                        key={chain}
                        type="monotone"
                        dataKey={chain}
                        name={chainNames[chain]}
                        stroke={chainColors[chain]}
                        dot={false}
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
