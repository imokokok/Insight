'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { ChainDataRequest } from '@/lib/oracles/bandProtocol';
import { DashboardCard } from '../common/DashboardCard';
import { chainColors, chartColors, baseColors, animationColors } from '@/lib/config/colors';

type TimeRangeKey = '24h' | '7d' | '30d';

interface ChainComparisonProps {
  chains: ChainDataRequest[];
  selectedChains?: ChainDataRequest[];
  onSelectionChange?: (chains: ChainDataRequest[]) => void;
}

interface ExtendedChainData extends ChainDataRequest {
  avgResponseTime: number;
  reliability: number;
}

const getTimeRangeConfig = (
  t: (key: string) => string
): Record<TimeRangeKey, { label: string; field: keyof ChainDataRequest }> => ({
  '24h': { label: t('chainComparison.timeRange.24h'), field: 'requestCount24h' },
  '7d': { label: t('chainComparison.timeRange.7d'), field: 'requestCount7d' },
  '30d': { label: t('chainComparison.timeRange.30d'), field: 'requestCount30d' },
});

const CHAIN_COLORS: Record<string, string> = {
  'Cosmos Hub': chainColors.cosmosHub,
  Osmosis: chainColors.osmosis,
  Ethereum: chainColors.ethereum,
  Polygon: chainColors.polygon,
  Avalanche: chainColors.avalanche,
  Fantom: chainColors.fantom,
  Cronos: chainColors.cronos,
  Juno: chainColors.juno,
};

const DEFAULT_COLORS = chartColors.sequence;

const MAX_SELECTION = 5;

function getChainColor(chainName: string, index: number): string {
  return CHAIN_COLORS[chainName] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function generateExtendedData(chain: ChainDataRequest, index: number): ExtendedChainData {
  return {
    ...chain,
    avgResponseTime: Math.round(80 + Math.random() * 120 + index * 15),
    reliability: Number((98.5 + Math.random() * 1.5).toFixed(2)),
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    payload: { name: string; value: number; color: string; chainName: string };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200  p-3 ">
      <p className="text-gray-600 text-xs mb-1 font-medium">{data.name}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 " style={{ backgroundColor: data.color }} />
        <span className="text-gray-900 font-mono font-semibold">{data.value.toLocaleString()}</span>
      </div>
    </div>
  );
}

interface GasTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: { name: string; gasCost: number; color: string };
  }>;
}

function GasTooltip({ active, payload }: GasTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200  p-3 ">
      <p className="text-gray-600 text-xs mb-1 font-medium">{data.name}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 " style={{ backgroundColor: data.color }} />
        <span className="text-gray-900 font-mono font-semibold">
          {data.gasCost.toFixed(6)} BAND
        </span>
      </div>
    </div>
  );
}

interface ResponseTimeTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: { name: string; responseTime: number; color: string };
  }>;
}

function ResponseTimeTooltip({ active, payload }: ResponseTimeTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200  p-3 ">
      <p className="text-gray-600 text-xs mb-1 font-medium">{data.name}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 " style={{ backgroundColor: data.color }} />
        <span className="text-gray-900 font-mono font-semibold">{data.responseTime}ms</span>
      </div>
    </div>
  );
}

export function ChainComparison({
  chains,
  selectedChains: externalSelectedChains,
  onSelectionChange,
}: ChainComparisonProps) {
  const t = useTranslations();
  const TIME_RANGE_CONFIG = useMemo(() => getTimeRangeConfig(t), [t]);
  const [internalSelectedChains, setInternalSelectedChains] = useState<ChainDataRequest[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('24h');

  const selectedChains = externalSelectedChains ?? internalSelectedChains;

  const handleSelectionChange = useCallback(
    (newSelection: ChainDataRequest[]) => {
      if (onSelectionChange) {
        onSelectionChange(newSelection);
      } else {
        setInternalSelectedChains(newSelection);
      }
    },
    [onSelectionChange]
  );

  const toggleChain = useCallback(
    (chain: ChainDataRequest) => {
      const isSelected = selectedChains.some((c) => c.chainId === chain.chainId);
      if (isSelected) {
        handleSelectionChange(selectedChains.filter((c) => c.chainId !== chain.chainId));
      } else if (selectedChains.length < MAX_SELECTION) {
        handleSelectionChange([...selectedChains, chain]);
      }
    },
    [selectedChains, handleSelectionChange]
  );

  const selectAll = useCallback(() => {
    handleSelectionChange(chains.slice(0, MAX_SELECTION));
  }, [chains, handleSelectionChange]);

  const clearSelection = useCallback(() => {
    handleSelectionChange([]);
  }, [handleSelectionChange]);

  const extendedSelectedChains = useMemo<ExtendedChainData[]>(
    () => selectedChains.map((chain, index) => generateExtendedData(chain, index)),
    [selectedChains]
  );

  const requestChartData = useMemo(
    () =>
      extendedSelectedChains.map((chain, index) => ({
        name: chain.chainName,
        value: chain[TIME_RANGE_CONFIG[timeRange].field] as number,
        color: getChainColor(chain.chainName, index),
        chainName: chain.chainName,
      })),
    [extendedSelectedChains, timeRange, TIME_RANGE_CONFIG]
  );

  const gasChartData = useMemo(
    () =>
      extendedSelectedChains.map((chain, index) => ({
        name: chain.chainName,
        gasCost: chain.avgGasCost,
        color: getChainColor(chain.chainName, index),
      })),
    [extendedSelectedChains]
  );

  const responseTimeChartData = useMemo(
    () =>
      extendedSelectedChains.map((chain, index) => ({
        name: chain.chainName,
        responseTime: chain.avgResponseTime,
        color: getChainColor(chain.chainName, index),
      })),
    [extendedSelectedChains]
  );

  const tokenCountChartData = useMemo(
    () =>
      extendedSelectedChains.map((chain, index) => ({
        name: chain.chainName,
        tokenCount: chain.supportedSymbols.length,
        color: getChainColor(chain.chainName, index),
      })),
    [extendedSelectedChains]
  );

  const radarData = useMemo(() => {
    if (extendedSelectedChains.length === 0) return [];

    const maxRequests = Math.max(...extendedSelectedChains.map((c) => c.requestCount24h));
    const minGas = Math.min(...extendedSelectedChains.map((c) => c.avgGasCost));
    const maxGas = Math.max(...extendedSelectedChains.map((c) => c.avgGasCost));
    const maxTokens = Math.max(...extendedSelectedChains.map((c) => c.supportedSymbols.length));
    const minResponse = Math.min(...extendedSelectedChains.map((c) => c.avgResponseTime));
    const maxResponse = Math.max(...extendedSelectedChains.map((c) => c.avgResponseTime));

    return [
      {
        metric: t('chainComparison.metrics.requestVolume'),
        ...extendedSelectedChains.reduce(
          (acc, c) => {
            acc[c.chainName] = (c.requestCount24h / maxRequests) * 100;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      {
        metric: t('chainComparison.metrics.gasEfficiency'),
        ...extendedSelectedChains.reduce(
          (acc, c) => {
            const gasScore =
              maxGas > minGas ? ((maxGas - c.avgGasCost) / (maxGas - minGas)) * 100 : 50;
            acc[c.chainName] = gasScore;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      {
        metric: t('chainComparison.metrics.tokenSupport'),
        ...extendedSelectedChains.reduce(
          (acc, c) => {
            acc[c.chainName] = (c.supportedSymbols.length / maxTokens) * 100;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      {
        metric: t('chainComparison.metrics.responseSpeed'),
        ...extendedSelectedChains.reduce(
          (acc, c) => {
            const responseScore =
              maxResponse > minResponse
                ? ((maxResponse - c.avgResponseTime) / (maxResponse - minResponse)) * 100
                : 50;
            acc[c.chainName] = responseScore;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      {
        metric: t('chainComparison.metrics.reliability'),
        ...extendedSelectedChains.reduce(
          (acc, c) => {
            acc[c.chainName] = c.reliability;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    ];
  }, [extendedSelectedChains, t]);

  const exportToCSV = useCallback(() => {
    if (extendedSelectedChains.length === 0) return;

    const headers = [
      t('chainComparison.csv.chainName'),
      'Chain ID',
      t('chainComparison.csv.24hRequests'),
      t('chainComparison.csv.7dRequests'),
      t('chainComparison.csv.30dRequests'),
      t('chainComparison.csv.avgGasCost'),
      t('chainComparison.csv.tokenCount'),
      t('chainComparison.csv.supportedTokens'),
      t('chainComparison.csv.avgResponseTime'),
      t('chainComparison.csv.reliability'),
    ];

    const rows = extendedSelectedChains.map((chain) => [
      chain.chainName,
      chain.chainId,
      chain.requestCount24h,
      chain.requestCount7d,
      chain.requestCount30d,
      chain.avgGasCost.toFixed(6),
      chain.supportedSymbols.length,
      chain.supportedSymbols.join(';'),
      chain.avgResponseTime,
      chain.reliability,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n') + '\n';

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `chain-comparison-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [extendedSelectedChains, t]);

  const comparisonStats = useMemo(() => {
    if (extendedSelectedChains.length === 0) return null;

    const totalRequests = extendedSelectedChains.reduce((sum, c) => {
      const value = c[TIME_RANGE_CONFIG[timeRange].field];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
    const avgGas =
      extendedSelectedChains.reduce((sum, c) => sum + c.avgGasCost, 0) /
      extendedSelectedChains.length;
    const totalTokens = new Set(extendedSelectedChains.flatMap((c) => c.supportedSymbols)).size;
    const avgResponseTime =
      extendedSelectedChains.reduce((sum, c) => sum + c.avgResponseTime, 0) /
      extendedSelectedChains.length;

    return {
      totalRequests,
      avgGas,
      totalTokens,
      avgResponseTime: Math.round(avgResponseTime),
    };
  }, [extendedSelectedChains, timeRange, TIME_RANGE_CONFIG]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t('chainComparison.title')}</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {t('chainComparison.selectUpTo', { max: MAX_SELECTION })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            disabled={selectedChains.length >= MAX_SELECTION}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100  hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('chainComparison.selectAll')}
          </button>
          <button
            onClick={clearSelection}
            disabled={selectedChains.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100  hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('chainComparison.clear')}
          </button>
          <button
            onClick={exportToCSV}
            disabled={selectedChains.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500  hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {t('chainComparison.exportCSV')}
          </button>
        </div>
      </div>

      <DashboardCard title={t('chainComparison.selectChains')}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {chains.map((chain, index) => {
            const isSelected = selectedChains.some((c) => c.chainId === chain.chainId);
            const isDisabled = !isSelected && selectedChains.length >= MAX_SELECTION;

            return (
              <label
                key={chain.chainId}
                className={`relative flex items-center gap-3 p-3  border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : isDisabled
                      ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggleChain(chain)}
                  className="sr-only"
                />
                <div
                  className="w-3 h-3  flex-shrink-0"
                  style={{ backgroundColor: getChainColor(chain.chainName, index) }}
                />
                <span
                  className={`text-sm font-medium truncate ${
                    isSelected ? 'text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {chain.chainName}
                </span>
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-blue-500 absolute top-1.5 right-1.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </label>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            {t('chainComparison.selectedCount', {
              selected: selectedChains.length,
              max: MAX_SELECTION,
            })}
          </span>
          {selectedChains.length >= MAX_SELECTION && (
            <span className="text-amber-600">{t('chainComparison.maxReached')}</span>
          )}
        </div>
      </DashboardCard>

      {selectedChains.length === 0 ? (
        <div className="bg-white border border-gray-200  p-12 text-center">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-gray-500 text-sm">{t('chainComparison.pleaseSelect')}</p>
        </div>
      ) : (
        <>
          {comparisonStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-100 border border-gray-200  p-4">
                <p className="text-xs text-gray-600 mb-1">
                  {t('chainComparison.totalRequests')} ({TIME_RANGE_CONFIG[timeRange].label})
                </p>
                <p className="text-xl font-bold text-blue-700">
                  {formatNumber(comparisonStats.totalRequests)}
                </p>
              </div>
              <div className="bg-gray-100 border border-gray-200  p-4">
                <p className="text-xs text-gray-600 mb-1">{t('chainComparison.avgGasCost')}</p>
                <p className="text-xl font-bold text-purple-700">
                  {comparisonStats.avgGas.toFixed(6)}
                </p>
              </div>
              <div className="bg-gray-100 border border-gray-200  p-4">
                <p className="text-xs text-gray-600 mb-1">{t('chainComparison.totalTokens')}</p>
                <p className="text-xl font-bold text-green-700">{comparisonStats.totalTokens}</p>
              </div>
              <div className="bg-gray-100 border border-gray-200  p-4">
                <p className="text-xs text-gray-600 mb-1">{t('chainComparison.avgResponseTime')}</p>
                <p className="text-xl font-bold text-orange-700">
                  {comparisonStats.avgResponseTime}ms
                </p>
              </div>
            </div>
          )}

          <DashboardCard
            title={t('chainComparison.requestComparison')}
            headerAction={
              <div className="flex items-center gap-1 bg-gray-100  p-1">
                {(Object.keys(TIME_RANGE_CONFIG) as TimeRangeKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setTimeRange(key)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      timeRange === key
                        ? 'bg-white text-gray-900 '
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {TIME_RANGE_CONFIG[key].label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={requestChartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.recharts.grid}
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    tickLine={false}
                    axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    tickLine={false}
                    axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                    tickFormatter={(value) => formatNumber(value)}
                    width={50}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: animationColors.fade.cursor }}
                  />
                  <Bar dataKey="value">
                    {requestChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardCard title={t('chainComparison.gasCostComparison')}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={gasChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.recharts.grid}
                      strokeOpacity={0.5}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                      tickLine={false}
                      axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                      tickLine={false}
                      axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                      tickFormatter={(value) => value.toFixed(4)}
                      width={60}
                    />
                    <Tooltip
                      content={<GasTooltip />}
                      cursor={{ fill: animationColors.fade.cursor }}
                    />
                    <Bar dataKey="gasCost">
                      {gasChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>

            <DashboardCard title={t('chainComparison.responseTimeComparison')}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={responseTimeChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.recharts.grid}
                      strokeOpacity={0.5}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                      tickLine={false}
                      axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                      tickLine={false}
                      axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                      tickFormatter={(value) => `${value}ms`}
                      width={55}
                    />
                    <Tooltip
                      content={<ResponseTimeTooltip />}
                      cursor={{ fill: animationColors.fade.cursor }}
                    />
                    <Bar dataKey="responseTime">
                      {responseTimeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardCard title={t('chainComparison.tokenSupportComparison')}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tokenCountChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.recharts.grid}
                      strokeOpacity={0.5}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                      tickLine={false}
                      axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                      tickLine={false}
                      axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                      allowDecimals={false}
                      width={35}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${value} ${t('chainComparison.tokens')}`,
                        t('chainComparison.supportedTokens'),
                      ]}
                      cursor={{ fill: animationColors.fade.cursor }}
                    />
                    <Bar dataKey="tokenCount">
                      {tokenCountChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>

            <DashboardCard title={t('chainComparison.performanceRadar')}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={chartColors.recharts.grid} />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    {extendedSelectedChains.map((chain, index) => (
                      <Radar
                        key={chain.chainId}
                        name={chain.chainName}
                        dataKey={chain.chainName}
                        stroke={getChainColor(chain.chainName, index)}
                        fill={getChainColor(chain.chainName, index)}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" iconSize={8} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>
          </div>

          <DashboardCard title={t('chainComparison.comparisonTable')}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chainComparison.chainName')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chain ID
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chainComparison.24hRequests')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chainComparison.7dRequests')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chainComparison.30dRequests')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chainComparison.gasCost')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chainComparison.tokenCount')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chainComparison.responseTime')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chainComparison.reliability')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {extendedSelectedChains.map((chain, index) => (
                    <tr key={chain.chainId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 "
                            style={{ backgroundColor: getChainColor(chain.chainName, index) }}
                          />
                          <span className="font-medium text-gray-900">{chain.chainName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-sm">
                        {chain.chainId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900 font-mono">
                        {chain.requestCount24h.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900 font-mono">
                        {chain.requestCount7d.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900 font-mono">
                        {chain.requestCount30d.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900 font-mono">
                        {chain.avgGasCost.toFixed(6)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2 py-0.5  text-xs font-medium bg-blue-100 text-blue-800">
                          {chain.supportedSymbols.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900 font-mono">
                        {chain.avgResponseTime}ms
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-green-600 font-medium">{chain.reliability}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardCard>

          <DashboardCard title={t('chainComparison.supportedTokensDetail')}>
            <div className="space-y-4">
              {extendedSelectedChains.map((chain, index) => (
                <div
                  key={chain.chainId}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 "
                >
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <div
                      className="w-2.5 h-2.5 "
                      style={{ backgroundColor: getChainColor(chain.chainName, index) }}
                    />
                    <span className="font-medium text-gray-900">{chain.chainName}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {chain.supportedSymbols.map((symbol) => (
                      <span
                        key={symbol}
                        className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded"
                      >
                        {symbol}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </>
      )}
    </div>
  );
}

export type { ChainComparisonProps, ExtendedChainData };
