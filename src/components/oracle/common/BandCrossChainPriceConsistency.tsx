'use client';

import { useMemo, useState, useEffect } from 'react';
import { getDeviationColor as getDeviationColorUtil } from '@/lib/utils/chartSharedUtils';
import { BandProtocolClient, CrossChainPriceComparison } from '@/lib/oracles/bandProtocol';
import { semanticColors, chainColors } from '@/lib/config/colors';
import { useTranslations } from 'next-intl';

export interface BandChainPriceData {
  chain: string;
  chainId: string;
  price: number;
  deviationPercent: number;
  deviationDirection: 'up' | 'down' | 'neutral';
  latency: number;
  lastUpdate: string;
  status: 'normal' | 'warning' | 'critical';
  updateCount: number;
  confidence: number;
}

export interface BandCrossChainPriceConsistencyProps {
  className?: string;
}

const BAND_SUPPORTED_CHAINS = [
  { name: 'Cosmos Hub', chainId: 'cosmoshub-4', icon: '⚛️', color: chainColors.cosmosHub },
  { name: 'Osmosis', chainId: 'osmosis-1', icon: '💧', color: chainColors.osmosis },
  { name: 'Ethereum', chainId: '1', icon: '⟠', color: chainColors.ethereum },
  { name: 'Polygon', chainId: '137', icon: '⬡', color: chainColors.polygon },
  { name: 'Avalanche', chainId: '43114', icon: '🔺', color: chainColors.avalanche },
  { name: 'Fantom', chainId: '250', icon: '👻', color: chainColors.fantom },
];

const SYMBOLS = ['BTC/USD', 'ETH/USD', 'USDC/USD'];

const DEVIATION_THRESHOLDS = {
  normal: 0.1,
  warning: 0.5,
};

const STATUS_COLORS = {
  consistent: semanticColors.success.dark,
  warning: semanticColors.warning.dark,
  inconsistent: semanticColors.danger.dark,
};

function generateMockPriceData(): Map<string, BandChainPriceData[]> {
  const basePrices: Record<string, number> = {
    'BTC/USD': 67842.35,
    'ETH/USD': 3456.78,
    'USDC/USD': 1.0001,
  };

  const priceDataMap = new Map<string, BandChainPriceData[]>();

  SYMBOLS.forEach((symbol) => {
    const basePrice = basePrices[symbol] || 100.0;
    const chainData: BandChainPriceData[] = BAND_SUPPORTED_CHAINS.map((chain, index) => {
      const deviationFactor = index === 0 ? 0 : (Math.random() - 0.5) * 0.8;
      const price = basePrice * (1 + deviationFactor / 100);
      const deviationPercent = index === 0 ? 0 : deviationFactor;
      const latency = Math.floor(Math.random() * 100 + 50);

      let status: 'normal' | 'warning' | 'critical' = 'normal';
      const absDeviation = Math.abs(deviationPercent);
      if (absDeviation >= DEVIATION_THRESHOLDS.warning) {
        status = 'critical';
      } else if (absDeviation >= DEVIATION_THRESHOLDS.normal) {
        status = 'warning';
      }

      return {
        chain: chain.name,
        chainId: chain.chainId,
        price: Number(price.toFixed(4)),
        deviationPercent: Number(deviationPercent.toFixed(4)),
        deviationDirection: deviationPercent > 0 ? 'up' : deviationPercent < 0 ? 'down' : 'neutral',
        latency,
        lastUpdate: `${Math.floor(Math.random() * 5 + 1)}s ago`,
        status,
        updateCount: Math.floor(Math.random() * 30 + 50),
        confidence: Math.floor(Math.random() * 5 + 95),
      };
    });
    priceDataMap.set(symbol, chainData);
  });

  return priceDataMap;
}

function generateComparisonData(
  currentData: BandChainPriceData[],
  historicalTimestamp: number
): CrossChainPriceComparison[] {
  return currentData.map((chain) => {
    const timeFactor = (Date.now() - historicalTimestamp) / (1000 * 60 * 60 * 24 * 30);
    const volatility = 0.02 * Math.max(0, Math.min(1, timeFactor));
    const randomChange = (Math.random() - 0.5) * 2 * volatility;

    const historicalPrice = chain.price * (1 - randomChange);
    const priceChange = chain.price - historicalPrice;
    const priceChangePercent = (priceChange / historicalPrice) * 100;

    const historicalDeviation = chain.deviationPercent * (1 + (Math.random() - 0.5) * 0.3);
    const deviationChange = chain.deviationPercent - historicalDeviation;

    const historicalLatency = Math.max(30, chain.latency + Math.floor((Math.random() - 0.5) * 40));
    const latencyChange = chain.latency - historicalLatency;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (priceChangePercent > 0.5) {
      trend = 'up';
    } else if (priceChangePercent < -0.5) {
      trend = 'down';
    }

    return {
      chain: chain.chain,
      chainId: chain.chainId,
      currentPrice: chain.price,
      historicalPrice: Number(historicalPrice.toFixed(4)),
      priceChange: Number(priceChange.toFixed(4)),
      priceChangePercent: Number(priceChangePercent.toFixed(2)),
      currentDeviation: chain.deviationPercent,
      historicalDeviation: Number(historicalDeviation.toFixed(4)),
      deviationChange: Number(deviationChange.toFixed(4)),
      currentLatency: chain.latency,
      historicalLatency,
      latencyChange,
      trend,
    };
  });
}

function getDeviationColor(deviation: number): string {
  const color = getDeviationColorUtil(deviation);
  if (color === semanticColors.success.DEFAULT) return 'text-green-600';
  if (color === semanticColors.warning.DEFAULT) return 'text-yellow-600';
  return 'text-red-600';
}

function getChainInfo(chainName: string) {
  return BAND_SUPPORTED_CHAINS.find((c) => c.name === chainName);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

interface PriceDeviationHeatmapProps {
  priceDataMap: Map<string, BandChainPriceData[]>;
  selectedSymbol: string;
}

function PriceDeviationHeatmap({ priceDataMap, selectedSymbol }: PriceDeviationHeatmapProps) {
  const t = useTranslations();
  const symbols = SYMBOLS;
  const chains = BAND_SUPPORTED_CHAINS;

  const getDeviationIntensity = (deviation: number): { bg: string; text: string } => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation < 0.05) return { bg: 'bg-green-100', text: 'text-green-700' };
    if (absDeviation < 0.1) return { bg: 'bg-green-200', text: 'text-green-800' };
    if (absDeviation < 0.3) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    if (absDeviation < 0.5) return { bg: 'bg-yellow-200', text: 'text-yellow-800' };
    return { bg: 'bg-red-200', text: 'text-red-800' };
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('bandCrossChainPriceConsistency.priceDeviationHeatmap')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {t('bandCrossChainPriceConsistency.heatmapSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{t('bandCrossChainPriceConsistency.low')}</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <div className="w-4 h-4 bg-green-200 rounded"></div>
            <div className="w-4 h-4 bg-yellow-100 rounded"></div>
            <div className="w-4 h-4 bg-yellow-200 rounded"></div>
            <div className="w-4 h-4 bg-red-200 rounded"></div>
          </div>
          <span>{t('bandCrossChainPriceConsistency.high')}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 w-24">
                {t('bandCrossChainPriceConsistency.token')}
              </th>
              {chains.map((chain) => (
                <th
                  key={chain.chainId}
                  className="text-center py-2 px-2 text-xs font-medium text-gray-500 min-w-[80px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-base">{chain.icon}</span>
                    <span className="text-[10px] truncate">{chain.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol) => {
              const chainData = priceDataMap.get(symbol) || [];
              const isSelected = symbol === selectedSymbol;
              return (
                <tr
                  key={symbol}
                  className={`border-t border-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-3 px-3">
                    <span
                      className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}
                    >
                      {symbol}
                    </span>
                  </td>
                  {chainData.map((data, index) => {
                    const intensity = getDeviationIntensity(data.deviationPercent);
                    return (
                      <td key={data.chainId} className="py-3 px-2 text-center">
                        <div
                          className={`group relative inline-flex items-center justify-center w-14 h-10  ${intensity.bg} cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all`}
                        >
                          <span className={`text-xs font-mono font-medium ${intensity.text}`}>
                            {index === 0
                              ? '-'
                              : `${data.deviationPercent >= 0 ? '+' : ''}${data.deviationPercent.toFixed(2)}%`}
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                            {data.chain}: ${data.price.toFixed(4)}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface HistoricalComparisonViewProps {
  comparisonData: CrossChainPriceComparison[];
  selectedSymbol: string;
  historicalDate: Date;
}

function HistoricalComparisonView({
  comparisonData,
  selectedSymbol,
  historicalDate,
}: HistoricalComparisonViewProps) {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  const getChangeColor = (change: number, isImprovement: boolean = true): string => {
    if (Math.abs(change) < 0.01) return 'text-gray-500';
    if (isImprovement) {
      return change > 0 ? 'text-green-600' : 'text-red-600';
    }
    return change > 0 ? 'text-red-600' : 'text-green-600';
  };

  const getDeviationChangeColor = (current: number, historical: number): string => {
    const change = current - historical;
    if (Math.abs(change) < 0.01) return 'text-gray-500';
    return change < 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-100 border border-gray-200 border border-blue-200  p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100  flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">历史对比视图</h4>
              <p className="text-xs text-gray-500">
                对比时间:{' '}
                {historicalDate.toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">交易对</span>
            <p className="text-sm font-medium text-gray-900">{selectedSymbol}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {comparisonData.map((comparison) => {
          const chainInfo = getChainInfo(comparison.chain);
          const isBase = comparison.chain === 'Cosmos Hub';

          return (
            <div
              key={comparison.chainId}
              className={`bg-white border  p-4 ${isBase ? 'border-purple-300 ring-1 ring-purple-100' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{chainInfo?.icon}</span>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{comparison.chain}</span>
                    {isBase && (
                      <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                        基准
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-lg font-bold ${
                      comparison.trend === 'up'
                        ? 'text-green-600'
                        : comparison.trend === 'down'
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {getTrendIcon(comparison.trend)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="bg-gray-50  p-3">
                    <p className="text-xs text-gray-500 mb-1">历史价格</p>
                    <p className="text-sm font-mono font-medium text-gray-700">
                      ${comparison.historicalPrice.toFixed(4)}
                    </p>
                  </div>
                  <div className="bg-gray-50  p-3">
                    <p className="text-xs text-gray-500 mb-1">历史偏离</p>
                    <p className="text-sm font-mono font-medium text-gray-700">
                      {isBase
                        ? '-'
                        : `${comparison.historicalDeviation >= 0 ? '+' : ''}${comparison.historicalDeviation.toFixed(3)}%`}
                    </p>
                  </div>
                  <div className="bg-gray-50  p-3">
                    <p className="text-xs text-gray-500 mb-1">历史延迟</p>
                    <p className="text-sm font-mono font-medium text-gray-700">
                      {comparison.historicalLatency}ms
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-blue-50  p-3">
                    <p className="text-xs text-blue-600 mb-1">当前价格</p>
                    <p className="text-sm font-mono font-bold text-blue-700">
                      ${comparison.currentPrice.toFixed(4)}
                    </p>
                    <p
                      className={`text-xs mt-1 ${getChangeColor(comparison.priceChangePercent, false)}`}
                    >
                      {comparison.priceChangePercent >= 0 ? '+' : ''}
                      {comparison.priceChangePercent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-blue-50  p-3">
                    <p className="text-xs text-blue-600 mb-1">当前偏离</p>
                    <p className="text-sm font-mono font-bold text-blue-700">
                      {isBase
                        ? '-'
                        : `${comparison.currentDeviation >= 0 ? '+' : ''}${comparison.currentDeviation.toFixed(3)}%`}
                    </p>
                    {!isBase && (
                      <p
                        className={`text-xs mt-1 ${getDeviationChangeColor(comparison.currentDeviation, comparison.historicalDeviation)}`}
                      >
                        {comparison.deviationChange >= 0 ? '+' : ''}
                        {comparison.deviationChange.toFixed(3)}%
                      </p>
                    )}
                  </div>
                  <div className="bg-blue-50  p-3">
                    <p className="text-xs text-blue-600 mb-1">当前延迟</p>
                    <p className="text-sm font-mono font-bold text-blue-700">
                      {comparison.currentLatency}ms
                    </p>
                    <p className={`text-xs mt-1 ${getChangeColor(-comparison.latencyChange)}`}>
                      {comparison.latencyChange >= 0 ? '+' : ''}
                      {comparison.latencyChange}ms
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">价格变化</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 w-24 bg-gray-200  h-1.5 overflow-hidden">
                      <div
                        className={`h-full  transition-all ${
                          Math.abs(comparison.priceChangePercent) < 1
                            ? 'bg-green-500'
                            : Math.abs(comparison.priceChangePercent) < 3
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min(Math.abs(comparison.priceChangePercent) * 10, 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`font-medium ${getChangeColor(comparison.priceChangePercent, false)}`}
                    >
                      {comparison.priceChangePercent >= 0 ? '+' : ''}
                      {comparison.priceChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 border border-gray-200  p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">变化趋势汇总</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {comparisonData.filter((c) => c.trend === 'up').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">价格上涨</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {comparisonData.filter((c) => c.trend === 'stable').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">价格稳定</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {comparisonData.filter((c) => c.trend === 'down').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">价格下跌</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BandCrossChainPriceConsistency({
  className = '',
}: BandCrossChainPriceConsistencyProps) {
  const t = useTranslations();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USD');
  const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [comparisonData, setComparisonData] = useState<CrossChainPriceComparison[] | null>(null);

  const priceDataMap = useMemo(() => generateMockPriceData(), []);
  const chainData = priceDataMap.get(selectedSymbol) || [];

  const client = useMemo(() => new BandProtocolClient(), []);
  const availableDates = useMemo(() => client.getAvailableSnapshotDates(), [client]);

  const baseChain = chainData[0];
  const basePrice = baseChain?.price || 0;

  const maxDeviation = Math.max(...chainData.map((c) => Math.abs(c.deviationPercent)));
  const avgLatency = Math.round(
    chainData.reduce((sum, c) => sum + c.latency, 0) / chainData.length
  );
  const hasWarnings = chainData.some((c) => c.status !== 'normal');

  useEffect(() => {
    if (isComparisonMode) {
      const date = new Date(`${selectedDate}T${selectedTime}`);
      const data = generateComparisonData(chainData, date.getTime());
      setComparisonData(data);
    } else {
      setComparisonData(null);
    }
  }, [isComparisonMode, selectedDate, selectedTime, chainData]);

  const maxDate = formatDate(new Date());
  const minDate = formatDate(availableDates[availableDates.length - 1]);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white border border-gray-200  p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('bandCrossChainPriceConsistency.title')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('bandCrossChainPriceConsistency.subtitle')}</p>
              </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100  p-1">
              {SYMBOLS.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    selectedSymbol === symbol
                      ? 'bg-white text-gray-900 '
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isComparisonMode}
                  onChange={(e) => setIsComparisonMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t('bandCrossChainPriceConsistency.compareHistory')}</span>
              </label>
            </div>
          </div>
        </div>

        {isComparisonMode && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 whitespace-nowrap">{t('bandCrossChainPriceConsistency.selectDate')}:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  className="px-3 py-1.5 text-sm border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 whitespace-nowrap">{t('bandCrossChainPriceConsistency.selectTime')}:</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <span className="text-xs text-blue-600">{t('bandCrossChainPriceConsistency.dateRange')}</span>
            </div>
          </div>
        )}

        {hasWarnings && !isComparisonMode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">{t('bandCrossChainPriceConsistency.warningTitle')}</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {t('bandCrossChainPriceConsistency.warningDesc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {isComparisonMode && comparisonData ? (
          <HistoricalComparisonView
            comparisonData={comparisonData}
            selectedSymbol={selectedSymbol}
            historicalDate={new Date(`${selectedDate}T${selectedTime}`)}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-purple-50 rounded p-3 text-center">
                <p className="text-xs text-purple-600 mb-1">{t('bandCrossChainPriceConsistency.basePrice')}</p>
                <p className="text-lg font-bold text-purple-700">${basePrice.toFixed(2)}</p>
                <p className="text-xs text-purple-500 mt-1">Cosmos Hub</p>
              </div>
              <div className="bg-gray-50 rounded p-3 text-center">
                <p className="text-xs text-gray-600 mb-1">{t('bandCrossChainPriceConsistency.maxDeviation')}</p>
                <p className={`text-lg font-bold ${getDeviationColor(maxDeviation)}`}>
                  {maxDeviation.toFixed(3)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {maxDeviation < DEVIATION_THRESHOLDS.normal
                    ? t('bandCrossChainPriceConsistency.deviationStatus.good')
                    : maxDeviation < DEVIATION_THRESHOLDS.warning
                      ? t('bandCrossChainPriceConsistency.deviationStatus.slight')
                      : t('bandCrossChainPriceConsistency.deviationStatus.large')}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-3 text-center">
                <p className="text-xs text-gray-600 mb-1">{t('bandCrossChainPriceConsistency.avgLatency')}</p>
                <p className="text-lg font-bold text-gray-700">{avgLatency}ms</p>
                <p className="text-xs text-gray-500 mt-1">
                  {avgLatency < 100 ? t('bandCrossChainPriceConsistency.latencyStatus.timely') : t('bandCrossChainPriceConsistency.latencyStatus.normal')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('bandCrossChainPriceConsistency.chain')}</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">{t('bandCrossChainPriceConsistency.price')}</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">{t('bandCrossChainPriceConsistency.deviation')}</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 w-32">
                      {t('bandCrossChainPriceConsistency.deviationVisualization')}
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">{t('bandCrossChainPriceConsistency.latency')}</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">
                      {t('bandCrossChainPriceConsistency.status.label')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chainData.map((chain, index) => {
                    const chainInfo = getChainInfo(chain.chain);
                    return (
                      <tr key={chain.chainId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{chainInfo?.icon}</span>
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {chain.chain}
                              </span>
                              {index === 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                  {t('bandCrossChainPriceConsistency.baseline')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-3 px-3">
                          <span className="text-sm font-mono text-gray-900">
                            ${chain.price.toFixed(4)}
                          </span>
                        </td>
                        <td className="text-right py-3 px-3">
                          <span
                            className={`text-sm font-mono font-medium ${getDeviationColor(chain.deviationPercent)}`}
                          >
                            {index === 0
                              ? '-'
                              : `${chain.deviationPercent >= 0 ? '+' : ''}${chain.deviationPercent.toFixed(3)}%`}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200  h-2 overflow-hidden">
                              <div
                                className={`h-full  transition-all ${
                                  Math.abs(chain.deviationPercent) < DEVIATION_THRESHOLDS.normal
                                    ? 'bg-green-500'
                                    : Math.abs(chain.deviationPercent) <
                                        DEVIATION_THRESHOLDS.warning
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                }`}
                                style={{
                                  width: `${Math.min((Math.abs(chain.deviationPercent) / 0.5) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8">
                              {Math.min(
                                Math.round((Math.abs(chain.deviationPercent) / 0.5) * 100),
                                100
                              )}
                              %
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-3">
                          <span
                            className={`text-sm ${chain.latency < 100 ? 'text-green-600' : 'text-gray-600'}`}
                          >
                            {chain.latency}ms
                          </span>
                        </td>
                        <td className="text-center py-3 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                              chain.status === 'normal'
                                ? 'bg-green-100 text-green-700'
                                : chain.status === 'warning'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {chain.status === 'normal'
                              ? t('bandCrossChainPriceConsistency.status.normal')
                              : chain.status === 'warning'
                                ? t('bandCrossChainPriceConsistency.status.warning')
                                : t('bandCrossChainPriceConsistency.status.critical')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {!isComparisonMode && (
        <PriceDeviationHeatmap priceDataMap={priceDataMap} selectedSymbol={selectedSymbol} />
      )}

      <div className="bg-purple-50 border border-purple-200 rounded p-5">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-purple-800">Band Protocol 跨链价格机制</h4>
            <ul className="text-sm text-purple-700 mt-2 space-y-1">
              <li>• Band Protocol 基于 Cosmos IBC 实现跨链数据传输</li>
              <li>• Cosmos Hub 作为主要数据源，通过 IBC 向其他链传输价格数据</li>
              <li>• 支持 EVM 链（Ethereum、Polygon 等）通过 Band Bridge 获取数据</li>
              <li>• 价格偏离阈值：&lt;0.1% 为正常，0.1%-0.5% 为警告，&gt;0.5% 需关注</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
