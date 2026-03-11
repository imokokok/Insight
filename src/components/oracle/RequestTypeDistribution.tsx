'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export interface RequestTypeData {
  type: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
}

export interface RequestTypeDistributionProps {
  className?: string;
}

const REQUEST_TYPES: Omit<RequestTypeData, 'count' | 'percentage'>[] = [
  {
    type: '价格数据',
    color: '#8B5CF6',
    description: '加密货币、外汇等价格请求',
  },
  {
    type: '随机数',
    color: '#06B6D4',
    description: 'VRF 随机数生成请求',
  },
  {
    type: '体育数据',
    color: '#F59E0B',
    description: '体育赛事结果数据',
  },
  {
    type: '股票数据',
    color: '#10B981',
    description: '传统金融市场数据',
  },
  {
    type: '商品数据',
    color: '#EF4444',
    description: '黄金、原油等商品价格',
  },
  {
    type: '其他',
    color: '#6B7280',
    description: '其他类型数据请求',
  },
];

function generateMockRequestTypeData(): RequestTypeData[] {
  const totalRequests = 50000 + Math.floor(Math.random() * 20000);
  const weights = [0.55, 0.15, 0.12, 0.08, 0.06, 0.04];
  let remainingPercentage = 100;

  return REQUEST_TYPES.map((type, index) => {
    const isLast = index === REQUEST_TYPES.length - 1;
    const percentage = isLast ? remainingPercentage : Math.round(weights[index] * 100);
    if (!isLast) remainingPercentage -= percentage;

    return {
      type: type.type,
      count: Math.round((totalRequests * percentage) / 100),
      percentage,
      color: type.color,
      description: type.description,
    };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: RequestTypeData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
      <p className="text-gray-900 font-medium text-sm mb-2">{data.type}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500 text-xs">请求数量</span>
          <span className="text-gray-900 font-mono text-sm">{data.count.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500 text-xs">占比</span>
          <span className="text-gray-900 font-mono text-sm">{data.percentage}%</span>
        </div>
        <p className="text-gray-400 text-xs pt-1 border-t border-gray-100 mt-1">{data.description}</p>
      </div>
    </div>
  );
}

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
  }>;
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-600 truncate">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function RequestTypeDistribution({ className = '' }: RequestTypeDistributionProps) {
  const data = useMemo(() => generateMockRequestTypeData(), []);

  const totalRequests = data.reduce((sum, item) => sum + item.count, 0);

  const topType = data.reduce((max, item) => (item.count > max.count ? item : max), data[0]);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">数据请求类型分布</p>
          <p className="text-gray-500 text-xs mt-0.5">24小时请求类型统计</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">总请求量</p>
          <p className="text-lg font-bold text-gray-900">{totalRequests.toLocaleString()}</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="count"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.slice(0, 6).map((item) => (
            <div
              key={item.type}
              className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-gray-700">{item.type}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-gray-900">{item.count.toLocaleString()}</span>
                <span className="text-xs text-gray-500">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 bg-purple-50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-purple-600"
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
          <span className="text-sm text-purple-700">
            <span className="font-medium">{topType.type}</span> 是最常见的数据请求类型，
            占总请求量的 <span className="font-medium">{topType.percentage}%</span>
          </span>
        </div>
      </div>
    </div>
  );
}
