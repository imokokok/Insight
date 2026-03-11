'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  BarChart,
  Bar,
  ReferenceLine,
  Scatter,
  ComposedChart,
  Brush,
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
  { value: 1, key: 'timeRange1Hour', label: '1H' },
  { value: 6, key: 'timeRange6Hours', label: '6H' },
  { value: 24, key: 'timeRange24Hours', label: '24H' },
  { value: 168, key: 'timeRange7Days', label: '7D' },
];

type RefreshInterval = 0 | 30000 | 60000 | 300000;

const DEVIATION_THRESHOLD = 0.5;

const getDiffColorGradient = (diffPercent: number): string => {
  const absPercent = Math.abs(diffPercent);
  if (absPercent <= 0.5) {
    return 'bg-gray-50';
  }
  if (diffPercent > 0.5) {
    if (diffPercent > 2) return 'bg-red-200';
    if (diffPercent > 1) return 'bg-red-100';
    return 'bg-red-50';
  } else {
    if (diffPercent < -2) return 'bg-green-200';
    if (diffPercent < -1) return 'bg-green-100';
    return 'bg-green-50';
  }
};

const getDiffTextColor = (diffPercent: number): string => {
  if (Math.abs(diffPercent) <= 0.5) {
    return 'text-gray-600';
  }
  if (diffPercent > 0.5) {
    if (diffPercent > 2) return 'text-red-700';
    if (diffPercent > 1) return 'text-red-600';
    return 'text-red-500';
  } else {
    if (diffPercent < -2) return 'text-green-700';
    if (diffPercent < -1) return 'text-green-600';
    return 'text-green-500';
  }
};

const Sparkline = ({
  data,
  color,
  width = 80,
  height = 20,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) => {
  if (!data || data.length < 2) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const recentData = data.slice(-20);
  const min = Math.min(...recentData);
  const max = Math.max(...recentData);
  const range = max - min || 1;

  const points = recentData
    .map((value, index) => {
      const x = (index / (recentData.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

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
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [prevStats, setPrevStats] = useState<{
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    standardDeviationPercent: number;
  } | null>(null);
  const [visibleChains, setVisibleChains] = useState<Blockchain[]>([]);
  const [showMA, setShowMA] = useState<boolean>(false);
  const [maPeriod, setMaPeriod] = useState<number>(7);
  const [chartKey, setChartKey] = useState<number>(0);
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  const [hoveredCell, setHoveredCell] = useState<{
    xChain: Blockchain;
    yChain: Blockchain;
    x: number;
    y: number;
  } | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('chain');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCell, setSelectedCell] = useState<{
    xChain: Blockchain;
    yChain: Blockchain;
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [focusedChain, setFocusedChain] = useState<Blockchain | null>(null);
  const [tableFilter, setTableFilter] = useState<'all' | 'abnormal' | 'normal'>('all');
  const [recommendedBaseChain, setRecommendedBaseChain] = useState<Blockchain | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing' | 'success' | 'error'>(
    'idle'
  );
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);

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
    filteredChains.forEach((chain) => {
      historicalPrices[chain]?.forEach((price) => allTimestamps.add(price.timestamp));
    });
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    const historicalHeaders = [t('timestamp'), ...filteredChains.map((chain) => chainNames[chain])];
    csvLines.push(historicalHeaders.join(','));

    sortedTimestamps.forEach((timestamp) => {
      const row: string[] = [new Date(timestamp).toLocaleString()];
      filteredChains.forEach((chain) => {
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
      historicalPrices: filteredChains.map((chain) => ({
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
        dataPoints: totalDataPoints,
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

  const fetchData = useCallback(async () => {
    setRefreshStatus('refreshing');
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

      const validPrices = currentResults.map((d) => d.price).filter((p) => p > 0);
      const newAvgPrice =
        validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
      const newMaxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
      const newMinPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
      const newPriceRange = newMaxPrice - newMinPrice;
      const variance =
        validPrices.length > 1
          ? validPrices.reduce((sum, price) => sum + Math.pow(price - newAvgPrice, 2), 0) /
            validPrices.length
          : 0;
      const stdDev = Math.sqrt(variance);
      const newStdDevPercent = newAvgPrice > 0 ? (stdDev / newAvgPrice) * 100 : 0;

      setPrevStats({
        avgPrice: newAvgPrice,
        maxPrice: newMaxPrice,
        minPrice: newMinPrice,
        priceRange: newPriceRange,
        standardDeviationPercent: newStdDevPercent,
      });

      if (supportedChains.length > 0) {
        const chainWithMostData = supportedChains.reduce((best, chain) => {
          const bestLen = historicalMap[best]?.length || 0;
          const chainLen = historicalMap[chain]?.length || 0;
          return chainLen > bestLen ? chain : best;
        }, supportedChains[0]);
        setRecommendedBaseChain(chainWithMostData);
      }

      setLastUpdated(new Date());
      setRefreshStatus('success');
      setShowRefreshSuccess(true);
      setTimeout(() => setShowRefreshSuccess(false), 2000);
    } catch (error) {
      console.error('Error fetching data:', error);
      setRefreshStatus('error');
    } finally {
      setLoading(false);
    }
  }, [currentClient, supportedChains, selectedSymbol, selectedTimeRange]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider, selectedSymbol, selectedTimeRange]);

  useEffect(() => {
    if (refreshInterval === 0) return;

    const intervalId = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  useEffect(() => {
    if (supportedChains.length > 0 && visibleChains.length === 0) {
      setVisibleChains([...supportedChains]);
    }
  }, [supportedChains, visibleChains.length]);

  useEffect(() => {
    if (supportedChains.length > 0 && !selectedBaseChain) {
      const defaultChain = recommendedBaseChain || supportedChains[0];
      setSelectedBaseChain(defaultChain);
    }
    if (
      supportedChains.length > 0 &&
      selectedBaseChain &&
      !supportedChains.includes(selectedBaseChain)
    ) {
      const defaultChain = recommendedBaseChain || supportedChains[0];
      setSelectedBaseChain(defaultChain);
    }
  }, [supportedChains, selectedBaseChain, recommendedBaseChain]);

  const toggleChain = (chain: Blockchain) => {
    setVisibleChains((prev) => {
      if (prev.includes(chain)) {
        return prev.filter((c) => c !== chain);
      }
      return [...prev, chain];
    });
  };

  const filteredChains = useMemo(() => {
    return supportedChains.filter((chain) => visibleChains.includes(chain));
  }, [supportedChains, visibleChains]);

  const chartData = useMemo(() => {
    if (Object.keys(historicalPrices).length === 0) return [];
    const timestamps = new Set<number>();
    filteredChains.forEach((chain) => {
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

    const calculateMA = (
      prices: (number | undefined)[],
      period: number,
      index: number
    ): number | null => {
      if (index < period - 1) return null;
      const slice = prices.slice(index - period + 1, index + 1);
      const validPrices = slice.filter((p): p is number => p !== undefined);
      if (validPrices.length < period) return null;
      return validPrices.reduce((a, b) => a + b, 0) / period;
    };

    const chainPriceArrays: Partial<Record<Blockchain, (number | undefined)[]>> = {};
    filteredChains.forEach((chain) => {
      chainPriceArrays[chain] = sortedTimestamps.map((timestamp) => {
        const price = historicalPrices[chain]?.find((p) => p.timestamp === timestamp);
        return price?.price;
      });
    });

    return sortedTimestamps.map((timestamp, index) => {
      const dataPoint: {
        timestamp: number;
        time: string;
        [key: string]: number | string | null;
      } = {
        timestamp,
        time: new Date(timestamp).toLocaleString([], getTimeFormat()),
      };
      filteredChains.forEach((chain) => {
        const price = historicalPrices[chain]?.find((p) => p.timestamp === timestamp);
        if (price) {
          dataPoint[chain] = price.price;
          const prices = chainPriceArrays[chain] || [];
          const ma7 = calculateMA(prices, 7, index);
          const ma20 = calculateMA(prices, 20, index);
          dataPoint[`${chain}_MA7`] = ma7;
          dataPoint[`${chain}_MA20`] = ma20;
        }
      });
      return dataPoint;
    });
  }, [historicalPrices, filteredChains, selectedTimeRange]);

  const priceDifferences = useMemo(() => {
    const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
    if (filteredPrices.length < 2 || !selectedBaseChain) return [];
    const basePriceData = filteredPrices.find((p) => p.chain === selectedBaseChain);
    if (!basePriceData) return [];
    const basePrice = basePriceData.price;
    return filteredPrices.map((priceData) => {
      const diff = priceData.price - basePrice;
      const diffPercent = (diff / basePrice) * 100;
      return {
        chain: priceData.chain!,
        price: priceData.price,
        diff,
        diffPercent,
      };
    });
  }, [currentPrices, selectedBaseChain, filteredChains]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedPriceDifferences = useMemo(() => {
    let filtered = [...priceDifferences];

    if (tableFilter === 'abnormal') {
      filtered = filtered.filter((item) => Math.abs(item.diffPercent) > DEVIATION_THRESHOLD);
    } else if (tableFilter === 'normal') {
      filtered = filtered.filter((item) => Math.abs(item.diffPercent) <= DEVIATION_THRESHOLD);
    }

    const baseChainItem = filtered.find((item) => item.chain === selectedBaseChain);
    const otherItems = filtered.filter((item) => item.chain !== selectedBaseChain);

    otherItems.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'chain':
          comparison = chainNames[a.chain].localeCompare(chainNames[b.chain]);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'diff':
          comparison = a.diff - b.diff;
          break;
        case 'diffPercent':
          comparison = a.diffPercent - b.diffPercent;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    if (baseChainItem) {
      return [baseChainItem, ...otherItems];
    }
    return otherItems;
  }, [priceDifferences, sortColumn, sortDirection, selectedBaseChain, tableFilter]);

  const validPrices = useMemo(() => {
    return currentPrices
      .filter((d) => d.chain && filteredChains.includes(d.chain))
      .map((d) => d.price)
      .filter((p) => p > 0);
  }, [currentPrices, filteredChains]);

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

  const medianPrice = useMemo(() => {
    if (validPrices.length === 0) return 0;
    const sorted = [...validPrices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }, [validPrices]);

  const calculatePercentile = (sortedPrices: number[], percentile: number): number => {
    if (sortedPrices.length === 0) return 0;
    const index = (percentile / 100) * (sortedPrices.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (upper >= sortedPrices.length) return sortedPrices[sortedPrices.length - 1];
    if (lower === upper) return sortedPrices[lower];
    return sortedPrices[lower] * (1 - weight) + sortedPrices[upper] * weight;
  };

  const iqrValue = useMemo(() => {
    if (validPrices.length < 2) return 0;
    const sorted = [...validPrices].sort((a, b) => a - b);
    const q1 = calculatePercentile(sorted, 25);
    const q3 = calculatePercentile(sorted, 75);
    return q3 - q1;
  }, [validPrices]);

  const skewness = useMemo(() => {
    if (validPrices.length < 3 || standardDeviation === 0) return 0;
    const n = validPrices.length;
    const sumCubedDiff = validPrices.reduce(
      (sum, price) => sum + Math.pow((price - avgPrice) / standardDeviation, 3),
      0
    );
    return (n / ((n - 1) * (n - 2))) * sumCubedDiff;
  }, [validPrices, avgPrice, standardDeviation]);

  const kurtosis = useMemo(() => {
    if (validPrices.length < 4 || standardDeviation === 0) return 0;
    const n = validPrices.length;
    const sumFourthDiff = validPrices.reduce(
      (sum, price) => sum + Math.pow((price - avgPrice) / standardDeviation, 4),
      0
    );
    return (
      ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sumFourthDiff -
      (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3))
    );
  }, [validPrices, avgPrice, standardDeviation]);

  const confidenceInterval95 = useMemo(() => {
    if (validPrices.length < 2 || standardDeviation === 0) {
      return { lower: avgPrice, upper: avgPrice };
    }
    const n = validPrices.length;
    const standardError = standardDeviation / Math.sqrt(n);
    const marginOfError = 1.96 * standardError;
    return {
      lower: avgPrice - marginOfError,
      upper: avgPrice + marginOfError,
    };
  }, [validPrices, avgPrice, standardDeviation]);

  const calculateSMA = (data: number[], period: number): (number | null)[] => {
    if (data.length < period) return data.map(() => null);
    const result: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  };

  const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);

    const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
    const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = xSlice[i] - xMean;
      const yDiff = ySlice[i] - yMean;
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xDenominator * yDenominator);
    if (denominator === 0) return 0;

    return numerator / denominator;
  };

  const correlationMatrix = useMemo(() => {
    const matrix: Partial<Record<Blockchain, Partial<Record<Blockchain, number>>>> = {};

    filteredChains.forEach((chainX) => {
      matrix[chainX] = {};
      filteredChains.forEach((chainY) => {
        const pricesX = historicalPrices[chainX]?.map((p) => p.price) || [];
        const pricesY = historicalPrices[chainY]?.map((p) => p.price) || [];

        if (chainX === chainY) {
          matrix[chainX]![chainY] = 1;
        } else {
          const correlation = calculatePearsonCorrelation(pricesX, pricesY);
          matrix[chainX]![chainY] = isNaN(correlation) ? 0 : correlation;
        }
      });
    });

    return matrix;
  }, [historicalPrices, filteredChains]);

  const getCorrelationColor = (correlation: number): string => {
    const clampedCorrelation = Math.max(-1, Math.min(1, correlation));

    if (clampedCorrelation >= 0) {
      const t = clampedCorrelation;
      const r = Math.floor(255 - (255 - 30) * t);
      const g = Math.floor(255 - (255 - 64) * t);
      const b = Math.floor(255 - (255 - 175) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = Math.abs(clampedCorrelation);
      const r = Math.floor(255 - (255 - 220) * t);
      const g = Math.floor(255 - (255 - 38) * t);
      const b = Math.floor(255 - (255 - 38) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const chartDataWithMA = useMemo(() => {
    if (!showMA || chartData.length === 0) return chartData;
    const avgPrices = chartData.map((point) => {
      const prices = filteredChains
        .map((chain) => point[chain] as number | undefined)
        .filter((p): p is number => p !== undefined && !isNaN(p));
      return prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    });
    const maValues = calculateSMA(avgPrices, maPeriod);
    return chartData.map((point, index) => ({
      ...point,
      ma: maValues[index],
    }));
  }, [chartData, showMA, maPeriod, filteredChains]);

  const priceChangePercent = useMemo(() => {
    const result: Partial<Record<Blockchain, number>> = {};
    filteredChains.forEach((chain) => {
      const prices = chartData
        .map((point) => point[chain] as number | undefined)
        .filter((p): p is number => p !== undefined);
      if (prices.length >= 2) {
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        if (firstPrice > 0) {
          result[chain] = ((lastPrice - firstPrice) / firstPrice) * 100;
        }
      }
    });
    return result;
  }, [chartData, filteredChains]);

  const handleLegendClick = (e: { dataKey?: string | number | ((obj: any) => any) }) => {
    const dataKey = e.dataKey;
    if (typeof dataKey === 'string') {
      setHiddenLines((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(dataKey)) {
          newSet.delete(dataKey);
        } else {
          newSet.add(dataKey);
        }
        return newSet;
      });
    }
  };

  const handleLegendDoubleClick = (chain: Blockchain) => {
    if (focusedChain === chain) {
      setFocusedChain(null);
      setHiddenLines(new Set());
    } else {
      setFocusedChain(chain);
      const newHidden = new Set<string>();
      filteredChains.forEach((c) => {
        if (c !== chain) {
          newHidden.add(c);
        }
      });
      setHiddenLines(newHidden);
    }
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const priceData = payload.filter(
      (p) => !p.dataKey.includes('_MA') && filteredChains.includes(p.dataKey as Blockchain)
    );
    const maData = payload.filter((p) => p.dataKey.includes('_MA'));

    const prices = priceData.map((p) => p.value);
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const avgPriceTooltip =
      prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    return (
      <div className="bg-white border border-gray-200 shadow-lg p-4 min-w-[280px]">
        <p className="text-gray-600 text-xs mb-3 font-medium border-b border-gray-100 pb-2">
          {label}
        </p>
        {priceData.map((entry, index) => {
          const chain = entry.dataKey as Blockchain;
          const ma7 = payload.find((p) => p.dataKey === `${chain}_MA7`);
          const ma20 = payload.find((p) => p.dataKey === `${chain}_MA20`);
          const changePercent = priceChangePercent[chain];
          const isHighest = entry.value === maxPrice && prices.length > 1;
          const isLowest = entry.value === minPrice && prices.length > 1;
          const deviationFromAvg =
            avgPriceTooltip > 0 ? ((entry.value - avgPriceTooltip) / avgPriceTooltip) * 100 : 0;

          return (
            <div key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm font-medium text-gray-900">{chainNames[chain]}</span>
                {isHighest && (
                  <span className="text-xs font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                    {t('crossChain.highestPriceLabel')}
                  </span>
                )}
                {isLowest && (
                  <span className="text-xs font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                    {t('crossChain.lowestPriceLabel')}
                  </span>
                )}
                {changePercent !== undefined && (
                  <span
                    className={`text-xs font-medium ml-auto ${
                      changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {changePercent >= 0 ? '+' : ''}
                    {changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-700 pl-5 flex items-center gap-2">
                <span className="font-mono">${Number(entry.value).toFixed(4)}</span>
                {prices.length > 1 && (
                  <span
                    className={`text-xs ${
                      deviationFromAvg >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ({deviationFromAvg >= 0 ? '+' : ''}
                    {deviationFromAvg.toFixed(2)}% {t('crossChain.deviationFromAvg')})
                  </span>
                )}
              </div>
              {ma7 && ma7.value !== null && (
                <div className="text-xs text-blue-500 pl-5">
                  MA7: ${Number(ma7.value).toFixed(4)}
                </div>
              )}
              {ma20 && ma20.value !== null && (
                <div className="text-xs text-orange-500 pl-5">
                  MA20: ${Number(ma20.value).toFixed(4)}
                </div>
              )}
            </div>
          );
        })}
        {maData.length > 0 && priceData.length === 0 && (
          <div className="text-xs text-gray-500">
            {maData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>
                  {entry.dataKey}: ${Number(entry.value).toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalDataPoints = useMemo(() => {
    let count = 0;
    filteredChains.forEach((chain) => {
      count += historicalPrices[chain]?.length || 0;
    });
    return count;
  }, [historicalPrices, filteredChains]);

  const iqrOutliers = useMemo(() => {
    if (validPrices.length < 4)
      return { outliers: [], q1: 0, q3: 0, iqr: 0, lowerBound: 0, upperBound: 0 };

    const sorted = [...validPrices].sort((a, b) => a - b);
    const n = sorted.length;

    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers: {
      chain: Blockchain;
      price: number;
      deviationPercent: number;
      boundType: 'lower' | 'upper';
      expectedRange: string;
    }[] = [];

    currentPrices.forEach((priceData) => {
      if (!priceData.chain || !filteredChains.includes(priceData.chain)) return;
      if (priceData.price < lowerBound || priceData.price > upperBound) {
        const boundType = priceData.price < lowerBound ? 'lower' : 'upper';
        const boundValue = boundType === 'lower' ? lowerBound : upperBound;
        const deviationPercent = Math.abs((priceData.price - boundValue) / boundValue) * 100;

        outliers.push({
          chain: priceData.chain,
          price: priceData.price,
          deviationPercent,
          boundType,
          expectedRange: `$${lowerBound.toFixed(4)} - $${upperBound.toFixed(4)}`,
        });
      }
    });

    return {
      outliers,
      q1,
      q3,
      iqr,
      lowerBound,
      upperBound,
    };
  }, [validPrices, currentPrices, filteredChains]);

  const historicalOutliers = useMemo(() => {
    const result: { timestamp: number; chain: Blockchain; price: number }[] = [];

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      if (prices.length < 4) return;

      const priceValues = prices.map((p) => p.price).sort((a, b) => a - b);
      const n = priceValues.length;
      const q1Index = Math.floor(n * 0.25);
      const q3Index = Math.floor(n * 0.75);
      const q1 = priceValues[q1Index];
      const q3 = priceValues[q3Index];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      prices.forEach((priceData) => {
        if (priceData.price < lowerBound || priceData.price > upperBound) {
          result.push({
            timestamp: priceData.timestamp,
            chain,
            price: priceData.price,
          });
        }
      });
    });

    return result;
  }, [historicalPrices, filteredChains]);

  const stdDevHistoricalOutliers = useMemo(() => {
    const result: { timestamp: number; chain: Blockchain; price: number; deviation: number }[] = [];

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      if (prices.length < 2) return;

      const priceValues = prices.map((p) => p.price);
      const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
      const variance =
        priceValues.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / priceValues.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) return;

      const lowerBound = mean - 2 * stdDev;
      const upperBound = mean + 2 * stdDev;

      prices.forEach((priceData) => {
        if (priceData.price < lowerBound || priceData.price > upperBound) {
          const deviation = Math.abs(priceData.price - mean) / stdDev;
          result.push({
            timestamp: priceData.timestamp,
            chain,
            price: priceData.price,
            deviation,
          });
        }
      });
    });

    return result;
  }, [historicalPrices, filteredChains]);

  const scatterData = useMemo(() => {
    return stdDevHistoricalOutliers
      .map((outlier) => {
        const dataPoint = chartData.find((d) => d.timestamp === outlier.timestamp);
        return {
          ...dataPoint,
          outlierChain: outlier.chain,
          outlierPrice: outlier.price,
          deviation: outlier.deviation,
        };
      })
      .filter((d) => d.timestamp);
  }, [stdDevHistoricalOutliers, chartData]);

  const getAnomalyReason = (
    chain: Blockchain,
    boundType: 'lower' | 'upper',
    deviationPercent: number
  ): string => {
    const reasons: string[] = [];

    if (boundType === 'lower') {
      reasons.push(t('crossChain.anomalyReasons.priceSignificantlyLower'));
      reasons.push(t('crossChain.anomalyReasons.liquidityIssue'));
      reasons.push(t('crossChain.anomalyReasons.oracleDelay'));
    } else {
      reasons.push(t('crossChain.anomalyReasons.priceSignificantlyHigher'));
      reasons.push(t('crossChain.anomalyReasons.premiumTrading'));
      reasons.push(t('crossChain.anomalyReasons.demandSpike'));
    }

    if (deviationPercent > 5) {
      reasons.push(t('crossChain.anomalyReasons.severeDeviation'));
    } else if (deviationPercent > 2) {
      reasons.push(t('crossChain.anomalyReasons.moderateDeviation'));
    }

    const volatility = chainVolatility[chain] ?? 0;
    if (volatility > 0.3) {
      reasons.push(t('crossChain.anomalyReasons.highVolatility'));
    }

    return reasons.slice(0, 3).join('；');
  };

  const priceDistributionData = useMemo(() => {
    if (validPrices.length === 0) return [];

    const numBins = Math.min(10, Math.max(5, validPrices.length));
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    const range = max - min;
    const binWidth = range > 0 ? range / numBins : 1;

    const bins: {
      range: string;
      count: number;
      minPrice: number;
      maxPrice: number;
      midPrice: number;
    }[] = [];

    for (let i = 0; i < numBins; i++) {
      const binMin = min + i * binWidth;
      const binMax = min + (i + 1) * binWidth;
      const rangeLabel = `$${binMin.toFixed(2)}-$${binMax.toFixed(2)}`;
      bins.push({
        range: rangeLabel,
        count: 0,
        minPrice: binMin,
        maxPrice: binMax,
        midPrice: (binMin + binMax) / 2,
      });
    }

    validPrices.forEach((price) => {
      for (let i = 0; i < bins.length; i++) {
        if (
          price >= bins[i].minPrice &&
          (price < bins[i].maxPrice || (i === bins.length - 1 && price <= bins[i].maxPrice))
        ) {
          bins[i].count++;
          break;
        }
      }
    });

    return bins.map((bin) => ({
      range: bin.range,
      count: bin.count,
      midPrice: bin.midPrice,
    }));
  }, [validPrices]);

  const meanBinIndex = useMemo(() => {
    if (priceDistributionData.length === 0 || avgPrice === 0) return -1;
    for (let i = 0; i < priceDistributionData.length; i++) {
      const binMin = i === 0 ? 0 : priceDistributionData[i - 1].midPrice;
      const binMax = priceDistributionData[i].midPrice;
      if (avgPrice >= binMin && avgPrice <= binMax) {
        return i;
      }
    }
    return -1;
  }, [priceDistributionData, avgPrice]);

  const medianBinIndex = useMemo(() => {
    if (priceDistributionData.length === 0 || medianPrice === 0) return -1;
    for (let i = 0; i < priceDistributionData.length; i++) {
      const binMin = i === 0 ? 0 : priceDistributionData[i - 1].midPrice;
      const binMax = priceDistributionData[i].midPrice;
      if (medianPrice >= binMin && medianPrice <= binMax) {
        return i;
      }
    }
    return -1;
  }, [priceDistributionData, medianPrice]);

  const stdDevBinRange = useMemo(() => {
    if (priceDistributionData.length === 0 || standardDeviation === 0) return null;
    const lower = avgPrice - standardDeviation;
    const upper = avgPrice + standardDeviation;
    return { lower, upper };
  }, [priceDistributionData, avgPrice, standardDeviation]);

  const boxPlotData = useMemo(() => {
    const result: {
      chain: Blockchain;
      chainName: string;
      color: string;
      min: number;
      q1: number;
      median: number;
      q3: number;
      max: number;
      outliers: number[];
      iqr: number;
      lowerWhisker: number;
      upperWhisker: number;
    }[] = [];

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      if (prices.length < 4) return;

      const sorted = [...prices].sort((a, b) => a - b);
      const n = sorted.length;

      const q1Index = Math.floor(n * 0.25);
      const q3Index = Math.floor(n * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      const nonOutliers = sorted.filter((p) => p >= lowerBound && p <= upperBound);
      const outliers = sorted.filter((p) => p < lowerBound || p > upperBound);

      result.push({
        chain,
        chainName: chainNames[chain],
        color: chainColors[chain],
        min: nonOutliers.length > 0 ? Math.min(...nonOutliers) : sorted[0],
        q1,
        median: sorted[Math.floor(n / 2)],
        q3,
        max: nonOutliers.length > 0 ? Math.max(...nonOutliers) : sorted[n - 1],
        outliers,
        iqr,
        lowerWhisker: lowerBound,
        upperWhisker: upperBound,
      });
    });

    return result;
  }, [historicalPrices, filteredChains]);

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

  const calculateZScore = (price: number, mean: number, stdDev: number): number | null => {
    if (stdDev === 0) return null;
    return (price - mean) / stdDev;
  };

  const isOutlier = (zScore: number | null): boolean => {
    if (zScore === null) return false;
    return Math.abs(zScore) > 2;
  };

  const calculateChangePercent = (current: number, previous: number): number | null => {
    if (previous === 0 || current === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const renderTrendIndicator = (changePercent: number | null) => {
    if (changePercent === null) return null;
    const isPositive = changePercent >= 0;
    return (
      <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(changePercent).toFixed(2)}%
      </span>
    );
  };

  const chainVolatility = useMemo(() => {
    const volatility: Partial<Record<Blockchain, number>> = {};
    filteredChains.forEach((chain) => {
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
  }, [historicalPrices, filteredChains]);

  const updateDelays = useMemo(() => {
    if (filteredChains.length === 0) return {};
    const baseChain = filteredChains[0];
    const delays: Partial<Record<Blockchain, { avgDelay: number; maxDelay: number }>> = {};

    const basePrices = historicalPrices[baseChain] || [];
    if (basePrices.length === 0) return delays;

    filteredChains.forEach((chain) => {
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
  }, [historicalPrices, filteredChains]);

  const dataIntegrity = useMemo(() => {
    const integrity: Partial<Record<Blockchain, number>> = {};
    const updateIntervalMinutes = 1;
    const expectedPointsPerHour = 60 / updateIntervalMinutes;
    const expectedPoints = expectedPointsPerHour * selectedTimeRange;

    filteredChains.forEach((chain) => {
      const actualPoints = historicalPrices[chain]?.length || 0;
      const score = expectedPoints > 0 ? (actualPoints / expectedPoints) * 100 : 0;
      integrity[chain] = Math.min(score, 100);
    });

    return integrity;
  }, [historicalPrices, filteredChains, selectedTimeRange]);

  const priceJumpFrequency = useMemo(() => {
    const frequency: Partial<Record<Blockchain, number>> = {};

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      if (prices.length < 2) {
        frequency[chain] = 0;
        return;
      }

      const changes: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const prevPrice = prices[i - 1].price;
        const currPrice = prices[i].price;
        if (prevPrice > 0) {
          const changePercent = Math.abs((currPrice - prevPrice) / prevPrice) * 100;
          changes.push(changePercent);
        }
      }

      if (changes.length === 0) {
        frequency[chain] = 0;
        return;
      }

      const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
      const threshold = avgChange * 2;
      const jumpCount = changes.filter((change) => change > threshold).length;
      frequency[chain] = jumpCount;
    });

    return frequency;
  }, [historicalPrices, filteredChains]);

  const getDataFreshness = (chain: Blockchain): { status: string; color: string } => {
    const delay = updateDelays[chain];
    if (!delay) return { status: 'unknown', color: 'text-gray-400' };
    if (delay.avgDelay < 5) return { status: 'excellent', color: 'text-green-600' };
    if (delay.avgDelay < 15) return { status: 'good', color: 'text-yellow-600' };
    return { status: 'slow', color: 'text-red-600' };
  };

  const getIntegrityColor = (value: number): string => {
    if (value >= 95) return '#10B981';
    if (value >= 90) return '#F59E0B';
    return '#EF4444';
  };

  const getJumpColor = (count: number): string => {
    if (count < 3) return '#10B981';
    if (count <= 5) return '#F59E0B';
    return '#EF4444';
  };

  const getVolatilityColor = (value: number): string => {
    if (value < 0.1) return '#10B981';
    if (value <= 0.3) return '#F59E0B';
    return '#EF4444';
  };

  const ProgressBar = ({
    value,
    color,
    max = 100,
    showValue = true,
    suffix = '%',
  }: {
    value: number;
    color: string;
    max?: number;
    showValue?: boolean;
    suffix?: string;
  }) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
            }}
          />
        </div>
        {showValue && (
          <span className="text-xs font-mono text-gray-600 min-w-[45px] text-right">
            {value.toFixed(1)}
            {suffix}
          </span>
        )}
      </div>
    );
  };

  const JumpIndicator = ({ count }: { count: number }) => {
    const color = getJumpColor(count);
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className="w-2 h-4 rounded-sm"
              style={{
                backgroundColor: count >= level ? color : '#E5E7EB',
              }}
            />
          ))}
        </div>
        <span className="text-xs font-mono text-gray-600">
          {count} {t('crossChain.frequency')}
        </span>
      </div>
    );
  };

  const heatmapData = useMemo(() => {
    const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
    if (filteredPrices.length < 2) return [];
    const data: HeatmapData[] = [];

    filteredChains.forEach((xChain) => {
      filteredChains.forEach((yChain) => {
        const xPrice = filteredPrices.find((p) => p.chain === xChain)?.price || 0;
        const yPrice = filteredPrices.find((p) => p.chain === yChain)?.price || 0;
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
  }, [currentPrices, filteredChains]);

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

  const getDiffColorGradient = (diffPercent: number): { bg: string; text: string } => {
    if (diffPercent > 0.5) {
      const intensity = Math.min((diffPercent - 0.5) / 2, 1);
      const r = Math.floor(254 + (239 - 254) * intensity);
      const g = Math.floor(226 + (68 - 226) * intensity);
      const b = Math.floor(226 + (68 - 226) * intensity);
      return {
        bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
        text: intensity > 0.5 ? '#dc2626' : '#ef4444',
      };
    } else if (diffPercent < -0.5) {
      const intensity = Math.min((-diffPercent - 0.5) / 2, 1);
      const r = Math.floor(226 + (68 - 226) * intensity);
      const g = Math.floor(254 + (239 - 254) * intensity);
      const b = Math.floor(226 + (68 - 226) * intensity);
      return {
        bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
        text: intensity > 0.5 ? '#059669' : '#10B981',
      };
    }
    return { bg: 'transparent', text: '#6b7280' };
  };

  const providerOptions = Object.values(OracleProvider).map((provider) => ({
    value: provider,
    label: providerNames[provider],
  }));

  const symbolOptions = symbols.map((symbol) => ({
    value: symbol,
    label: symbol,
  }));

  const refreshOptions = [
    { value: 0, label: t('crossChain.autoRefreshOff') },
    { value: 30000, label: t('crossChain.autoRefresh30s') },
    { value: 60000, label: t('crossChain.autoRefresh1m') },
    { value: 300000, label: t('crossChain.autoRefresh5m') },
  ];

  const baseChainOptions = filteredChains.map((chain) => ({
    value: chain,
    label: chainNames[chain],
  }));

  const chainsWithHighDeviation = useMemo(() => {
    return priceDifferences.filter((item) => Math.abs(item.diffPercent) > DEVIATION_THRESHOLD);
  }, [priceDifferences]);

  const statsData = [
    {
      label: t('crossChain.averagePrice'),
      value:
        avgPrice > 0
          ? `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-',
      trend: calculateChangePercent(avgPrice, prevStats?.avgPrice || 0),
      tooltip: t('crossChain.tooltip.averagePrice'),
    },
    {
      label: t('crossChain.medianPrice'),
      value:
        medianPrice > 0
          ? `$${medianPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.medianPrice'),
    },
    {
      label: t('crossChain.highestPrice'),
      value:
        maxPrice > 0
          ? `$${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-',
      trend: calculateChangePercent(maxPrice, prevStats?.maxPrice || 0),
      subValue:
        minPrice > 0
          ? `Min: $${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : null,
      tooltip: t('crossChain.tooltip.highestPrice'),
    },
    {
      label: t('crossChain.priceRange'),
      value:
        priceRange > 0
          ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-',
      trend: calculateChangePercent(priceRange, prevStats?.priceRange || 0),
      tooltip: t('crossChain.tooltip.priceRange'),
    },
    {
      label: t('crossChain.iqr'),
      value:
        iqrValue > 0
          ? `$${iqrValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.iqr'),
    },
    {
      label: t('crossChain.standardDeviation'),
      value: standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-',
      trend: calculateChangePercent(
        standardDeviationPercent,
        prevStats?.standardDeviationPercent || 0
      ),
      subValue:
        standardDeviation > 0
          ? `$${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : null,
      tooltip: t('crossChain.tooltip.standardDeviation'),
    },
    {
      label: t('crossChain.skewness'),
      value: skewness !== 0 ? skewness.toFixed(4) : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.skewness'),
    },
    {
      label: t('crossChain.kurtosis'),
      value: kurtosis !== 0 ? kurtosis.toFixed(4) : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.kurtosis'),
    },
    {
      label: t('crossChain.confidenceInterval95'),
      value:
        confidenceInterval95.lower > 0
          ? `$${confidenceInterval95.lower.toFixed(2)} - $${confidenceInterval95.upper.toFixed(2)}`
          : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.confidenceInterval95'),
    },
    {
      label: t('crossChain.coefficientOfVariation'),
      value: coefficientOfVariation > 0 ? `${(coefficientOfVariation * 100).toFixed(4)}%` : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.coefficientOfVariation'),
    },
    {
      label: t('crossChain.consistencyRating'),
      value:
        standardDeviationPercent > 0
          ? t(`crossChain.consistency.${getConsistencyRating(standardDeviationPercent)}`)
          : '-',
      trend: null,
      tooltip: t('crossChain.tooltip.consistencyRating'),
    },
    {
      label: t('crossChain.dataPoints'),
      value: totalDataPoints.toString(),
      trend: null,
      tooltip: t('crossChain.tooltip.dataPoints'),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('crossChain.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('crossOracle.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
          <span className="text-sm text-gray-500">{t('crossChain.export')}:</span>
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
          <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200">
            <span className="text-sm text-gray-600">{t('crossChain.autoRefresh')}</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value) as RefreshInterval)}
              className="text-sm bg-transparent focus:outline-none border-none"
            >
              {refreshOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchData}
            disabled={refreshStatus === 'refreshing'}
            className={`px-4 py-2 text-sm text-white transition-colors flex items-center gap-2 ${
              refreshStatus === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : refreshStatus === 'success' && showRefreshSuccess
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-900 hover:bg-gray-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {refreshStatus === 'refreshing' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
            ) : refreshStatus === 'error' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : showRefreshSuccess ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
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
            {refreshStatus === 'refreshing'
              ? t('crossChain.loading')
              : showRefreshSuccess
                ? t('crossChain.refreshSuccess')
                : t('crossChain.refresh')}
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              {t('crossChain.lastUpdated')} {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {chainsWithHighDeviation.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-medium text-amber-800">
              {t('crossChain.deviationAlert').replace(
                '{count}',
                chainsWithHighDeviation.length.toString()
              )}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 mb-6 pb-6 border-b border-gray-200">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            {t('crossChain.oracleProvider')}
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
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            {t('crossChain.symbol')}
          </label>
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
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            {t('crossChain.timeRange')}
          </label>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedTimeRange(range.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  selectedTimeRange === range.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-2">
            {t('crossChain.baseChain')}
            {recommendedBaseChain && selectedBaseChain === recommendedBaseChain && (
              <span className="text-xs text-blue-500 font-normal">
                ({t('crossChain.recommended')})
              </span>
            )}
          </label>
          <select
            value={selectedBaseChain || ''}
            onChange={(e) => setSelectedBaseChain(e.target.value as Blockchain)}
            className="px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[140px]"
          >
            {baseChainOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.value === recommendedBaseChain ? ` (${t('crossChain.recommended')})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">{t('crossChain.visibleChains')}</h3>
        <div className="flex flex-wrap gap-2">
          {supportedChains.map((chain) => {
            const isVisible = visibleChains.includes(chain);
            return (
              <button
                key={chain}
                onClick={() => toggleChain(chain)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2 ${
                  isVisible
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isVisible ? 'white' : chainColors[chain] }}
                />
                {chainNames[chain]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          {t('crossChain.technicalIndicators')}
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMA}
                onChange={(e) => setShowMA(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t('crossChain.showMA')}</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              {t('crossChain.maPeriod')}:
            </label>
            <select
              value={maPeriod}
              onChange={(e) => setMaPeriod(Number(e.target.value))}
              disabled={!showMA}
              className="px-3 py-1.5 text-sm border border-gray-300 bg-white focus:outline-none focus:border-gray-400 min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={7}>7</option>
              <option value={25}>25</option>
              <option value={99}>99</option>
            </select>
          </div>
          <button
            onClick={() => {
              setShowMA(false);
              setMaPeriod(7);
              setChartKey((prev) => prev + 1);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('crossChain.resetChart')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col justify-center items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin" />
          <div className="text-gray-500 text-sm">{t('crossChain.loadingData')}</div>
        </div>
      ) : (
        <>
          <div className="mb-8 pb-8 border-b border-gray-200 relative">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              {t('crossChain.priceSpreadHeatmap')}
            </h3>
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <div className="flex">
                  <div className="w-24 shrink-0" />
                  {filteredChains.map((chain, colIndex) => {
                    const isHighlighted =
                      hoveredCell && (hoveredCell.xChain === chain || hoveredCell.yChain === chain);
                    return (
                      <div
                        key={chain}
                        className={`flex-1 min-w-20 text-center px-1 py-2 transition-colors duration-150 ${
                          isHighlighted ? 'bg-gray-100' : ''
                        }`}
                      >
                        <span
                          className={`text-xs font-medium transition-colors ${
                            isHighlighted ? 'text-gray-900' : 'text-gray-600'
                          }`}
                        >
                          {chainNames[chain]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {filteredChains.map((xChain, rowIndex) => (
                  <div key={xChain} className="flex">
                    <div
                      className={`w-24 shrink-0 flex items-center py-1 transition-colors duration-150 ${
                        hoveredCell && hoveredCell.yChain === xChain ? 'bg-gray-100' : ''
                      }`}
                    >
                      <span
                        className={`text-xs font-medium transition-colors ${
                          hoveredCell && hoveredCell.yChain === xChain
                            ? 'text-gray-900'
                            : 'text-gray-600'
                        }`}
                      >
                        {chainNames[xChain]}
                      </span>
                    </div>
                    {filteredChains.map((yChain, colIndex) => {
                      const cell = heatmapData.find(
                        (d) => d.xChain === xChain && d.yChain === yChain
                      );
                      const percent = cell?.percent || 0;
                      const isDiagonal = xChain === yChain;
                      const isHovered =
                        hoveredCell &&
                        hoveredCell.xChain === xChain &&
                        hoveredCell.yChain === yChain;
                      const isRowHighlighted = hoveredCell && hoveredCell.yChain === xChain;
                      const isColHighlighted = hoveredCell && hoveredCell.xChain === yChain;
                      const isSelected =
                        selectedCell &&
                        selectedCell.xChain === xChain &&
                        selectedCell.yChain === yChain;

                      return (
                        <div
                          key={`${xChain}-${yChain}`}
                          className={`flex-1 min-w-20 h-12 flex items-center justify-center px-0.5 cursor-pointer transition-all duration-150 ${
                            isDiagonal ? '' : 'hover:ring-2 hover:ring-gray-400 hover:ring-inset'
                          } ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                          style={{
                            backgroundColor: isDiagonal
                              ? '#f3f4f6'
                              : getHeatmapColor(percent, maxHeatmapValue),
                            transform: isHovered && !isDiagonal ? 'scale(1.05)' : 'scale(1)',
                            zIndex: isHovered ? 10 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!isDiagonal) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredCell({
                                xChain,
                                yChain,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                              setTooltipPosition({
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }
                          }}
                          onMouseMove={(e) => {
                            if (!isDiagonal && hoveredCell) {
                              setTooltipPosition({
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => {
                            if (!isDiagonal) {
                              if (
                                selectedCell?.xChain === xChain &&
                                selectedCell?.yChain === yChain
                              ) {
                                setSelectedCell(null);
                              } else {
                                setSelectedCell({ xChain, yChain });
                              }
                            }
                          }}
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
                  <span className="text-xs text-gray-500">{t('crossOracle.low')}</span>
                  <div
                    className="w-32 h-2"
                    style={{ background: 'linear-gradient(to right, #4CAF50, #F59E0B, #EF4444)' }}
                  />
                  <span className="text-xs text-gray-500">{t('crossOracle.high')}</span>
                </div>
              </div>
            </div>

            {hoveredCell && !selectedCell && (
              <div
                className="fixed z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-4 min-w-[280px] pointer-events-none"
                style={{
                  left: `${Math.min(tooltipPosition.x + 15, window.innerWidth - 300)}px`,
                  top: `${Math.min(tooltipPosition.y + 15, window.innerHeight - 300)}px`,
                }}
              >
                <div className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  {t('crossChain.heatmapDetail')}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{chainNames[hoveredCell.xChain]}</span>
                    <span className="font-mono text-gray-900 font-medium">
                      $
                      {currentPrices
                        .find((p) => p.chain === hoveredCell.xChain)
                        ?.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        }) || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{chainNames[hoveredCell.yChain]}</span>
                    <span className="font-mono text-gray-900 font-medium">
                      $
                      {currentPrices
                        .find((p) => p.chain === hoveredCell.yChain)
                        ?.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        }) || '-'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100 space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{t('crossChain.priceDifference')}</span>
                      <span className="font-mono font-medium text-gray-900">
                        $
                        {heatmapData
                          .find(
                            (d) =>
                              d.xChain === hoveredCell.xChain && d.yChain === hoveredCell.yChain
                          )
                          ?.value.toFixed(4) || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{t('crossChain.percentDifference')}</span>
                      <span
                        className={`font-mono font-medium ${
                          (heatmapData.find(
                            (d) =>
                              d.xChain === hoveredCell.xChain && d.yChain === hoveredCell.yChain
                          )?.percent || 0) > 0.5
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        {heatmapData
                          .find(
                            (d) =>
                              d.xChain === hoveredCell.xChain && d.yChain === hoveredCell.yChain
                          )
                          ?.percent.toFixed(4) || '-'}
                        %
                      </span>
                    </div>
                    {(() => {
                      const cellData = heatmapData.find(
                        (d) => d.xChain === hoveredCell.xChain && d.yChain === hoveredCell.yChain
                      );
                      if (!cellData) return null;
                      const avgPercent =
                        heatmapData.reduce((sum, d) => sum + d.percent, 0) / heatmapData.length;
                      const deviationFromAvg =
                        avgPercent > 0 ? ((cellData.percent - avgPercent) / avgPercent) * 100 : 0;
                      const isArbitrageOpportunity = cellData.percent > 0.5;
                      return (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">
                              {t('crossChain.deviationFromAvg')}
                            </span>
                            <span
                              className={`font-mono font-medium ${
                                deviationFromAvg > 0 ? 'text-orange-600' : 'text-blue-600'
                              }`}
                            >
                              {deviationFromAvg >= 0 ? '+' : ''}
                              {deviationFromAvg.toFixed(2)}%
                            </span>
                          </div>
                          {isArbitrageOpportunity && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                  />
                                </svg>
                                {t('crossChain.arbitrageOpportunity')}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
                    {t('crossChain.clickToExpand')}
                  </div>
                </div>
              </div>
            )}

            {selectedCell && (
              <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      {chainNames[selectedCell.xChain]} vs {chainNames[selectedCell.yChain]}{' '}
                      {t('crossChain.detailComparison')}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        {chainNames[selectedCell.xChain]} {t('crossChain.price')}
                      </div>
                      <div className="text-2xl font-semibold text-gray-900 font-mono">
                        $
                        {currentPrices
                          .find((p) => p.chain === selectedCell.xChain)
                          ?.price.toFixed(4) || '-'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        {chainNames[selectedCell.yChain]} {t('crossChain.price')}
                      </div>
                      <div className="text-2xl font-semibold text-gray-900 font-mono">
                        $
                        {currentPrices
                          .find((p) => p.chain === selectedCell.yChain)
                          ?.price.toFixed(4) || '-'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        {t('crossChain.priceDifference')}
                      </div>
                      <div className="text-2xl font-semibold font-mono">
                        <span
                          className={(() => {
                            const cellData = heatmapData.find(
                              (d) =>
                                d.xChain === selectedCell.xChain && d.yChain === selectedCell.yChain
                            );
                            return cellData && cellData.percent > 0.5
                              ? 'text-red-600'
                              : 'text-green-600';
                          })()}
                        >
                          $
                          {heatmapData
                            .find(
                              (d) =>
                                d.xChain === selectedCell.xChain && d.yChain === selectedCell.yChain
                            )
                            ?.value.toFixed(4) || '-'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {heatmapData
                          .find(
                            (d) =>
                              d.xChain === selectedCell.xChain && d.yChain === selectedCell.yChain
                          )
                          ?.percent.toFixed(4)}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {t('crossChain.priceTrendComparison')}
                    </div>
                    <div className="h-48 bg-gray-50 rounded-lg p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis
                            dataKey="time"
                            stroke="#9ca3af"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <YAxis
                            domain={['auto', 'auto']}
                            tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
                            stroke="#9ca3af"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                            width={60}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '8px 12px',
                            }}
                            formatter={(value) => [`$${Number(value).toFixed(4)}`, '']}
                            labelStyle={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}
                          />
                          <Line
                            type="monotone"
                            dataKey={selectedCell.xChain}
                            name={chainNames[selectedCell.xChain]}
                            stroke={chainColors[selectedCell.xChain]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 3, strokeWidth: 0 }}
                          />
                          <Line
                            type="monotone"
                            dataKey={selectedCell.yChain}
                            name={chainNames[selectedCell.yChain]}
                            stroke={chainColors[selectedCell.yChain]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 3, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {t('crossChain.historicalSpreadChange')}
                    </div>
                    <div className="h-40 bg-gray-50 rounded-lg p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={(() => {
                            const xPrices = historicalPrices[selectedCell.xChain] || [];
                            const yPrices = historicalPrices[selectedCell.yChain] || [];
                            const timestamps = new Set<number>();
                            xPrices.forEach((p) => timestamps.add(p.timestamp));
                            yPrices.forEach((p) => timestamps.add(p.timestamp));
                            return Array.from(timestamps)
                              .sort((a, b) => a - b)
                              .map((timestamp) => {
                                const xPrice = xPrices.find(
                                  (p) => p.timestamp === timestamp
                                )?.price;
                                const yPrice = yPrices.find(
                                  (p) => p.timestamp === timestamp
                                )?.price;
                                const spread = xPrice && yPrice ? Math.abs(xPrice - yPrice) : null;
                                const spreadPercent =
                                  xPrice && spread ? (spread / xPrice) * 100 : null;
                                return {
                                  time: new Date(timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }),
                                  timestamp,
                                  spread: spread,
                                  spreadPercent: spreadPercent,
                                };
                              })
                              .filter((d) => d.spread !== null);
                          })()}
                          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis
                            dataKey="time"
                            stroke="#9ca3af"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <YAxis
                            tickFormatter={(value) => `${value.toFixed(2)}%`}
                            stroke="#9ca3af"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                            width={55}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '8px 12px',
                            }}
                            formatter={(value) => [
                              `${Number(value).toFixed(4)}%`,
                              t('crossChain.spreadPercent'),
                            ]}
                            labelStyle={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="spreadPercent"
                            stroke="#EF4444"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 3, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-0 mb-8 pb-8 border-b border-gray-200">
            {statsData.map((stat, index) => (
              <div
                key={index}
                className={`px-4 py-3 ${index > 0 ? 'border-l border-gray-200' : ''}`}
                title={stat.tooltip}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wide cursor-help flex items-center gap-1">
                    {stat.label}
                    {stat.tooltip && (
                      <svg
                        className="w-3 h-3 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                  {stat.trend !== null &&
                    stat.trend !== undefined &&
                    renderTrendIndicator(stat.trend)}
                </div>
                <div className="text-lg font-semibold text-gray-900 mt-1">{stat.value}</div>
                {stat.subValue && (
                  <div className="text-xs text-gray-400 mt-0.5">{stat.subValue}</div>
                )}
              </div>
            ))}
          </div>

          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              {t('crossChain.priceDistributionAnalysis')}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-indigo-500 rounded" />
                  {t('crossChain.priceDistributionHistogram')}
                </h4>
                <div className="h-64 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={priceDistributionData}
                      margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="range"
                        stroke="#9ca3af"
                        tick={{ fontSize: 9, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          padding: '12px 16px',
                        }}
                        formatter={(value) => [value, '频率']}
                        labelStyle={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}
                      />
                      {medianBinIndex >= 0 && priceDistributionData[medianBinIndex] && (
                        <ReferenceLine
                          x={priceDistributionData[medianBinIndex].range}
                          stroke="#10B981"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{
                            value: `${t('crossChain.medianLine')}: $${medianPrice.toFixed(2)}`,
                            position: 'top',
                            fill: '#10B981',
                            fontSize: 10,
                          }}
                        />
                      )}
                      {meanBinIndex >= 0 && priceDistributionData[meanBinIndex] && (
                        <ReferenceLine
                          x={priceDistributionData[meanBinIndex].range}
                          stroke="#3B82F6"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{
                            value: `${t('crossChain.meanLine')}: $${avgPrice.toFixed(2)}`,
                            position: 'top',
                            fill: '#3B82F6',
                            fontSize: 10,
                          }}
                        />
                      )}
                      <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">{t('crossChain.medianLine')}</div>
                    <div className="text-lg font-semibold text-green-600">
                      ${medianPrice.toFixed(4)}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">{t('crossChain.meanLine')}</div>
                    <div className="text-lg font-semibold text-blue-600">
                      ${avgPrice.toFixed(4)}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">
                      {t('crossChain.standardDeviation')}
                    </div>
                    <div className="text-lg font-semibold text-purple-600">
                      ${standardDeviation.toFixed(4)}
                    </div>
                  </div>
                </div>
                {stdDevBinRange && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xs text-blue-700 mb-1">{t('crossChain.stdDevRange')}</div>
                    <div className="text-sm font-mono text-blue-900">
                      ${stdDevBinRange.lower.toFixed(4)} - ${stdDevBinRange.upper.toFixed(4)}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {t('crossChain.stdDevRangeDesc')}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded" />
                  {t('crossChain.chainPriceBoxPlot')}
                </h4>
                <div className="h-64 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {boxPlotData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={boxPlotData}
                        margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                        layout="vertical"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis
                          type="number"
                          stroke="#9ca3af"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={(value) => `$${value.toFixed(0)}`}
                        />
                        <YAxis
                          type="category"
                          dataKey="chainName"
                          stroke="#9ca3af"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                          width={80}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            padding: '12px 16px',
                          }}
                          formatter={(value) => {
                            if (typeof value === 'number') {
                              return [`$${value.toFixed(4)}`, ''];
                            }
                            return [value, ''];
                          }}
                          labelStyle={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}
                        />
                        <Legend
                          wrapperStyle={{
                            paddingTop: '16px',
                            fontSize: '11px',
                          }}
                          iconType="rect"
                          iconSize={12}
                        />
                        <Bar
                          dataKey="min"
                          name={t('crossChain.minValue')}
                          fill="transparent"
                          stroke="transparent"
                        />
                        <Bar
                          dataKey="max"
                          name={t('crossChain.maxValue')}
                          fill="transparent"
                          stroke="transparent"
                        />
                        {boxPlotData.map((data, index) => (
                          <Scatter
                            key={`box-${index}`}
                            data={[data]}
                            fill={data.color}
                            shape={(props: any) => {
                              const { cx, cy } = props;
                              const chartHeight = 200;
                              const boxHeight = chartHeight / boxPlotData.length;
                              const y = 30 + index * boxHeight + boxHeight / 2;
                              const xScale = (price: number) => {
                                const allPrices = boxPlotData.flatMap((d) => [
                                  d.min,
                                  d.max,
                                  ...d.outliers,
                                ]);
                                const minPrice = Math.min(...allPrices);
                                const maxPrice = Math.max(...allPrices);
                                const range = maxPrice - minPrice;
                                const leftPadding = 50;
                                const chartWidth = 400;
                                return leftPadding + ((price - minPrice) / range) * chartWidth;
                              };

                              return (
                                <g key={`boxplot-${index}`}>
                                  <line
                                    x1={xScale(data.min)}
                                    y1={y}
                                    x2={xScale(data.max)}
                                    y2={y}
                                    stroke={data.color}
                                    strokeWidth={1}
                                    strokeDasharray="2 2"
                                  />
                                  <rect
                                    x={xScale(data.q1)}
                                    y={y - 15}
                                    width={xScale(data.q3) - xScale(data.q1)}
                                    height={30}
                                    fill={data.color}
                                    fillOpacity={0.3}
                                    stroke={data.color}
                                    strokeWidth={2}
                                  />
                                  <line
                                    x1={xScale(data.median)}
                                    y1={y - 15}
                                    x2={xScale(data.median)}
                                    y2={y + 15}
                                    stroke={data.color}
                                    strokeWidth={3}
                                  />
                                  <line
                                    x1={xScale(data.min)}
                                    y1={y - 8}
                                    x2={xScale(data.min)}
                                    y2={y + 8}
                                    stroke={data.color}
                                    strokeWidth={2}
                                  />
                                  <line
                                    x1={xScale(data.max)}
                                    y1={y - 8}
                                    x2={xScale(data.max)}
                                    y2={y + 8}
                                    stroke={data.color}
                                    strokeWidth={2}
                                  />
                                  {data.outliers.map((outlier, outlierIndex) => (
                                    <circle
                                      key={`outlier-${outlierIndex}`}
                                      cx={xScale(outlier)}
                                      cy={y}
                                      r={4}
                                      fill="#EF4444"
                                      stroke="#fff"
                                      strokeWidth={1}
                                    />
                                  ))}
                                </g>
                              );
                            }}
                          />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                      数据不足，无法生成箱线图
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-2">箱线图说明</div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-purple-200 border-2 border-purple-500 rounded-sm" />
                        <span>箱体: Q1 - Q3 (四分位距)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-0.5 bg-purple-500" />
                        <span>中线: 中位数 (Q2)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>红点: 异常值</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-2">异常值检测</div>
                    <div className="text-xs text-gray-600">
                      超出 [Q1 - 1.5×IQR, Q3 + 1.5×IQR] 范围的值被标记为异常值
                    </div>
                    <div className="mt-2 text-xs font-mono text-gray-700">IQR = Q3 - Q1</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
                {t('crossChain.priceComparisonTable')}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t('crossChain.filter')}:</span>
                <button
                  onClick={() => setTableFilter('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    tableFilter === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('crossChain.filterAll')}
                </button>
                <button
                  onClick={() => setTableFilter('abnormal')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    tableFilter === 'abnormal'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('crossChain.filterAbnormal')}
                </button>
                <button
                  onClick={() => setTableFilter('normal')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    tableFilter === 'normal'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('crossChain.filterNormal')}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th
                      className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('chain')}
                    >
                      <div className="flex items-center gap-1">
                        {t('crossChain.blockchain')}
                        <span className="text-gray-400">
                          {sortColumn === 'chain' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {t('crossChain.price')}
                        <span className="text-gray-400">
                          {sortColumn === 'price' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('diff')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {t('crossChain.differenceVs')}{' '}
                        {selectedBaseChain ? chainNames[selectedBaseChain] : ''}
                        <span className="text-gray-400">
                          {sortColumn === 'diff' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('diffPercent')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {t('crossChain.percentDifference')}
                        <span className="text-gray-400">
                          {sortColumn === 'diffPercent'
                            ? sortDirection === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">
                      {t('crossChain.trend')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPriceDifferences.map((item) => {
                    const zScore = calculateZScore(item.price, avgPrice, standardDeviation);
                    const outlier = isOutlier(zScore);
                    const bgColor = getDiffColorGradient(item.diffPercent);
                    const textColor = getDiffTextColor(item.diffPercent);
                    const chainHistoricalPrices = historicalPrices[item.chain as Blockchain];
                    const priceHistory = chainHistoricalPrices?.map((p) => p.price) || [];

                    return (
                      <tr
                        key={item.chain}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${bgColor} ${
                          outlier ? 'ring-1 ring-amber-300' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 mr-2"
                              style={{ backgroundColor: chainColors[item.chain as Blockchain] }}
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {chainNames[item.chain as Blockchain]}
                            </span>
                            {outlier && (
                              <span className="ml-2 text-amber-600 text-xs font-medium bg-amber-100 px-1.5 py-0.5">
                                {t('crossChain.outlier')}
                              </span>
                            )}
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
                          <span className={`font-medium ${textColor}`}>
                            {item.diffPercent >= 0 ? '+' : ''}
                            {item.diffPercent.toFixed(4)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Sparkline
                            data={priceHistory}
                            color={chainColors[item.chain as Blockchain]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              {t('crossChain.priceDistribution')}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priceDistributionData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="range"
                    stroke="#9ca3af"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      padding: '12px 16px',
                    }}
                    formatter={(value) => [value, t('crossChain.frequency')]}
                    labelStyle={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}
                  />
                  {meanBinIndex >= 0 && (
                    <ReferenceLine
                      x={priceDistributionData[meanBinIndex]?.range}
                      stroke="#3B82F6"
                      strokeDasharray="5 5"
                      label={{
                        value: t('crossChain.meanLine'),
                        position: 'top',
                        fill: '#3B82F6',
                        fontSize: 11,
                      }}
                    />
                  )}
                  {medianBinIndex >= 0 && (
                    <ReferenceLine
                      x={priceDistributionData[medianBinIndex]?.range}
                      stroke="#10B981"
                      strokeDasharray="5 5"
                      label={{
                        value: t('crossChain.medianLine'),
                        position: 'top',
                        fill: '#10B981',
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              链间相关性分析
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Pearson 相关系数衡量两条链价格走势的线性相关程度。r = 1 表示完全正相关，r = -1
              表示完全负相关，r = 0 表示无线性相关。
            </p>
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <div className="flex">
                  <div className="w-24 shrink-0" />
                  {filteredChains.map((chain) => (
                    <div key={chain} className="flex-1 min-w-20 text-center px-1 py-2">
                      <span className="text-xs font-medium text-gray-600">{chainNames[chain]}</span>
                    </div>
                  ))}
                </div>
                {filteredChains.map((chainX) => (
                  <div key={chainX} className="flex">
                    <div className="w-24 shrink-0 flex items-center py-1">
                      <span className="text-xs font-medium text-gray-600">
                        {chainNames[chainX]}
                      </span>
                    </div>
                    {filteredChains.map((chainY) => {
                      const correlation = correlationMatrix[chainX]?.[chainY] ?? 0;
                      const isDiagonal = chainX === chainY;
                      const bgColor = getCorrelationColor(correlation);
                      const textColor =
                        Math.abs(correlation) > 0.5 ? 'text-white' : 'text-gray-900';

                      return (
                        <div
                          key={`${chainX}-${chainY}`}
                          className="flex-1 min-w-20 h-12 flex items-center justify-center px-0.5 cursor-pointer transition-transform hover:scale-105"
                          style={{ backgroundColor: bgColor }}
                          title={`${chainNames[chainX]} vs ${chainNames[chainY]}: r = ${correlation.toFixed(4)}`}
                        >
                          <span className={`text-xs font-medium ${textColor}`}>
                            {correlation.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="mt-4 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">负相关</span>
                    <div
                      className="w-32 h-3"
                      style={{ background: 'linear-gradient(to right, #dc2626, #ffffff, #1e40af)' }}
                    />
                    <span className="text-xs text-gray-500">正相关</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-center gap-6 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3" style={{ backgroundColor: '#1e40af' }} />
                    <span>r = 1 (完全正相关)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-white border border-gray-300" />
                    <span>r = 0 (无相关)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3" style={{ backgroundColor: '#dc2626' }} />
                    <span>r = -1 (完全负相关)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
              {t('crossChain.stabilityAnalysis')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {t('crossChain.blockchain')}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      数据完整性
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      价格波动率
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      价格跳动频率
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('crossChain.stabilityRating')}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('crossChain.dataFreshness')}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('crossChain.averageDelay')}
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                      {t('crossChain.maxDelay')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChains.map((chain) => {
                    const volatility = chainVolatility[chain] ?? 0;
                    const delay = updateDelays[chain];
                    const stabilityRating = getStabilityRating(volatility);
                    const freshness = getDataFreshness(chain);
                    const integrity = dataIntegrity[chain] ?? 0;
                    const jumpCount = priceJumpFrequency[chain] ?? 0;

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
                        <td className="py-3 px-4">
                          <ProgressBar
                            value={integrity}
                            color={getIntegrityColor(integrity)}
                            max={100}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <ProgressBar
                            value={volatility}
                            color={getVolatilityColor(volatility)}
                            max={1}
                            suffix="%"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <JumpIndicator count={jumpCount} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-sm font-medium ${stabilityColorMap[stabilityRating]}`}
                          >
                            {volatility > 0 ? t(`crossChain.stability.${stabilityRating}`) : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-medium ${freshness.color}`}>
                            {t(`crossChain.freshness.${freshness.status}`)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm text-gray-900">
                          {delay ? `${delay.avgDelay.toFixed(2)} ${t('crossChain.seconds')}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm text-gray-900">
                          {delay ? `${delay.maxDelay.toFixed(2)} ${t('crossChain.seconds')}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
                  {t('crossChain.priceChart')}
                </h3>
                {scatterData.length > 0 && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: '#F97316' }}
                    />
                    <span className="text-xs text-gray-700">
                      {t('crossChain.anomalyPoint')} ({t('crossChain.anomalyDescription')})
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                {filteredChains.slice(0, 3).map((chain) => {
                  const change = priceChangePercent[chain];
                  if (change === undefined) return null;
                  return (
                    <div key={chain} className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: chainColors[chain] }}
                      />
                      <span className="text-xs text-gray-600">{chainNames[chain]}:</span>
                      <span
                        className={`text-xs font-medium ${
                          change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {change >= 0 ? '+' : ''}
                        {change.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartDataWithMA}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
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
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '16px',
                      fontSize: '12px',
                    }}
                    iconType="line"
                    iconSize={12}
                    onClick={handleLegendClick}
                    content={({ payload }) => {
                      if (!payload) return null;
                      return (
                        <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
                          {payload.map((entry: any, index: number) => {
                            const dataKey = entry.dataKey;
                            const chain = dataKey as Blockchain;
                            const isFocused = focusedChain === chain;
                            const isHidden = hiddenLines.has(dataKey);
                            if (dataKey === 'ma' || dataKey.includes('_MA')) return null;
                            return (
                              <div
                                key={`legend-${index}`}
                                className={`flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded transition-all ${
                                  isFocused
                                    ? 'bg-blue-100 ring-2 ring-blue-400'
                                    : 'hover:bg-gray-100'
                                } ${isHidden ? 'opacity-40' : ''}`}
                                onClick={() => handleLegendClick({ dataKey: chain })}
                                onDoubleClick={() => handleLegendDoubleClick(chain)}
                                title={t('crossChain.legendDoubleClickHint')}
                              >
                                <span
                                  className="w-3 h-0.5 rounded"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-xs text-gray-700">{entry.value}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                  <Brush
                    dataKey="time"
                    height={30}
                    stroke="#6366F1"
                    fill="#f3f4f6"
                    travellerWidth={10}
                  />
                  {iqrOutliers.lowerBound > 0 && iqrOutliers.upperBound > 0 && (
                    <>
                      <ReferenceLine
                        y={iqrOutliers.lowerBound}
                        stroke="#EF4444"
                        strokeDasharray="5 5"
                        label={{
                          value: t('crossChain.iqrLowerBound'),
                          position: 'right',
                          fill: '#EF4444',
                          fontSize: 10,
                        }}
                      />
                      <ReferenceLine
                        y={iqrOutliers.upperBound}
                        stroke="#EF4444"
                        strokeDasharray="5 5"
                        label={{
                          value: t('crossChain.iqrUpperBound'),
                          position: 'right',
                          fill: '#EF4444',
                          fontSize: 10,
                        }}
                      />
                    </>
                  )}
                  {filteredChains.map((chain) => (
                    <Line
                      key={chain}
                      type="monotone"
                      dataKey={chain}
                      name={chainNames[chain]}
                      stroke={chainColors[chain]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      hide={hiddenLines.has(chain)}
                    />
                  ))}
                  {showMA ? (
                    <Line
                      type="monotone"
                      dataKey="ma"
                      name={`MA${maPeriod}`}
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={false}
                      activeDot={false}
                      hide={hiddenLines.has('ma')}
                    />
                  ) : (
                    <>
                      {filteredChains.map((chain) => (
                        <Line
                          key={`${chain}-MA7`}
                          type="monotone"
                          dataKey={`${chain}_MA7`}
                          name={`${chainNames[chain]} MA7`}
                          stroke={chainColors[chain]}
                          strokeWidth={1}
                          strokeDasharray="4 2"
                          dot={false}
                          activeDot={false}
                          hide={hiddenLines.has(chain) || hiddenLines.has(`${chain}_MA7`)}
                        />
                      ))}
                      {filteredChains.map((chain) => (
                        <Line
                          key={`${chain}-MA20`}
                          type="monotone"
                          dataKey={`${chain}_MA20`}
                          name={`${chainNames[chain]} MA20`}
                          stroke={chainColors[chain]}
                          strokeWidth={1}
                          strokeDasharray="8 4"
                          dot={false}
                          activeDot={false}
                          hide={hiddenLines.has(chain) || hiddenLines.has(`${chain}_MA20`)}
                        />
                      ))}
                    </>
                  )}
                  {scatterData.length > 0 && (
                    <Scatter
                      data={scatterData}
                      fill="#F97316"
                      shape="circle"
                      name={t('crossChain.anomalyPoint')}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {iqrOutliers.outliers.length > 0 && (
            <div className="mb-8 pb-8 border-b border-gray-200 mt-8">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
                  {t('crossChain.anomalyDetectionPanel')}
                </h3>
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                  {t('crossChain.anomalyCount', { count: iqrOutliers.outliers.length })}
                </span>
              </div>

              <div className="mb-4 p-4 bg-gray-50 border border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{t('crossChain.q1Percentile')}:</span>
                    <span className="ml-2 font-mono font-medium">${iqrOutliers.q1.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('crossChain.q3Percentile')}:</span>
                    <span className="ml-2 font-mono font-medium">${iqrOutliers.q3.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('crossChain.iqrLabel')}:</span>
                    <span className="ml-2 font-mono font-medium">
                      ${iqrOutliers.iqr.toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('crossChain.normalRange')}:</span>
                    <span className="ml-2 font-mono font-medium text-green-600">
                      ${iqrOutliers.lowerBound.toFixed(4)} - ${iqrOutliers.upperBound.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {t('crossChain.chainName')}
                      </th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                        {t('crossChain.anomalyPrice')}
                      </th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                        {t('crossChain.expectedRange')}
                      </th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                        {t('crossChain.deviationDegree')}
                      </th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                        {t('crossChain.anomalyType')}
                      </th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {t('crossChain.possibleCause')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {iqrOutliers.outliers.map((outlier, index) => (
                      <tr
                        key={`${outlier.chain}-${index}`}
                        className="border-b border-gray-100 bg-red-50 hover:bg-red-100"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 mr-2"
                              style={{ backgroundColor: chainColors[outlier.chain] }}
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {chainNames[outlier.chain]}
                            </span>
                            <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-red-200 text-red-800">
                              {t('crossChain.outlier')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm font-medium text-red-600">
                          ${outlier.price.toFixed(4)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm text-gray-600">
                          {outlier.expectedRange}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm">
                          <span
                            className={`font-medium ${
                              outlier.deviationPercent > 5
                                ? 'text-red-600'
                                : outlier.deviationPercent > 2
                                  ? 'text-orange-600'
                                  : 'text-yellow-600'
                            }`}
                          >
                            {outlier.deviationPercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2 py-1 text-xs font-medium ${
                              outlier.boundType === 'lower'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {outlier.boundType === 'lower'
                              ? t('crossChain.belowLowerBound')
                              : t('crossChain.aboveUpperBound')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {getAnomalyReason(
                            outlier.chain,
                            outlier.boundType,
                            outlier.deviationPercent
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-amber-600 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-amber-800">
                      {t('crossChain.iqrExplanationTitle')}
                    </h4>
                    <p className="text-xs text-amber-700 mt-1">
                      {t('crossChain.iqrExplanationDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {iqrOutliers.outliers.length === 0 && validPrices.length >= 4 && (
            <div className="mb-8 pb-8 border-b border-gray-200 mt-8">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-5 h-5 text-green-500"
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
                <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
                  异常检测面板 (IQR方法)
                </h3>
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                  无异常
                </span>
              </div>

              <div className="p-4 bg-green-50 border border-green-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Q1 (25%分位数):</span>
                    <span className="ml-2 font-mono font-medium">${iqrOutliers.q1.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Q3 (75%分位数):</span>
                    <span className="ml-2 font-mono font-medium">${iqrOutliers.q3.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">IQR:</span>
                    <span className="ml-2 font-mono font-medium">
                      ${iqrOutliers.iqr.toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">正常范围:</span>
                    <span className="ml-2 font-mono font-medium text-green-600">
                      ${iqrOutliers.lowerBound.toFixed(4)} - ${iqrOutliers.upperBound.toFixed(4)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-green-700 mt-3">
                  所有链的价格均在正常范围内，未检测到异常值。跨链价格一致性良好。
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
