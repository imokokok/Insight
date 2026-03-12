'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';
import { PieChart as PieChartIcon, TrendingUp, BarChart3 } from 'lucide-react';

const marketShareData = [
  { name: 'Chainlink', value: 65, color: '#3b82f6' },
  { name: 'Pyth Network', value: 15, color: '#8b5cf6' },
  { name: 'Band Protocol', value: 8, color: '#10b981' },
  { name: 'API3', value: 7, color: '#f59e0b' },
  { name: 'UMA', value: 5, color: '#ec4899' },
];

const tvsTrendData = [
  { month: 'Jan', chainlink: 28, pyth: 5, band: 3, api3: 2, uma: 1.5 },
  { month: 'Feb', chainlink: 30, pyth: 6, band: 3.2, api3: 2.2, uma: 1.6 },
  { month: 'Mar', chainlink: 32, pyth: 7, band: 3.3, api3: 2.5, uma: 1.8 },
  { month: 'Apr', chainlink: 35, pyth: 8, band: 3.5, api3: 2.8, uma: 2 },
  { month: 'May', chainlink: 38, pyth: 10, band: 3.6, api3: 3, uma: 2.1 },
  { month: 'Jun', chainlink: 40, pyth: 12, band: 3.8, api3: 3.2, uma: 2.2 },
  { month: 'Jul', chainlink: 42.1, pyth: 15, band: 4, api3: 3.5, uma: 2.5 },
];

const chainSupportData = [
  { name: 'Chainlink', chains: 15, color: '#3b82f6' },
  { name: 'Pyth Network', chains: 20, color: '#8b5cf6' },
  { name: 'Band Protocol', chains: 12, color: '#10b981' },
  { name: 'API3', chains: 10, color: '#f59e0b' },
  { name: 'UMA', chains: 8, color: '#ec4899' },
];

const timeRanges = [
  { key: '1D', label: '1D' },
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: 'ALL', label: 'ALL' },
];

export default function OracleMarketOverview() {
  const { t, language } = useI18n();
  const [selectedRange, setSelectedRange] = useState('30D');
  const [activeChart, setActiveChart] = useState<'pie' | 'trend' | 'bar'>('pie');

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full mb-4">
              <PieChartIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">
                {language === 'zh' ? '市场概览' : 'Market Overview'}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'zh' ? '预言机市场分析' : 'Oracle Market Analysis'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              {language === 'zh' 
                ? '全面分析预言机市场份额、TVS趋势和链支持情况' 
                : 'Comprehensive analysis of oracle market share, TVS trends and chain support'}
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
            {timeRanges.map((range) => (
              <button
                key={range.key}
                onClick={() => setSelectedRange(range.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedRange === range.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Tabs */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setActiveChart('pie')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeChart === 'pie'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            {language === 'zh' ? '市场份额' : 'Market Share'}
          </button>
          <button
            onClick={() => setActiveChart('trend')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeChart === 'trend'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {language === 'zh' ? 'TVS趋势' : 'TVS Trend'}
          </button>
          <button
            onClick={() => setActiveChart('bar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeChart === 'bar'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            {language === 'zh' ? '链支持' : 'Chain Support'}
          </button>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'pie' && (
                  <PieChart>
                    <Pie
                      data={marketShareData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={140}
                      innerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {marketShareData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                )}
                {activeChart === 'trend' && (
                  <LineChart data={tvsTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line type="monotone" dataKey="chainlink" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="pyth" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="band" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="api3" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="uma" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                )}
                {activeChart === 'bar' && (
                  <BarChart data={chainSupportData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={100} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="chains" radius={[0, 8, 8, 0]}>
                      {chainSupportData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="space-y-4">
            {marketShareData.map((item) => (
              <div 
                key={item.name}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{item.value}%</span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                    style={{ 
                      backgroundColor: item.color,
                      width: `${item.value}%`
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Summary Stats */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
              <div className="text-sm text-blue-600 mb-1">
                {language === 'zh' ? '总市场份额' : 'Total Market Share'}
              </div>
              <div className="text-2xl font-bold text-gray-900">100%</div>
              <div className="text-xs text-gray-500 mt-1">
                {language === 'zh' ? '覆盖 5 个主要预言机' : 'Covering 5 major oracles'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
