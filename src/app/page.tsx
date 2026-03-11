'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { useOraclePrices } from '@/hooks/useOraclePrices';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Types
interface OracleData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: string;
  updateFrequency: string;
  accuracy: number;
  color: string;
}

interface ActivityItem {
  id: string;
  time: string;
  oracle: string;
  price: string;
  chain: string;
  txHash: string;
}

// Oracle configuration
const oracleConfig: Record<string, { name: string; color: string }> = {
  LINK: { name: 'Chainlink', color: '#3B82F6' },
  BAND: { name: 'Band Protocol', color: '#10B981' },
  UMA: { name: 'UMA', color: '#F59E0B' },
  PYTH: { name: 'Pyth Network', color: '#8B5CF6' },
  API3: { name: 'API3', color: '#EC4899' },
};

// Generate deterministic random number
function getDeterministicValue(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return min + ((Math.abs(hash) % 1000) / 1000) * (max - min);
}

// Generate chart data
function generateChartData(points: number, baseValue: number, volatility: number) {
  const data = [];
  let currentValue = baseValue;
  const now = new Date();

  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    const change = (Math.random() - 0.5) * volatility;
    currentValue = Math.max(0, currentValue + change);
    data.push({
      time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      value: Number(currentValue.toFixed(2)),
      fullTime: time.toISOString(),
    });
  }
  return data;
}

// Status Indicator Component
function StatusIndicator() {
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-medium text-emerald-600">实时数据</span>
      </div>
      <div className="text-xs text-gray-500">更新于 {lastUpdate.toLocaleTimeString('zh-CN')}</div>
    </div>
  );
}

// Compact Hero Section - Light theme
function HeroSection({ t }: { t: (key: string) => string }) {
  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 border-b border-gray-200">
      <div className="px-8 py-12">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('home.hero.title') || '预言机数据仪表盘'}
            </h1>
            <p className="text-gray-600 max-w-2xl">
              {t('home.hero.description') ||
                '实时监控和分析 Chainlink、Band Protocol、UMA、Pyth Network、API3 等主流预言机协议的性能指标'}
            </p>
          </div>
          <StatusIndicator />
        </div>
      </div>
    </div>
  );
}

// Metric Card Component - Light theme
function MetricCard({
  title,
  value,
  change,
  changeType,
  chartData,
  color,
}: {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  chartData: { time: string; value: number }[];
  color: string;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const changeColor =
    changeType === 'positive'
      ? 'text-emerald-600'
      : changeType === 'negative'
        ? 'text-red-600'
        : 'text-gray-500';

  return (
    <div
      className={`bg-white rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-300 ${
        isUpdating ? 'ring-2 ring-blue-500/20' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p
            className={`text-2xl font-bold text-gray-900 transition-all duration-300 ${
              isUpdating ? 'text-blue-600' : ''
            }`}
          >
            {value}
          </p>
        </div>
        <span className={`text-sm font-medium ${changeColor}`}>{change}</span>
      </div>
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={`url(#gradient-${title})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Metrics Grid Section
function MetricsSection() {
  const metrics = [
    {
      title: '总数据源',
      value: '1,247',
      change: '+12',
      changeType: 'positive' as const,
      color: '#3B82F6',
      chartData: generateChartData(20, 1200, 50),
    },
    {
      title: '活跃预言机',
      value: '5',
      change: '稳定',
      changeType: 'neutral' as const,
      color: '#10B981',
      chartData: generateChartData(20, 5, 0.5),
    },
    {
      title: '24h 更新数',
      value: '2.4M',
      change: '+8.5%',
      changeType: 'positive' as const,
      color: '#8B5CF6',
      chartData: generateChartData(20, 2000000, 100000),
    },
    {
      title: '平均响应时间',
      value: '245ms',
      change: '-12ms',
      changeType: 'positive' as const,
      color: '#F59E0B',
      chartData: generateChartData(20, 250, 20),
    },
  ];

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>
    </div>
  );
}

// Oracle Performance Table - Light theme
function OracleTable({ prices }: { prices: Record<string, { price: number }> }) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof OracleData;
    direction: 'asc' | 'desc';
  } | null>(null);

  const oracleData: OracleData[] = useMemo(() => {
    return Object.entries(oracleConfig).map(([symbol, config]) => {
      const price = prices[symbol]?.price || getDeterministicValue(symbol, 1, 50);
      return {
        symbol,
        name: config.name,
        price,
        change24h: getDeterministicValue(symbol + 'change', -10, 10),
        marketCap: `$${(getDeterministicValue(symbol + 'mcap', 100, 10000) / 100).toFixed(1)}B`,
        updateFrequency: `${Math.floor(getDeterministicValue(symbol + 'freq', 1, 60))}s`,
        accuracy: getDeterministicValue(symbol + 'acc', 95, 99.9),
        color: config.color,
      };
    });
  }, [prices]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return oracleData;
    return [...oracleData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [oracleData, sortConfig]);

  const handleSort = (key: keyof OracleData) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: 'desc' };
      }
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  return (
    <div className="px-8 pb-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">预言机性能对比</h2>
          <span className="text-sm text-gray-500">点击表头排序</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {[
                  { key: 'name', label: '预言机' },
                  { key: 'price', label: '价格' },
                  { key: 'change24h', label: '24h 变化' },
                  { key: 'marketCap', label: '市值' },
                  { key: 'updateFrequency', label: '更新频率' },
                  { key: 'accuracy', label: '准确性' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key as keyof OracleData)}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {label}
                      {sortConfig?.key === key && (
                        <span className="text-blue-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedData.map((oracle) => (
                <tr key={oracle.symbol} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: oracle.color }}
                      />
                      <div>
                        <div className="text-gray-900 font-medium">{oracle.name}</div>
                        <div className="text-gray-500 text-sm">{oracle.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">
                    ${oracle.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={oracle.change24h >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {oracle.change24h >= 0 ? '+' : ''}
                      {oracle.change24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{oracle.marketCap}</td>
                  <td className="px-6 py-4 text-gray-600">{oracle.updateFrequency}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${oracle.accuracy}%` }}
                        />
                      </div>
                      <span className="text-gray-600 text-sm">{oracle.accuracy.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Charts Section - Light theme
function ChartsSection() {
  const priceData = generateChartData(30, 20, 2);
  const chainData = [
    { name: 'Ethereum', value: 45, color: '#627EEA' },
    { name: 'BSC', value: 25, color: '#F3BA2F' },
    { name: 'Polygon', value: 15, color: '#8247E5' },
    { name: 'Arbitrum', value: 10, color: '#28A0F0' },
    { name: 'Optimism', value: 5, color: '#FF0420' },
  ];

  return (
    <div className="px-8 pb-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Price Trend Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">价格趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#6B7280' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="url(#priceGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chain Distribution Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">链上数据分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chainData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#6B7280' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity Feed Component - Light theme
function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    const chains = ['Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Optimism'];
    const generateActivity = (): ActivityItem => {
      const oracleKeys = Object.keys(oracleConfig);
      const oracle = oracleKeys[Math.floor(Math.random() * oracleKeys.length)];
      const chain = chains[Math.floor(Math.random() * chains.length)];
      const price = (Math.random() * 50 + 1).toFixed(2);
      return {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString('zh-CN'),
        oracle: oracleConfig[oracle].name,
        price: `$${price}`,
        chain,
        txHash: `0x${Math.random().toString(16).substr(2, 40)}`,
      };
    };
    return Array.from({ length: 5 }, generateActivity);
  });

  useEffect(() => {
    const chains = ['Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Optimism'];
    const generateActivity = (): ActivityItem => {
      const oracleKeys = Object.keys(oracleConfig);
      const oracle = oracleKeys[Math.floor(Math.random() * oracleKeys.length)];
      const chain = chains[Math.floor(Math.random() * chains.length)];
      const price = (Math.random() * 50 + 1).toFixed(2);
      return {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString('zh-CN'),
        oracle: oracleConfig[oracle].name,
        price: `$${price}`,
        chain,
        txHash: `0x${Math.random().toString(16).substr(2, 40)}`,
      };
    };

    // Add new activity every 3 seconds
    const interval = setInterval(() => {
      setActivities((prev) => [generateActivity(), ...prev].slice(0, 10));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-8 pb-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">最新活动</h2>
          <Link href="/activity" className="text-sm text-blue-600 hover:text-blue-700">
            查看全部 →
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={`px-6 py-4 flex items-center justify-between transition-all duration-500 ${
                index === 0 ? 'bg-blue-50/50' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-gray-500 text-sm w-20">{activity.time}</div>
                <div className="text-gray-900 font-medium w-32">{activity.oracle}</div>
                <div className="text-emerald-600 font-mono w-24">{activity.price}</div>
                <div className="text-gray-500 text-sm">{activity.chain}</div>
              </div>
              <div className="text-gray-400 text-xs font-mono truncate max-w-[200px]">
                {activity.txHash}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component - Light theme
function Dashboard({
  t,
  prices,
}: {
  t: (key: string) => string;
  prices: Record<string, { price: number }>;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection t={t} />
      <MetricsSection />
      <OracleTable prices={prices} />
      <ChartsSection />
      <ActivityFeed />
    </div>
  );
}

// Main Page Component
export default function Home() {
  const { t } = useI18n();
  const { prices, loading } = useOraclePrices();

  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard t={t} prices={prices} />
    </div>
  );
}
