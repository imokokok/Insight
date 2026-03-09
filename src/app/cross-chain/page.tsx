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
          matchedDelays.push(
            Math.abs((closestChainPrice as PriceData).timestamp - basePrice.timestamp) / 1000
          );
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

  const statsData = [
    {
      label: t('averagePrice'),
      value:
        avgPrice > 0
          ? `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-',
      subValue: null,
    },
    {
      label: t('highestPrice'),
      value:
        maxPrice > 0
          ? `$${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-',
      subValue:
        minPrice > 0
          ? `Min: $${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : null,
    },
    {
      label: t('priceRange'),
      value:
        priceRange > 0
          ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-',
      subValue: null,
    },
    {
      label: t('standardDeviation'),
      value: standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-',
      subValue:
        standardDeviation > 0
          ? `$${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : null,
    },
    {
      label: t('coefficientOfVariation'),
      value: coefficientOfVariation > 0 ? `${(coefficientOfVariation * 100).toFixed(4)}%` : '-',
      subValue: null,
    },
    {
      label: t('consistencyRating'),
      value:
        standardDeviationPercent > 0
          ? t(`consistency.${getConsistencyRating(standardDeviationPercent)}`)
          : '-',
      subValue: null,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle') || '跨链价格分析与监控'}</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <span className="text-sm text-gray-500">{t('export')}:</span>
          <button
            onClick={exportToCSV}
            disabled={loading || currentPrices.length === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            CSV
          </button>
          <button
            onClick={exportToJSON}
            disabled={loading || currentPrices.length === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 mb-6 pb-6 border-b border-gray-200">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            {t('oracleProvider')}
          </label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as OracleProvider)}
            className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[140px]"
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">{t('symbol')}</label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[100px]"
          >
            {symbolOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">{t('timeRange')}</label>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[120px]"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">{t('baseChain')}</label>
          <select
            value={selectedBaseChain || ''}
            onChange={(e) => setSelectedBaseChain(e.target.value as Blockchain)}
            className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[140px]"
          >
            {baseChainOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {loading ? (
        <div className="py-16 flex flex-col justify-center items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin" />
          <div className="text-gray-500 text-sm">{t('loadingData')}</div>
        </div>
      ) : (
        <>
          {/* Heatmap */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              {t('priceVolatilityHeatmap')}
            </h3>
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <div className="flex">
                  <div className="w-24 shrink-0" />
                  {supportedChains.map((chain) => (
                    <div key={chain} className="flex-1 min-w-20 text-center px-1 py-2">
                      <span className="text-xs font-medium text-gray-600">{chainNames[chain]}</span>
                    </div>
                  ))}
                </div>
                {supportedChains.map((xChain) => (
                  <div key={xChain} className="flex">
                    <div className="w-24 shrink-0 flex items-center py-1">
                      <span className="text-xs font-medium text-gray-600">
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
                          className="flex-1 min-w-20 h-12 flex items-center justify-center px-0.5"
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
                            <span className="text-gray-300 text-sm">—</span>
                          ) : (
                            <span
                              className={`text-xs font-medium ${percent > maxHeatmapValue * 0.5 ? 'text-white' : 'text-gray-900'}`}
                            >
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
                  <div
                    className="w-32 h-2"
                    style={{ background: 'linear-gradient(to right, #4CAF50, #F59E0B, #EF4444)' }}
                  />
                  <span className="text-xs text-gray-500">{t('high')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 mb-8 pb-8 border-b border-gray-200">
            {statsData.map((stat, index) => (
              <div
                key={index}
                className={`px-4 py-3 ${index > 0 ? 'border-l border-gray-200' : ''}`}
              >
                <div className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</div>
                <div className="text-lg font-semibold text-gray-900 mt-1">{stat.value}</div>
                {stat.subValue && (
                  <div className="text-xs text-gray-400 mt-0.5">{stat.subValue}</div>
                )}
              </div>
            ))}
          </div>

          {/* Price Comparison Table */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              {t('priceComparisonTable')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {t('blockchain')}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('price')}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('differenceVs')} {selectedBaseChain ? chainNames[selectedBaseChain] : ''}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('percentDifference')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {priceDifferences.map((item) => (
                    <tr key={item.chain} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 mr-2"
                            style={{ backgroundColor: chainColors[item.chain as Blockchain] }}
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {chainNames[item.chain as Blockchain]}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-gray-900">
                        $
                        {item.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm">
                        <span className={item.diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {item.diff >= 0 ? '+' : ''}${item.diff.toFixed(4)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm">
                        <span className={item.diffPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {item.diffPercent >= 0 ? '+' : ''}
                          {item.diffPercent.toFixed(4)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stability Analysis Table */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              {t('stabilityAnalysis')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {t('blockchain')}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('priceVolatility')}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('stabilityRating')}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('averageDelay')}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('maxDelay')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {supportedChains.map((chain) => {
                    const volatility = chainVolatility[chain] ?? 0;
                    const delay = updateDelays[chain];
                    const stabilityRating = getStabilityRating(volatility);

                    const stabilityColorMap: Record<string, string> = {
                      stable: 'text-green-600',
                      moderate: 'text-yellow-600',
                      unstable: 'text-red-600',
                    };

                    return (
                      <tr key={chain} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 mr-2"
                              style={{ backgroundColor: chainColors[chain] }}
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {chainNames[chain]}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm text-gray-900">
                          {volatility > 0 ? `${volatility.toFixed(4)}%` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-sm font-medium ${stabilityColorMap[stabilityRating]}`}
                          >
                            {volatility > 0 ? t(`stability.${stabilityRating}`) : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm text-gray-900">
                          {delay ? `${delay.avgDelay.toFixed(2)} ${t('seconds')}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm text-gray-900">
                          {delay ? `${delay.maxDelay.toFixed(2)} ${t('seconds')}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Price Chart */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              {t('priceChart')}
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#9ca3af"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                    stroke="#9ca3af"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      padding: '12px 16px',
                    }}
                    formatter={(value) => [`$${Number(value).toFixed(4)}`, '']}
                    labelStyle={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '16px',
                      fontSize: '12px',
                    }}
                    iconType="line"
                    iconSize={12}
                  />
                  {supportedChains.map((chain) => (
                    <Line
                      key={chain}
                      type="monotone"
                      dataKey={chain}
                      name={chainNames[chain]}
                      stroke={chainColors[chain]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
