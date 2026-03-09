'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { BandProtocolClient, ValidatorInfo } from '@/lib/oracles/bandProtocol';

const bandProtocolClient = new BandProtocolClient();

// 格式化数字
function formatNumber(value: number, compact: boolean = false): string {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

// 格式化百分比
function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// 地理分布数据
const geoDistributionData = [
  { region: 'Asia', count: 28, percentage: 46.7, color: '#7C3AED' },
  { region: 'Europe', count: 16, percentage: 26.7, color: '#A78BFA' },
  { region: 'North America', count: 12, percentage: 20.0, color: '#C4B5FD' },
  { region: 'Others', count: 4, percentage: 6.6, color: '#E9D5FF' },
];

// 验证者类型分布数据
const validatorTypeData = [
  { name: 'Top Validators', value: 15, color: '#7C3AED' },
  { name: 'Community Validators', value: 35, color: '#A78BFA' },
  { name: 'New Validators', value: 10, color: '#C4B5FD' },
];

// 收益趋势模拟数据
const revenueTrendData = [
  { day: 'Mon', avgRevenue: 1250, apr: 8.2 },
  { day: 'Tue', avgRevenue: 1320, apr: 8.4 },
  { day: 'Wed', avgRevenue: 1280, apr: 8.3 },
  { day: 'Thu', avgRevenue: 1450, apr: 8.6 },
  { day: 'Fri', avgRevenue: 1380, apr: 8.5 },
  { day: 'Sat', avgRevenue: 1520, apr: 8.8 },
  { day: 'Sun', avgRevenue: 1480, apr: 8.7 },
];

// 排序类型
 type SortField = 'tokens' | 'uptime' | 'reputation';
 type SortOrder = 'asc' | 'desc';

// 地理分布卡片
function GeoDistributionCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-gray-900 font-semibold text-lg mb-4">Geographic Distribution</h3>
      
      {/* 区域分布条形图 */}
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={geoDistributionData} layout="vertical" margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="region" 
              type="category" 
              width={100}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [`${value} validators`, 'Count']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
              {geoDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 区域统计 */}
      <div className="grid grid-cols-2 gap-3">
        {geoDistributionData.map((item) => (
          <div key={item.region} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1">
              <span className="text-gray-600 text-sm">{item.region}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-semibold text-sm">{item.count}</span>
                <span className="text-gray-400 text-xs">({item.percentage}%)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 验证者类型分布卡片
function ValidatorTypeCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-gray-900 font-semibold text-lg mb-4">Validator Types</h3>
      
      {/* 饼图 */}
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={validatorTypeData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {validatorTypeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value, name) => [`${value} validators`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="space-y-2">
        {validatorTypeData.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600 text-sm">{item.name}</span>
            </div>
            <span className="text-gray-900 font-semibold text-sm">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 验证者排行榜表格
function ValidatorRankingTable({ 
  validators, 
  sortField, 
  sortOrder, 
  onSort 
}: { 
  validators: ValidatorInfo[]; 
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}) {
  // 计算声誉评分（基于委托量和运行时间）
  const getReputationScore = (validator: ValidatorInfo): number => {
    const tokenScore = Math.min(validator.tokens / 1000000, 50);
    const uptimeScore = (validator.uptime / 100) * 50;
    return Math.round(tokenScore + uptimeScore);
  };

  // 计算响应时间（模拟数据）
  const getResponseTime = (validator: ValidatorInfo): number => {
    return Math.round(150 + Math.random() * 200);
  };

  // 计算成功率（模拟数据）
  const getSuccessRate = (validator: ValidatorInfo): number => {
    return Math.min(validator.uptime + Math.random() * 0.5, 100);
  };

  // 排序后的验证者列表
  const sortedValidators = useMemo(() => {
    const sorted = [...validators].slice(0, 10);
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'tokens':
          comparison = a.tokens - b.tokens;
          break;
        case 'uptime':
          comparison = a.uptime - b.uptime;
          break;
        case 'reputation':
          comparison = getReputationScore(a) - getReputationScore(b);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return sorted;
  }, [validators, sortField, sortOrder]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-300">↕</span>;
    }
    return <span className="text-purple-600">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <h3 className="text-gray-900 font-semibold text-lg">Top 10 Validators</h3>
        <p className="text-gray-500 text-sm mt-1">Ranked by performance metrics</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Validator
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Response Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Success Rate
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-600"
                onClick={() => onSort('reputation')}
              >
                <span className="flex items-center gap-1">
                  Reputation
                  <SortIcon field="reputation" />
                </span>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-600"
                onClick={() => onSort('tokens')}
              >
                <span className="flex items-center gap-1">
                  Delegated
                  <SortIcon field="tokens" />
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commission
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedValidators.map((validator, index) => {
              const responseTime = getResponseTime(validator);
              const successRate = getSuccessRate(validator);
              const reputation = getReputationScore(validator);
              
              return (
                <tr key={validator.operatorAddress} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${
                      index < 3 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xs font-bold">
                        {validator.moniker.charAt(0)}
                      </div>
                      <div>
                        <div className="text-gray-900 font-medium text-sm">{validator.moniker}</div>
                        <div className="text-gray-400 text-xs">
                          {validator.operatorAddress.slice(0, 12)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-sm ${
                      responseTime < 200 ? 'text-green-600' : 
                      responseTime < 300 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {responseTime}ms
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${successRate}%` }}
                        />
                      </div>
                      <span className="text-gray-700 text-sm">{successRate.toFixed(2)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-gray-900 font-medium text-sm">{reputation}</span>
                      <span className="text-gray-400 text-xs">/100</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-gray-900 font-medium text-sm">
                      {formatNumber(validator.tokens, true)} BAND
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-purple-600 font-medium text-sm">
                      {formatPercent(validator.commissionRate * 100)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 收益分析卡片
function RevenueAnalysisCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-gray-900 font-semibold text-lg mb-4">Revenue Analysis</h3>
      
      {/* 收益趋势图 */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="day" 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="avgRevenue" 
              stroke="#7C3AED" 
              strokeWidth={2}
              dot={{ fill: '#7C3AED', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="Avg Daily Revenue ($)"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="apr" 
              stroke="#10B981" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="Staking APR (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-600" />
          <span className="text-gray-600 text-sm">Avg Daily Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600 text-sm">Staking APR</span>
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-gray-500 text-xs mb-1">Weekly Avg Revenue</p>
          <p className="text-purple-600 font-bold text-lg">$1,382</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-xs mb-1">Current APR</p>
          <p className="text-green-600 font-bold text-lg">8.7%</p>
        </div>
      </div>
    </div>
  );
}

// 主组件
export function ValidatorAnalyticsPanel() {
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('tokens');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    const fetchValidators = async () => {
      try {
        const data = await bandProtocolClient.getValidators(50);
        setValidators(data);
      } catch (error) {
        console.error('Error fetching validators:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchValidators();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
            <span>Loading validator analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部标题 */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Validator Analytics</h2>
            <p className="text-purple-200">
              Comprehensive analysis of Band Protocol validators
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center">
              <p className="text-purple-200 text-sm">Total Validators</p>
              <p className="text-2xl font-bold">{validators.length}</p>
            </div>
            <div className="w-px h-12 bg-purple-400" />
            <div className="text-center">
              <p className="text-purple-200 text-sm">Active Set</p>
              <p className="text-2xl font-bold">60</p>
            </div>
          </div>
        </div>
      </div>

      {/* 第一行：地理分布和类型分布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GeoDistributionCard />
        <ValidatorTypeCard />
      </div>

      {/* 第二行：验证者排行榜 */}
      <ValidatorRankingTable 
        validators={validators}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {/* 第三行：收益分析 */}
      <RevenueAnalysisCard />
    </div>
  );
}
