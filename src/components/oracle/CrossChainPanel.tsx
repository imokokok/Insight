'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BandProtocolClient, CrossChainStats, ChainDataRequest } from '@/lib/oracles/bandProtocol';
import { RequestTrendChart } from './RequestTrendChart';
import { ChainComparison } from './ChainComparison';

type TimeRangeKey = '24h' | '7d' | '30d';

interface CrossChainPanelProps {
  client: BandProtocolClient;
  autoUpdate?: boolean;
  updateInterval?: number;
}

const TIME_RANGE_CONFIG: Record<TimeRangeKey, { label: string; field: keyof ChainDataRequest }> = {
  '24h': { label: '24小时', field: 'requestCount24h' },
  '7d': { label: '7天', field: 'requestCount7d' },
  '30d': { label: '30天', field: 'requestCount30d' },
};

const CHAIN_COLORS: Record<string, string> = {
  'Cosmos Hub': '#2E3359',
  Osmosis: '#9945FF',
  Ethereum: '#627EEA',
  Polygon: '#8247E5',
  Avalanche: '#E84142',
  Fantom: '#1969FF',
  Cronos: '#002D74',
  Juno: '#5B6EE1',
};

const DEFAULT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

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

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  suffix?: string;
}

function StatCard({ title, value, icon, trend, suffix }: StatCardProps) {
  const trendColor = trend
    ? trend > 0
      ? 'text-green-600'
      : trend < 0
        ? 'text-red-600'
        : 'text-gray-500'
    : '';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-gray-900 text-xl font-bold">{formatNumber(value)}</span>
            {suffix && <span className="text-gray-500 text-sm">{suffix}</span>}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
              <span>{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>
              <span>
                {trend > 0 ? '+' : ''}
                {trend.toFixed(1)}%
              </span>
              <span className="text-gray-400 ml-1">vs 上周</span>
            </div>
          )}
        </div>
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    payload: { name: string; value: number; color: string };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
      <p className="text-gray-600 text-xs mb-1 font-medium">{data.name}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="text-gray-900 font-mono font-semibold">
          {data.value.toLocaleString()} 请求
        </span>
      </div>
    </div>
  );
}

interface ChainDetailModalProps {
  chain: ChainDataRequest | null;
  onClose: () => void;
}

function ChainDetailModal({ chain, onClose }: ChainDetailModalProps) {
  if (!chain) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getChainColor(chain.chainName, 0) }}
            />
            <h2 className="text-lg font-bold text-gray-900">{chain.chainName}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Chain ID</p>
            <p className="text-gray-900 font-mono">{chain.chainId}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">24小时</p>
              <p className="text-blue-600 font-bold text-lg">
                {chain.requestCount24h.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">7天</p>
              <p className="text-green-600 font-bold text-lg">
                {chain.requestCount7d.toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">30天</p>
              <p className="text-purple-600 font-bold text-lg">
                {chain.requestCount30d.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="text-gray-500 text-sm">平均 Gas 成本</span>
              </div>
              <span className="text-gray-900 font-mono font-semibold">
                {chain.avgGasCost.toFixed(6)} BAND
              </span>
            </div>
          </div>

          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">支持的代币</p>
            <div className="flex flex-wrap gap-2">
              {chain.supportedSymbols.map((symbol) => (
                <span
                  key={symbol}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg"
                >
                  {symbol}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">日均请求量</span>
              <span className="text-gray-900 font-medium">
                {Math.round(chain.requestCount7d / 7).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">月均请求量</span>
              <span className="text-gray-900 font-medium">
                {Math.round(chain.requestCount30d / 30).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CrossChainPanel({
  client,
  autoUpdate = true,
  updateInterval = 60000,
}: CrossChainPanelProps) {
  const [stats, setStats] = useState<CrossChainStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('24h');
  const [selectedChain, setSelectedChain] = useState<ChainDataRequest | null>(null);
  const [selectedChainsForComparison, setSelectedChainsForComparison] = useState<
    ChainDataRequest[]
  >([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const data = await client.getCrossChainStats();
      if (!abortController.signal.aborted) {
        setStats(data);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '获取跨链数据失败');
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [client]);

  useEffect(() => {
    fetchData();

    let interval: NodeJS.Timeout | null = null;
    if (autoUpdate) {
      interval = setInterval(fetchData, updateInterval);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchData, autoUpdate, updateInterval]);

  const chartData =
    stats?.chains.map((chain, index) => ({
      name: chain.chainName,
      value: chain[TIME_RANGE_CONFIG[timeRange].field] as number,
      color: getChainColor(chain.chainName, index),
    })) || [];

  const totalRequests = stats
    ? (stats[
        `totalRequests${timeRange === '24h' ? '24h' : timeRange === '7d' ? '7d' : '30d'}` as keyof CrossChainStats
      ] as number)
    : 0;

  const toggleChainSelection = useCallback((chain: ChainDataRequest, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedChainsForComparison((prev) => {
      const isSelected = prev.some((c) => c.chainId === chain.chainId);
      if (isSelected) {
        return prev.filter((c) => c.chainId !== chain.chainId);
      } else if (prev.length < 5) {
        return [...prev, chain];
      }
      return prev;
    });
  }, []);

  if (loading && !stats) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">加载跨链数据...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-12 h-12 text-red-400 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-gray-500 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">跨链数据请求统计</h2>
          <p className="text-gray-500 text-sm mt-0.5">Band Protocol 跨链数据请求分布</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          {(Object.keys(TIME_RANGE_CONFIG) as TimeRangeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {TIME_RANGE_CONFIG[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="24小时请求总量"
          value={stats?.totalRequests24h || 0}
          trend={5.2}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
        />
        <StatCard
          title="7天请求总量"
          value={stats?.totalRequests7d || 0}
          trend={3.8}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
        <StatCard
          title="30天请求总量"
          value={stats?.totalRequests30d || 0}
          trend={8.5}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          }
        />
      </div>

      <RequestTrendChart client={client} autoUpdate={autoUpdate} updateInterval={updateInterval} />

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-900 text-sm font-semibold">各链请求量分布</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {TIME_RANGE_CONFIG[timeRange].label}总请求: {totalRequests.toLocaleString()}
            </p>
          </div>
          <div className="text-xs text-gray-400">点击柱状图查看详情</div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                strokeOpacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb', strokeOpacity: 0.5 }}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb', strokeOpacity: 0.5 }}
                tickFormatter={(value) => formatNumber(value)}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                onClick={(data) => {
                  const chain = stats?.chains.find((c) => c.chainName === data.name);
                  if (chain) setSelectedChain(chain);
                }}
                className="cursor-pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-900 text-sm font-semibold">各链概览</p>
          <p className="text-xs text-gray-500">
            已选择 {selectedChainsForComparison.length}/5 条链进行对比
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats?.chains.map((chain, index) => {
            const isSelected = selectedChainsForComparison.some((c) => c.chainId === chain.chainId);
            const isDisabled = !isSelected && selectedChainsForComparison.length >= 5;

            return (
              <div
                key={chain.chainId}
                onClick={() => setSelectedChain(chain)}
                className={`bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer group relative ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                } ${isDisabled ? 'opacity-60' : ''}`}
              >
                <div className="absolute top-2 right-2">
                  <label
                    className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500 border-blue-500'
                        : isDisabled
                          ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
                          : 'border-gray-300 hover:border-blue-400'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={(e) =>
                        toggleChainSelection(chain, e as unknown as React.MouseEvent)
                      }
                      className="sr-only"
                    />
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </label>
                </div>
                <div className="flex items-center gap-2 mb-2 pr-6">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getChainColor(chain.chainName, index) }}
                  />
                  <span className="text-gray-900 font-medium text-sm">{chain.chainName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Gas:</span>
                  <span className="text-gray-700 font-mono">{chain.avgGasCost.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">代币:</span>
                  <span className="text-gray-700">
                    {chain.supportedSymbols.slice(0, 3).join(', ')}
                    {chain.supportedSymbols.length > 3 ? '...' : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">请求:</span>
                  <span className="text-gray-700 font-medium">
                    {chain[
                      TIME_RANGE_CONFIG[timeRange].field as keyof ChainDataRequest
                    ].toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedChain && (
        <ChainDetailModal chain={selectedChain} onClose={() => setSelectedChain(null)} />
      )}

      {stats && (
        <ChainComparison
          chains={stats.chains}
          selectedChains={selectedChainsForComparison}
          onSelectionChange={setSelectedChainsForComparison}
        />
      )}
    </div>
  );
}

export type { CrossChainPanelProps, ChainDataRequest, CrossChainStats };
