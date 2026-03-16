'use client';

import React from 'react';
import { OracleProvider } from '@/types/oracle';

export interface SymbolConfig {
  symbol: string;
  name: string;
  category: 'layer1' | 'defi' | 'stablecoin';
  iconColor: string;
}

export const tradingPairs: SymbolConfig[] = [
  // Layer 1
  { symbol: 'BTC/USD', name: 'Bitcoin', category: 'layer1', iconColor: '#F7931A' },
  { symbol: 'ETH/USD', name: 'Ethereum', category: 'layer1', iconColor: chainColors.ethereum },
  { symbol: 'SOL/USD', name: 'Solana', category: 'layer1', iconColor: chainColors.solana },
  { symbol: 'AVAX/USD', name: 'Avalanche', category: 'layer1', iconColor: chainColors.avalanche },
  { symbol: 'NEAR/USD', name: 'NEAR Protocol', category: 'layer1', iconColor: '#00C08B' },
  { symbol: 'MATIC/USD', name: 'Polygon', category: 'layer1', iconColor: '#8247E5' },
  { symbol: 'ARB/USD', name: 'Arbitrum', category: 'layer1', iconColor: '#28A0F0' },
  { symbol: 'OP/USD', name: 'Optimism', category: 'layer1', iconColor: '#FF0420' },
  { symbol: 'DOT/USD', name: 'Polkadot', category: 'layer1', iconColor: '#E6007A' },
  { symbol: 'ADA/USD', name: 'Cardano', category: 'layer1', iconColor: '#0033AD' },
  { symbol: 'ATOM/USD', name: 'Cosmos', category: 'layer1', iconColor: '#2E3148' },
  { symbol: 'FTM/USD', name: 'Fantom', category: 'layer1', iconColor: '#1969FF' },
  // DeFi
  { symbol: 'LINK/USD', name: 'Chainlink', category: 'defi', iconColor: '#2A5ADA' },
  { symbol: 'UNI/USD', name: 'Uniswap', category: 'defi', iconColor: '#FF007A' },
  { symbol: 'AAVE/USD', name: 'Aave', category: 'defi', iconColor: '#B6509E' },
  { symbol: 'MKR/USD', name: 'Maker', category: 'defi', iconColor: '#1AAB9B' },
  { symbol: 'SNX/USD', name: 'Synthetix', category: 'defi', iconColor: '#0B0816' },
  { symbol: 'COMP/USD', name: 'Compound', category: 'defi', iconColor: '#00D395' },
  { symbol: 'YFI/USD', name: 'Yearn', category: 'defi', iconColor: '#006AE3' },
  { symbol: 'CRV/USD', name: 'Curve', category: 'defi', iconColor: '#FF5A00' },
  { symbol: 'LDO/USD', name: 'Lido DAO', category: 'defi', iconColor: '#F69988' },
  { symbol: 'SUSHI/USD', name: 'SushiSwap', category: 'defi', iconColor: '#FA52A0' },
  { symbol: '1INCH/USD', name: '1inch', category: 'defi', iconColor: '#1B314F' },
  { symbol: 'BAL/USD', name: 'Balancer', category: 'defi', iconColor: '#1E8E3E' },
  { symbol: 'FXS/USD', name: 'Frax Share', category: 'defi', iconColor: '#000000' },
  { symbol: 'RPL/USD', name: 'Rocket Pool', category: 'defi', iconColor: '#FFD700' },
  { symbol: 'GMX/USD', name: 'GMX', category: 'defi', iconColor: '#2D42FC' },
  { symbol: 'DYDX/USD', name: 'dYdX', category: 'defi', iconColor: '#6966FF' },
  // Stablecoins
  { symbol: 'USDC/USD', name: 'USD Coin', category: 'stablecoin', iconColor: '#2775CA' },
  { symbol: 'USDT/USD', name: 'Tether', category: 'stablecoin', iconColor: '#26A17B' },
  { symbol: 'DAI/USD', name: 'DAI', category: 'stablecoin', iconColor: '#F5AC37' },
];

export const symbols = tradingPairs.map((pair) => pair.symbol);
import {
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
import { providerNames, type RefreshInterval } from '@/lib/constants';
import {
  getDeviationColor,
  calculateStandardDeviation as calcStdDev,
} from '@/lib/utils/chartSharedUtils';
import { semanticColors, baseColors, chainColors } from '@/lib/config/colors';

export { type RefreshInterval };

export const oracleClients = {
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

export const oracleNames = providerNames;

export type SortColumn = 'price' | 'timestamp' | null;
export type SortDirection = 'asc' | 'desc';
export type TimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';
export type DeviationFilter = 'all' | 'excellent' | 'good' | 'poor';

export const getDeviationColorClass = (deviationPercent: number | null): string => {
  if (deviationPercent === null) return `text-[${baseColors.gray[400]}]`;
  const color = getDeviationColor(deviationPercent);
  if (color === semanticColors.success.DEFAULT) return `text-[${semanticColors.success.dark}] bg-[${semanticColors.success.light}]`;
  if (color === semanticColors.warning.DEFAULT) return `text-[${semanticColors.warning.dark}] bg-[${semanticColors.warning.light}]`;
  if (color === semanticColors.danger.DEFAULT) return `text-[${semanticColors.danger.dark}] bg-[${semanticColors.danger.light}]`;
  return `text-[${semanticColors.warning.dark}] bg-[${semanticColors.warning.light}]`;
};

export const getDeviationBgClass = (deviationPercent: number | null): string => {
  if (deviationPercent === null) return '';
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation < 0.1) return `bg-[${semanticColors.success.DEFAULT}]`;
  if (absDeviation < 0.5) return `bg-[${semanticColors.warning.DEFAULT}]`;
  if (absDeviation < 1.0) return `bg-[${semanticColors.warning.dark}]`;
  return `bg-[${semanticColors.danger.DEFAULT}]`;
};

export const getFreshnessInfo = (
  timestamp: number
): { text: string; colorClass: string; seconds: number } => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  let text: string;
  let colorClass: string;

  if (seconds < 30) {
    text = seconds <= 1 ? '刚刚' : `${seconds}秒前`;
    colorClass = `text-[${semanticColors.success.dark}]`;
  } else if (seconds < 60) {
    text = `${seconds}秒前`;
    colorClass = `text-[${semanticColors.warning.dark}]`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    text = `${minutes}分钟前`;
    colorClass = `text-[${semanticColors.danger.dark}]`;
  } else {
    const hours = Math.floor(seconds / 3600);
    text = `${hours}小时前`;
    colorClass = `text-[${semanticColors.danger.dark}]`;
  }

  return { text, colorClass, seconds };
};

export const getFreshnessDotColor = (seconds: number): string => {
  if (seconds < 30) return `bg-[${semanticColors.success.DEFAULT}]`;
  if (seconds < 60) return `bg-[${semanticColors.warning.DEFAULT}]`;
  return `bg-[${semanticColors.danger.DEFAULT}]`;
};

export const calculateWeightedAverage = (
  prices: { price: number; confidence?: number | null | undefined }[]
): number => {
  const validData = prices.filter((d) => d.price > 0);
  if (validData.length === 0) return 0;

  let weightedSum = 0;
  let weightSum = 0;

  validData.forEach((data) => {
    const weight = data.confidence && data.confidence > 0 ? data.confidence : 1;
    weightedSum += data.price * weight;
    weightSum += weight;
  });

  return weightSum > 0 ? weightedSum / weightSum : 0;
};

export const calculateVariance = (prices: number[], mean: number): number => {
  if (prices.length < 2) return 0;
  const sumSquaredDiff = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
  return sumSquaredDiff / prices.length;
};

export const calculateStandardDeviation = (variance: number): number => {
  return Math.sqrt(variance);
};

export const calculateStandardDeviationFromValues = (values: number[]): number => {
  return calcStdDev(values);
};

export const getConsistencyRating = (stdDevPercent: number): string => {
  if (stdDevPercent < 0.1) return 'excellent';
  if (stdDevPercent < 0.3) return 'good';
  if (stdDevPercent < 0.5) return 'fair';
  return 'poor';
};

export type HealthColorType = 'price' | 'deviation' | 'range';
export type HealthIndicator = 'success' | 'warning' | 'danger' | 'neutral';

export interface HealthColor {
  bg: string;
  text: string;
  border: string;
  indicator: HealthIndicator;
}

export const getHealthColor = (
  type: HealthColorType,
  value: number,
  avgValue?: number
): HealthColor => {
  if (type === 'deviation') {
    if (value < 0.1)
      return {
        bg: `bg-[${semanticColors.success.light}]`,
        text: `text-[${semanticColors.success.text}]`,
        border: `border-[${baseColors.primary[200]}]`,
        indicator: 'success',
      };
    if (value < 0.3)
      return {
        bg: `bg-[${baseColors.primary[50]}]`,
        text: `text-[${baseColors.primary[700]}]`,
        border: `border-[${baseColors.primary[200]}]`,
        indicator: 'success',
      };
    if (value < 0.5)
      return {
        bg: `bg-[${semanticColors.warning.light}]`,
        text: `text-[${semanticColors.warning.text}]`,
        border: `border-[${semanticColors.warning.light}]`,
        indicator: 'warning',
      };
    return {
      bg: `bg-[${semanticColors.danger.light}]`,
      text: `text-[${semanticColors.danger.text}]`,
      border: `border-[${semanticColors.danger.light}]`,
      indicator: 'danger',
    };
  }
  if (type === 'range' && avgValue) {
    const rangePercent = (value / avgValue) * 100;
    if (rangePercent < 0.5)
      return {
        bg: `bg-[${semanticColors.success.light}]`,
        text: `text-[${semanticColors.success.text}]`,
        border: `border-[${baseColors.primary[200]}]`,
        indicator: 'success',
      };
    if (rangePercent < 1)
      return {
        bg: `bg-[${baseColors.primary[50]}]`,
        text: `text-[${baseColors.primary[700]}]`,
        border: `border-[${baseColors.primary[200]}]`,
        indicator: 'success',
      };
    if (rangePercent < 2)
      return {
        bg: `bg-[${semanticColors.warning.light}]`,
        text: `text-[${semanticColors.warning.text}]`,
        border: `border-[${semanticColors.warning.light}]`,
        indicator: 'warning',
      };
    return {
      bg: `bg-[${semanticColors.danger.light}]`,
      text: `text-[${semanticColors.danger.text}]`,
      border: `border-[${semanticColors.danger.light}]`,
      indicator: 'danger',
    };
  }
  return {
    bg: `bg-[${baseColors.gray[50]}]`,
    text: `text-[${baseColors.gray[700]}]`,
    border: `border-[${baseColors.gray[200]}]`,
    indicator: 'neutral',
  };
};

export const getTrendIcon = (changePercent: number | null) => {
  if (changePercent === null) return null;
  const isPositive = changePercent >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: isPositive ? semanticColors.success.light : semanticColors.danger.light,
        color: isPositive ? semanticColors.success.text : semanticColors.danger.text,
      }}
    >
      {isPositive ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
      {Math.abs(changePercent).toFixed(2)}%
    </span>
  );
};

export const calculateZScore = (price: number, mean: number, stdDev: number): number | null => {
  if (stdDev === 0) return null;
  return (price - mean) / stdDev;
};

export const isOutlier = (zScore: number | null): boolean => {
  if (zScore === null) return false;
  return Math.abs(zScore) > 2;
};

export const calculateSMA = (prices: number[], period: number): number[] => {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
};

export const calculateEMA = (prices: number[], period: number): number[] => {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      const sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
      ema.push(sum / period);
    } else {
      const currentEMA = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
      ema.push(currentEMA);
    }
  }
  return ema;
};

export const calculateRSI = (prices: number[], period: number = 14): number[] => {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      rsi.push(NaN);
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      }
    }
  }
  return rsi;
};

export const calculateATR = (
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number[] => {
  const tr: number[] = [];
  const atr: number[] = [];

  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      tr.push(highs[i] - lows[i]);
    } else {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(tr1, tr2, tr3));
    }

    if (i < period - 1) {
      atr.push(NaN);
    } else if (i === period - 1) {
      const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
      atr.push(sum / period);
    } else {
      const previousATR = atr[i - 1];
      const currentATR = (previousATR * (period - 1) + tr[i]) / period;
      atr.push(currentATR);
    }
  }
  return atr;
};

export const calculateBollingerBands = (
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): { middle: number[]; upper: number[]; lower: number[] } => {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const squaredDiffs = slice.map((p) => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const stdDev = Math.sqrt(variance);

      upper.push(middle[i] + stdDev * multiplier);
      lower.push(middle[i] - stdDev * multiplier);
    }
  }

  return { middle, upper, lower };
};

export const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
};

export interface ExportRow {
  oracle: string;
  provider: string;
  symbol: string;
  price: number;
  deviationPercent: number | null;
  confidence: number | null;
  source: string;
  timestamp: string;
}

export const exportToCSV = (
  priceData: {
    provider: OracleProvider;
    price: number;
    confidence?: number | null | undefined;
    source?: string;
    timestamp: number;
  }[],
  oracleNamesMap: Record<OracleProvider, string>,
  avgPrice: number,
  validPrices: number[]
) => {
  const headers = ['Oracle', 'Price', 'Deviation (%)', 'Confidence', 'Source', 'Timestamp'];
  const rows = priceData.map((data) => {
    let deviationPercent: number | null = null;
    if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
      deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
    }
    return [
      oracleNamesMap[data.provider],
      data.price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      deviationPercent !== null ? deviationPercent.toFixed(2) : '',
      data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '',
      data.source || '',
      new Date(data.timestamp).toLocaleString(),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `oracle-prices-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToJSON = (
  priceData: {
    provider: OracleProvider;
    price: number;
    confidence?: number | null | undefined;
    source?: string;
    timestamp: number;
    symbol?: string;
  }[],
  oracleNamesMap: Record<OracleProvider, string>,
  avgPrice: number,
  validPrices: number[]
) => {
  const exportData = priceData.map((data) => {
    let deviationPercent: number | null = null;
    if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
      deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
    }
    return {
      oracle: oracleNamesMap[data.provider],
      provider: data.provider,
      symbol: data.symbol,
      price: data.price,
      deviationPercent: deviationPercent,
      confidence: data.confidence,
      source: data.source,
      timestamp: new Date(data.timestamp).toISOString(),
    };
  });

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `oracle-prices-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const timeRanges: TimeRange[] = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'];

export const refreshOptions: { value: RefreshInterval; label: string }[] = [
  { value: 0, label: '关闭' },
  { value: 30000, label: '30秒' },
  { value: 60000, label: '1分钟' },
  { value: 300000, label: '5分钟' },
];

export interface HistoryMinMax {
  avgPrice: { min: number; max: number };
  weightedAvgPrice: { min: number; max: number };
  maxPrice: { min: number; max: number };
  minPrice: { min: number; max: number };
  priceRange: { min: number; max: number };
  standardDeviationPercent: { min: number; max: number };
  variance: { min: number; max: number };
}

export const initialHistoryMinMax: HistoryMinMax = {
  avgPrice: { min: Infinity, max: -Infinity },
  weightedAvgPrice: { min: Infinity, max: -Infinity },
  maxPrice: { min: Infinity, max: -Infinity },
  minPrice: { min: Infinity, max: -Infinity },
  priceRange: { min: Infinity, max: -Infinity },
  standardDeviationPercent: { min: Infinity, max: -Infinity },
  variance: { min: Infinity, max: -Infinity },
};

export const updateHistoryMinMax = (
  setHistoryMinMax: React.Dispatch<React.SetStateAction<HistoryMinMax>>,
  currentStats: {
    avgPrice: number;
    weightedAvgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    standardDeviationPercent: number;
    variance: number;
  } | null
) => {
  if (!currentStats) return;
  setHistoryMinMax((prev) => ({
    avgPrice: {
      min: Math.min(prev.avgPrice.min, currentStats.avgPrice),
      max: Math.max(prev.avgPrice.max, currentStats.avgPrice),
    },
    weightedAvgPrice: {
      min: Math.min(prev.weightedAvgPrice.min, currentStats.weightedAvgPrice),
      max: Math.max(prev.weightedAvgPrice.max, currentStats.weightedAvgPrice),
    },
    maxPrice: {
      min: Math.min(prev.maxPrice.min, currentStats.maxPrice),
      max: Math.max(prev.maxPrice.max, currentStats.maxPrice),
    },
    minPrice: {
      min: Math.min(prev.minPrice.min, currentStats.minPrice),
      max: Math.max(prev.minPrice.max, currentStats.minPrice),
    },
    priceRange: {
      min: Math.min(prev.priceRange.min, currentStats.priceRange),
      max: Math.max(prev.priceRange.max, currentStats.priceRange),
    },
    standardDeviationPercent: {
      min: Math.min(prev.standardDeviationPercent.min, currentStats.standardDeviationPercent),
      max: Math.max(prev.standardDeviationPercent.max, currentStats.standardDeviationPercent),
    },
    variance: {
      min: Math.min(prev.variance.min, currentStats.variance),
      max: Math.max(prev.variance.max, currentStats.variance),
    },
  }));
};
