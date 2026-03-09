'use client';

import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import AdvancedCard, {
  AdvancedCardHeader,
  AdvancedCardTitle,
  AdvancedCardContent,
} from '@/components/AdvancedCard';
import StatCard from '@/components/StatCard';

// 验证者数据类型
interface Validator {
  id: string;
  name: string;
  responseTime: number;
  successRate: number;
  reputation: number;
  stake: number;
  location: string;
  type: 'institutional' | 'independent' | 'community';
}

// 收益数据类型
interface RevenueData {
  date: string;
  revenue: number;
  cumulative: number;
}

// 模拟验证者数据
const mockValidators: Validator[] = [
  {
    id: '1',
    name: 'Validator C',
    responseTime: 110,
    successRate: 99.9,
    reputation: 98,
    stake: 680000,
    location: '北美',
    type: 'institutional',
  },
  {
    id: '2',
    name: 'Validator A',
    responseTime: 120,
    successRate: 99.8,
    reputation: 95,
    stake: 500000,
    location: '欧洲',
    type: 'institutional',
  },
  {
    id: '3',
    name: 'Validator B',
    responseTime: 135,
    successRate: 99.5,
    reputation: 92,
    stake: 420000,
    location: '亚洲',
    type: 'independent',
  },
  {
    id: '4',
    name: 'Validator D',
    responseTime: 125,
    successRate: 99.7,
    reputation: 94,
    stake: 380000,
    location: '北美',
    type: 'community',
  },
  {
    id: '5',
    name: 'Validator E',
    responseTime: 115,
    successRate: 99.8,
    reputation: 96,
    stake: 550000,
    location: '欧洲',
    type: 'institutional',
  },
  {
    id: '6',
    name: 'Validator F',
    responseTime: 140,
    successRate: 99.4,
    reputation: 90,
    stake: 320000,
    location: '亚洲',
    type: 'independent',
  },
  {
    id: '7',
    name: 'Validator G',
    responseTime: 105,
    successRate: 99.9,
    reputation: 97,
    stake: 620000,
    location: '北美',
    type: 'institutional',
  },
  {
    id: '8',
    name: 'Validator H',
    responseTime: 130,
    successRate: 99.6,
    reputation: 93,
    stake: 410000,
    location: '欧洲',
    type: 'community',
  },
  {
    id: '9',
    name: 'Validator I',
    responseTime: 145,
    successRate: 99.3,
    reputation: 89,
    stake: 280000,
    location: '其他',
    type: 'independent',
  },
  {
    id: '10',
    name: 'Validator J',
    responseTime: 118,
    successRate: 99.7,
    reputation: 94,
    stake: 460000,
    location: '北美',
    type: 'community',
  },
];

// 地理分布数据
const geoDistributionData = [
  { name: '北美', value: 45, color: '#3b82f6' },
  { name: '欧洲', value: 30, color: '#8b5cf6' },
  { name: '亚洲', value: 20, color: '#10b981' },
  { name: '其他', value: 5, color: '#f59e0b' },
];

// 类型分布数据
const typeDistributionData = [
  { name: '机构', value: 40, color: '#6366f1' },
  { name: '独立', value: 35, color: '#14b8a6' },
  { name: '社区', value: 25, color: '#f97316' },
];

// 生成30天收益数据
const generateRevenueData = (): RevenueData[] => {
  const data: RevenueData[] = [];
  const baseRevenue = 1000;
  let cumulative = 0;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const revenue = baseRevenue + Math.random() * 500 - 250;
    cumulative += revenue;
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      revenue: Math.round(revenue),
      cumulative: Math.round(cumulative),
    });
  }
  return data;
};

// 验证者排名列表组件
function ValidatorRankingList({ validators }: { validators: Validator[] }) {
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      institutional: '机构',
      independent: '独立',
      community: '社区',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      institutional: 'bg-indigo-100 text-indigo-700',
      independent: 'bg-teal-100 text-teal-700',
      community: 'bg-orange-100 text-orange-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-3">
      {validators.map((validator, index) => (
        <div
          key={validator.id}
          className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow duration-200"
        >
          {/* 排名 */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              index < 3
                ? index === 0
                  ? 'bg-yellow-100 text-yellow-700'
                  : index === 1
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-orange-100 text-orange-700'
                : 'bg-gray-50 text-gray-500'
            }`}
          >
            {index + 1}
          </div>

          {/* 验证者信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">{validator.name}</span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(validator.type)}`}
              >
                {getTypeLabel(validator.type)}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span>{validator.location}</span>
              <span>•</span>
              <span>声誉: {validator.reputation}</span>
            </div>
          </div>

          {/* 指标 */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <p className="font-semibold text-gray-900">{validator.responseTime}ms</p>
              <p className="text-xs text-gray-500">响应时间</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-green-600">{validator.successRate}%</p>
              <p className="text-xs text-gray-500">成功率</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-indigo-600">
                {(validator.stake / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-gray-500">质押 UMA</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 地理分布卡片组件
function GeoDistributionCard({ data }: { data: typeof geoDistributionData }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {data.map((item) => (
        <div
          key={item.name}
          className="p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-500">{item.value}%</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${item.value}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 收益趋势图表组件
function RevenueTrendChart({ data }: { data: RevenueData[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickMargin={10}
            interval={4}
          />
          <YAxis
            yAxisId="left"
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(value) => `${value}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number, name: string) => [
              name === 'revenue' ? `${value} UMA` : `${value.toLocaleString()} UMA`,
              name === 'revenue' ? '日收益' : '累计收益',
            ]}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            name="日收益"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            name="累计收益"
            stroke="#8b5cf6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCumulative)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// 主组件
export function ValidatorAnalyticsPanel() {
  const [validators] = useState<Validator[]>(mockValidators);
  const revenueData = useMemo(() => generateRevenueData(), []);

  // 计算统计数据
  const totalValidators = validators.length;
  const avgStake = validators.reduce((sum, v) => sum + v.stake, 0) / totalValidators;
  const avgSuccessRate = validators.reduce((sum, v) => sum + v.successRate, 0) / totalValidators;
  const totalStaked = validators.reduce((sum, v) => sum + v.stake, 0);

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="活跃验证者"
          value={totalValidators}
          suffix="+"
          trend={12}
          trendDirection="up"
          trendLabel="vs 上周"
          accentColor="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="平均质押量"
          value={(avgStake / 1000).toFixed(0)}
          suffix="K UMA"
          trend={5.8}
          trendDirection="up"
          trendLabel="vs 上周"
          accentColor="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="平均成功率"
          value={avgSuccessRate.toFixed(1)}
          suffix="%"
          trend={0.3}
          trendDirection="up"
          trendLabel="vs 上周"
          accentColor="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="总质押量"
          value={(totalStaked / 1000000).toFixed(2)}
          suffix="M UMA"
          trend={8.2}
          trendDirection="up"
          trendLabel="vs 上周"
          accentColor="cyan"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
      </div>

      {/* 验证者排名和分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 验证者排名列表 */}
        <div className="lg:col-span-2">
          <AdvancedCard variant="glass" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle className="text-gray-900">验证者性能排名</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              <ValidatorRankingList validators={validators} />
            </AdvancedCardContent>
          </AdvancedCard>
        </div>

        {/* 地理分布和类型分布 */}
        <div className="space-y-6">
          {/* 地理分布 */}
          <AdvancedCard variant="glass" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle className="text-gray-900 text-lg">地理分布</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              <GeoDistributionCard data={geoDistributionData} />
            </AdvancedCardContent>
          </AdvancedCard>

          {/* 类型分布饼图 */}
          <AdvancedCard variant="glass" hoverable={false}>
            <AdvancedCardHeader>
              <AdvancedCardTitle className="text-gray-900 text-lg">类型分布</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {typeDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value: number, name: string) => [`${value}%`, name]}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </AdvancedCardContent>
          </AdvancedCard>
        </div>
      </div>

      {/* 收益趋势分析 */}
      <AdvancedCard variant="glass" hoverable={false}>
        <AdvancedCardHeader>
          <div className="flex items-center justify-between">
            <AdvancedCardTitle className="text-gray-900">验证者收益分析</AdvancedCardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                30天趋势
              </span>
            </div>
          </div>
        </AdvancedCardHeader>
        <AdvancedCardContent>
          <RevenueTrendChart data={revenueData} />
        </AdvancedCardContent>
      </AdvancedCard>
    </div>
  );
}
