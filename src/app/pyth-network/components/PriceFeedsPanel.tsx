'use client';

import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// ==================== 类型定义 ====================

type AssetCategory = 'Crypto' | 'Equities' | 'FX' | 'Commodities';

interface PriceFeed {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  price: number;
  confidence: number; // 置信区间 (bps)
  publishers: number;
  deviation: number; // 24h 变化 %
  lastUpdate: string;
  emaPrice: number;
  emaConfidence: number;
}

interface CategoryStats {
  category: AssetCategory;
  count: number;
  avgPublishers: number;
  avgConfidence: number;
}

// ==================== 模拟数据 ====================

const mockPriceFeeds: PriceFeed[] = [
  // Crypto
  {
    id: 'btc-usd',
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    category: 'Crypto',
    price: 67432.15,
    confidence: 15,
    publishers: 47,
    deviation: 2.34,
    lastUpdate: '2024-03-09T08:45:12Z',
    emaPrice: 67389.22,
    emaConfidence: 18,
  },
  {
    id: 'eth-usd',
    symbol: 'ETH/USD',
    name: 'Ethereum',
    category: 'Crypto',
    price: 3856.78,
    confidence: 12,
    publishers: 52,
    deviation: 1.87,
    lastUpdate: '2024-03-09T08:45:10Z',
    emaPrice: 3851.43,
    emaConfidence: 15,
  },
  {
    id: 'sol-usd',
    symbol: 'SOL/USD',
    name: 'Solana',
    category: 'Crypto',
    price: 142.56,
    confidence: 18,
    publishers: 41,
    deviation: 4.21,
    lastUpdate: '2024-03-09T08:45:08Z',
    emaPrice: 141.89,
    emaConfidence: 22,
  },
  {
    id: 'avax-usd',
    symbol: 'AVAX/USD',
    name: 'Avalanche',
    category: 'Crypto',
    price: 38.92,
    confidence: 25,
    publishers: 35,
    deviation: -1.45,
    lastUpdate: '2024-03-09T08:44:55Z',
    emaPrice: 39.15,
    emaConfidence: 28,
  },
  {
    id: 'arb-usd',
    symbol: 'ARB/USD',
    name: 'Arbitrum',
    category: 'Crypto',
    price: 1.87,
    confidence: 32,
    publishers: 28,
    deviation: 5.67,
    lastUpdate: '2024-03-09T08:44:42Z',
    emaPrice: 1.82,
    emaConfidence: 35,
  },
  {
    id: 'op-usd',
    symbol: 'OP/USD',
    name: 'Optimism',
    category: 'Crypto',
    price: 3.42,
    confidence: 28,
    publishers: 26,
    deviation: -2.13,
    lastUpdate: '2024-03-09T08:44:38Z',
    emaPrice: 3.48,
    emaConfidence: 31,
  },
  // Equities
  {
    id: 'aapl-usd',
    symbol: 'AAPL/USD',
    name: 'Apple Inc.',
    category: 'Equities',
    price: 178.35,
    confidence: 8,
    publishers: 38,
    deviation: 0.85,
    lastUpdate: '2024-03-09T08:30:00Z',
    emaPrice: 178.12,
    emaConfidence: 10,
  },
  {
    id: 'msft-usd',
    symbol: 'MSFT/USD',
    name: 'Microsoft Corp.',
    category: 'Equities',
    price: 412.68,
    confidence: 7,
    publishers: 42,
    deviation: 1.23,
    lastUpdate: '2024-03-09T08:30:00Z',
    emaPrice: 412.15,
    emaConfidence: 9,
  },
  {
    id: 'googl-usd',
    symbol: 'GOOGL/USD',
    name: 'Alphabet Inc.',
    category: 'Equities',
    price: 138.92,
    confidence: 9,
    publishers: 36,
    deviation: -0.45,
    lastUpdate: '2024-03-09T08:30:00Z',
    emaPrice: 139.15,
    emaConfidence: 11,
  },
  {
    id: 'nvda-usd',
    symbol: 'NVDA/USD',
    name: 'NVIDIA Corp.',
    category: 'Equities',
    price: 875.28,
    confidence: 10,
    publishers: 40,
    deviation: 3.21,
    lastUpdate: '2024-03-09T08:30:00Z',
    emaPrice: 868.45,
    emaConfidence: 12,
  },
  {
    id: 'tsla-usd',
    symbol: 'TSLA/USD',
    name: 'Tesla Inc.',
    category: 'Equities',
    price: 178.92,
    confidence: 12,
    publishers: 35,
    deviation: -1.87,
    lastUpdate: '2024-03-09T08:30:00Z',
    emaPrice: 182.15,
    emaConfidence: 14,
  },
  // FX
  {
    id: 'eur-usd',
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    category: 'FX',
    price: 1.0845,
    confidence: 3,
    publishers: 55,
    deviation: 0.12,
    lastUpdate: '2024-03-09T08:45:15Z',
    emaPrice: 1.0843,
    emaConfidence: 4,
  },
  {
    id: 'gbp-usd',
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    category: 'FX',
    price: 1.2658,
    confidence: 4,
    publishers: 52,
    deviation: -0.08,
    lastUpdate: '2024-03-09T08:45:12Z',
    emaPrice: 1.2661,
    emaConfidence: 5,
  },
  {
    id: 'jpy-usd',
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    category: 'FX',
    price: 148.92,
    confidence: 4,
    publishers: 50,
    deviation: 0.23,
    lastUpdate: '2024-03-09T08:45:10Z',
    emaPrice: 148.78,
    emaConfidence: 5,
  },
  {
    id: 'chf-usd',
    symbol: 'USD/CHF',
    name: 'US Dollar / Swiss Franc',
    category: 'FX',
    price: 0.8845,
    confidence: 5,
    publishers: 48,
    deviation: -0.15,
    lastUpdate: '2024-03-09T08:45:08Z',
    emaPrice: 0.8851,
    emaConfidence: 6,
  },
  // Commodities
  {
    id: 'xau-usd',
    symbol: 'XAU/USD',
    name: 'Gold',
    category: 'Commodities',
    price: 2185.45,
    confidence: 15,
    publishers: 45,
    deviation: 0.45,
    lastUpdate: '2024-03-09T08:45:05Z',
    emaPrice: 2178.92,
    emaConfidence: 18,
  },
  {
    id: 'xag-usd',
    symbol: 'XAG/USD',
    name: 'Silver',
    category: 'Commodities',
    price: 24.32,
    confidence: 22,
    publishers: 38,
    deviation: 1.23,
    lastUpdate: '2024-03-09T08:45:02Z',
    emaPrice: 24.08,
    emaConfidence: 25,
  },
  {
    id: 'wti-usd',
    symbol: 'WTI/USD',
    name: 'Crude Oil',
    category: 'Commodities',
    price: 78.45,
    confidence: 28,
    publishers: 32,
    deviation: -0.87,
    lastUpdate: '2024-03-09T08:44:58Z',
    emaPrice: 79.12,
    emaConfidence: 32,
  },
];

// ==================== 颜色配置 ====================

const CATEGORY_COLORS: Record<AssetCategory, { bg: string; text: string; border: string; chart: string }> = {
  Crypto: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', chart: '#8B5CF6' },
  Equities: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', chart: '#3B82F6' },
  FX: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', chart: '#10B981' },
  Commodities: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', chart: '#F59E0B' },
};

const PIE_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

// ==================== 辅助函数 ====================

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatConfidence(confidence: number): string {
  return `${confidence} bps`;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// ==================== 子组件 ====================

// 统计卡片组件
function StatCard({
  title,
  value,
  subValue,
  icon,
  trend,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className="p-3 bg-gray-100 rounded-lg text-gray-700">{icon}</div>
      </div>
    </div>
  );
}

// 资产类别标签组件
function CategoryTag({ category }: { category: AssetCategory }) {
  const colors = CATEGORY_COLORS[category];
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
      {category}
    </span>
  );
}

// 置信区间指示器组件
function ConfidenceIndicator({ confidence }: { confidence: number }) {
  let colorClass = 'bg-emerald-500';
  let textClass = 'text-emerald-600';
  let label = 'High';
  
  if (confidence > 20) {
    colorClass = 'bg-amber-500';
    textClass = 'text-amber-600';
    label = 'Medium';
  }
  if (confidence > 30) {
    colorClass = 'bg-rose-500';
    textClass = 'text-rose-600';
    label = 'Low';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${colorClass}`} />
        <span className={`text-xs font-medium ${textClass}`}>{label}</span>
      </div>
      <span className="text-xs text-gray-500">({confidence} bps)</span>
    </div>
  );
}

// 资产类别分布饼图
function CategoryDistributionChart() {
  const categoryData = useMemo(() => {
    const counts: Record<AssetCategory, number> = { Crypto: 0, Equities: 0, FX: 0, Commodities: 0 };
    mockPriceFeeds.forEach((feed) => {
      counts[feed.category]++;
    });
    return Object.entries(counts).map(([category, count]) => ({
      name: category,
      value: count,
      color: CATEGORY_COLORS[category as AssetCategory].chart,
    }));
  }, []);

  const totalFeeds = mockPriceFeeds.length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Asset Category Distribution</h3>
          <p className="text-gray-500 text-xs mt-0.5">Price feeds by asset class</p>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const percent = ((data.value / totalFeeds) * 100).toFixed(1);
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
                      <p className="text-gray-900 font-medium">{data.name}</p>
                      <p className="text-gray-600 text-sm">Feeds: {data.value}</p>
                      <p className="text-gray-600 text-sm">Share: {percent}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {categoryData.map((item) => {
          const percent = ((item.value / totalFeeds) * 100).toFixed(1);
          return (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-600 truncate">{item.name}</span>
              <span className="text-xs text-gray-500 ml-auto">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 发布者分布柱状图
function PublishersDistributionChart() {
  const publisherData = useMemo(() => {
    const categoryStats: Record<AssetCategory, { total: number; count: number }> = {
      Crypto: { total: 0, count: 0 },
      Equities: { total: 0, count: 0 },
      FX: { total: 0, count: 0 },
      Commodities: { total: 0, count: 0 },
    };
    
    mockPriceFeeds.forEach((feed) => {
      categoryStats[feed.category].total += feed.publishers;
      categoryStats[feed.category].count += 1;
    });

    return Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      avgPublishers: Math.round(stats.total / stats.count),
      color: CATEGORY_COLORS[category as AssetCategory].chart,
    }));
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Avg Publishers by Category</h3>
          <p className="text-gray-500 text-xs mt-0.5">Data provider participation</p>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={publisherData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="category" 
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
                      <p className="text-gray-900 font-medium">{data.category}</p>
                      <p className="text-gray-600 text-sm">Avg Publishers: {data.avgPublishers}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="avgPublishers" radius={[4, 4, 0, 0]}>
              {publisherData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 价格馈送表格组件
function PriceFeedsTable({
  feeds,
  searchQuery,
  selectedCategory,
}: {
  feeds: PriceFeed[];
  searchQuery: string;
  selectedCategory: AssetCategory | 'All';
}) {
  const filteredFeeds = useMemo(() => {
    return feeds.filter((feed) => {
      const matchesSearch =
        feed.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feed.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || feed.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [feeds, searchQuery, selectedCategory]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-gray-900 text-sm font-semibold">Price Feeds</h3>
        <p className="text-gray-500 text-xs mt-0.5">Real-time price data with confidence intervals</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                24h Change
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider hidden md:table-cell">
                Publishers
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                Last Update
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredFeeds.map((feed) => (
              <tr key={feed.id} className="hover:bg-gray-50 transition-colors duration-200">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                      {feed.symbol.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{feed.symbol}</p>
                      <p className="text-xs text-gray-500">{feed.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CategoryTag category={feed.category} />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-gray-900">${formatPrice(feed.price)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-sm font-medium ${
                      feed.deviation >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {feed.deviation >= 0 ? '+' : ''}
                    {feed.deviation.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <ConfidenceIndicator confidence={feed.confidence} />
                  </div>
                </td>
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <span className="text-sm font-medium text-gray-900">{feed.publishers}</span>
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <span className="text-xs text-gray-500">{getTimeAgo(feed.lastUpdate)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredFeeds.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500 text-sm">No price feeds found matching your criteria</p>
        </div>
      )}
    </div>
  );
}

// 置信区间说明卡片
function ConfidenceExplanationCard() {
  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-violet-100 rounded-lg">
          <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h4 className="text-gray-900 font-semibold text-sm">Pyth Confidence Interval</h4>
          <p className="text-gray-600 text-xs mt-1">
            Pyth uniquely provides confidence intervals alongside each price update, representing the uncertainty 
            in the aggregate price. Lower confidence values (in basis points) indicate higher precision.
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-600">&lt; 20 bps: High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs text-gray-600">20-30 bps: Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs text-gray-600">&gt; 30 bps: Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 主面板组件 ====================

export function PriceFeedsPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'All'>('All');

  const stats = useMemo(() => {
    const totalFeeds = mockPriceFeeds.length;
    const avgPublishers = Math.round(
      mockPriceFeeds.reduce((sum, f) => sum + f.publishers, 0) / totalFeeds
    );
    const avgConfidence = Math.round(
      mockPriceFeeds.reduce((sum, f) => sum + f.confidence, 0) / totalFeeds
    );
    const categories = new Set(mockPriceFeeds.map((f) => f.category)).size;

    return { totalFeeds, avgPublishers, avgConfidence, categories };
  }, []);

  return (
    <div className="space-y-6">
      {/* 统计卡片区域 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Price Feeds"
          value={stats.totalFeeds.toString()}
          subValue="Across all categories"
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
          trend={{ value: '+3 this week', positive: true }}
        />
        <StatCard
          title="Avg Publishers"
          value={stats.avgPublishers.toString()}
          subValue="Per price feed"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="Avg Confidence"
          value={`${stats.avgConfidence} bps`}
          subValue="Across all feeds"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          trend={{ value: 'Improved 5%', positive: true }}
        />
        <StatCard
          title="Asset Categories"
          value={stats.categories.toString()}
          subValue="Crypto, Equities, FX, Commodities"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          }
        />
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search price feeds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['All', 'Crypto', 'Equities', 'FX', 'Commodities'] as const).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CategoryDistributionChart />
        </div>
        <div className="lg:col-span-2">
          <PublishersDistributionChart />
        </div>
      </div>

      {/* 价格馈送表格 */}
      <PriceFeedsTable
        feeds={mockPriceFeeds}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
      />

      {/* 置信区间说明 */}
      <ConfidenceExplanationCard />
    </div>
  );
}

export default PriceFeedsPanel;
