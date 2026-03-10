'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DashboardCard } from './DashboardCard';

type DataSourceCategory = 'crypto' | 'forex' | 'commodities' | 'stocks' | 'etf' | 'indices';

interface DataSourceType {
  category: DataSourceCategory;
  name: string;
  count: number;
  color: string;
}

const mockDataSources: DataSourceType[] = [
  { category: 'crypto', name: '加密货币', count: 380, color: '#8B5CF6' },
  { category: 'forex', name: '外汇', count: 85, color: '#3B82F6' },
  { category: 'commodities', name: '商品', count: 42, color: '#F59E0B' },
  { category: 'stocks', name: '股票', count: 28, color: '#10B981' },
  { category: 'etf', name: 'ETF', count: 10, color: '#EC4899' },
  { category: 'indices', name: '指数', count: 5, color: '#6366F1' },
];

const CATEGORY_ICONS: Record<DataSourceCategory, React.ReactNode> = {
  crypto: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  forex: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  commodities: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  stocks: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  etf: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  indices: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  ),
};

const CATEGORY_EXAMPLES: Record<DataSourceCategory, string[]> = {
  crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD'],
  forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
  commodities: ['XAU/USD', 'XAG/USD', 'WTI/USD', 'NG/USD'],
  stocks: ['AAPL', 'TSLA', 'NVDA', 'MSFT'],
  etf: ['SPY', 'QQQ', 'GLD', 'TLT'],
  indices: ['SPX', 'NDX', 'DJI', 'VIX'],
};

export function DataSourceCoverage() {
  const totalDataSources = useMemo(() => {
    return mockDataSources.reduce((sum, item) => sum + item.count, 0);
  }, []);

  const pieData = useMemo(() => {
    return mockDataSources.map((item) => ({
      name: item.name,
      value: item.count,
      color: item.color,
    }));
  }, []);

  return (
    <DashboardCard title="数据源覆盖">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">按资产类型分布</p>
            <p className="text-3xl font-bold text-gray-900">{totalDataSources}</p>
            <p className="text-sm text-gray-500">总数据源数量</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-600 font-medium">+12 本月新增</p>
            <p className="text-xs text-gray-400">持续扩展中</p>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} 个`, name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mockDataSources.map((source) => {
            const percentage = ((source.count / totalDataSources) * 100).toFixed(1);
            return (
              <div
                key={source.category}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="p-1.5 rounded-lg"
                    style={{ backgroundColor: `${source.color}20`, color: source.color }}
                  >
                    {CATEGORY_ICONS[source.category]}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{source.name}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-lg font-bold text-gray-900">{source.count}</span>
                  <span className="text-xs text-gray-500">{percentage}%</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {CATEGORY_EXAMPLES[source.category].slice(0, 2).map((example) => (
                    <span
                      key={example}
                      className="text-xs px-1.5 py-0.5 bg-white rounded text-gray-500"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardCard>
  );
}
