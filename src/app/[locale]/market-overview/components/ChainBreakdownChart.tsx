'use client';

import { useState } from 'react';

import { Globe } from 'lucide-react';
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

import { useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { chartColors } from '@/lib/config/colors';
import { type TooltipProps } from '@/types/ui/recharts';

import { type ChainBreakdown } from '../types';

interface ChainBreakdownChartProps {
  data: ChainBreakdown[];
  loading?: boolean;
  viewType?: 'chart' | 'table';
}

export default function ChainBreakdownChart({
  data,
  loading = false,
  viewType = 'chart',
}: ChainBreakdownChartProps) {
  const locale = useLocale();
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const CustomTooltip = ({ active, payload }: TooltipProps<ChainBreakdown>) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ChainBreakdown;
      return (
        <div className="bg-white border border-gray-200 rounded p-2 min-w-[160px]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: item.color }} />
            <span className="font-medium text-gray-900 text-sm">{item.chainName}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">TVS:</span>
              <span className="font-medium">{item.tvsFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isChineseLocale(locale) ? '份额' : 'Share'}:</span>
              <span className="font-medium">{item.share.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">
                {isChineseLocale(locale) ? '协议数' : 'Protocols'}:
              </span>
              <span className="font-medium">{item.protocols}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">24h:</span>
              <span
                className={`font-medium ${item.change24h >= 0 ? 'text-success-600' : 'text-danger-600'}`}
              >
                {item.change24h >= 0 ? '+' : ''}
                {item.change24h.toFixed(1)}%
              </span>
            </div>
            <div className="pt-1 border-t border-gray-100 mt-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">
                  {isChineseLocale(locale) ? '主要预言机' : 'Top Oracle'}:
                </span>
                <span className="font-medium text-gray-600">{item.topOracle}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">{isChineseLocale(locale) ? '份额' : 'Share'}:</span>
                <span className="font-medium text-gray-600">{item.topOracleShare.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin rounded-full" />
          <span className="text-gray-500 text-sm">
            {isChineseLocale(locale) ? '加载中...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {isChineseLocale(locale) ? '暂无链数据' : 'No chain data available'}
          </p>
        </div>
      </div>
    );
  }

  if (viewType === 'table') {
    return (
      <div className="h-[320px] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                {isChineseLocale(locale) ? '链' : 'Chain'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                TVS
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                {isChineseLocale(locale) ? '份额' : 'Share'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                {isChineseLocale(locale) ? '协议' : 'Protocols'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                24h
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                {isChineseLocale(locale) ? '主要预言机' : 'Top Oracle'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr
                key={item.chainId}
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedItem === item.chainId ? 'bg-primary-50' : ''
                }`}
                onClick={() => setSelectedItem(item.chainId === selectedItem ? null : item.chainId)}
                onMouseEnter={() => setHoveredItem(item.chainId)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-gray-900 text-sm">{item.chainName}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="font-medium text-gray-900 text-sm">{item.tvsFormatted}</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-gray-600 text-sm">{item.share.toFixed(1)}%</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-gray-600 text-sm">{item.protocols}</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`font-medium text-sm ${
                      item.change24h >= 0 ? 'text-success-600' : 'text-danger-600'
                    }`}
                  >
                    {item.change24h >= 0 ? '+' : ''}
                    {item.change24h.toFixed(1)}%
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">{item.topOracle}</span>
                    <span className="text-xs text-gray-400">
                      ({item.topOracleShare.toFixed(1)}%)
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 图表类型切换 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setChartType('pie')}
            className={`px-2.5 py-1 text-sm border rounded transition-colors ${
              chartType === 'pie'
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {isChineseLocale(locale) ? '饼图' : 'Pie'}
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-2.5 py-1 text-sm border rounded transition-colors ${
              chartType === 'bar'
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {isChineseLocale(locale) ? '柱状图' : 'Bar'}
          </button>
        </div>
        <span className="text-xs text-gray-400">
          {isChineseLocale(locale) ? '点击图表查看详情' : 'Click chart for details'}
        </span>
      </div>

      {/* 图表 */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                innerRadius={50}
                dataKey="share"
                paddingAngle={2}
                onMouseEnter={(_, index) => setHoveredItem(data[index]?.chainId)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={(_, index) => {
                  const id = data[index]?.chainId;
                  setSelectedItem(id === selectedItem ? null : id);
                }}
              >
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.chainId}`}
                    fill={entry.color}
                    stroke={
                      selectedItem === entry.chainId ? chartColors.recharts.primary : 'transparent'
                    }
                    strokeWidth={selectedItem === entry.chainId ? 2 : 0}
                    opacity={hoveredItem && hoveredItem !== entry.chainId ? 0.6 : 1}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                  />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>
          ) : (
            <BarChart data={data} layout="vertical" margin={{ left: 70 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.recharts.grid}
                horizontal={false}
              />
              <XAxis type="number" stroke={chartColors.recharts.axis} fontSize={12} />
              <YAxis
                dataKey="chainName"
                type="category"
                stroke={chartColors.recharts.axis}
                fontSize={11}
                width={65}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar
                dataKey="share"
                name="Share %"
                radius={[0, 3, 3, 0]}
                onMouseEnter={(_, index) => setHoveredItem(data[index]?.chainId)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={(_, index) => {
                  const id = data[index]?.chainId;
                  setSelectedItem(id === selectedItem ? null : id);
                }}
              >
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.chainId}`}
                    fill={entry.color}
                    opacity={hoveredItem && hoveredItem !== entry.chainId ? 0.6 : 1}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 链列表 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
        {data.slice(0, 8).map((item) => (
          <button
            key={item.chainId}
            onClick={() => setSelectedItem(item.chainId === selectedItem ? null : item.chainId)}
            className={`flex items-center gap-2 p-2 border rounded transition-all text-left ${
              selectedItem === item.chainId
                ? 'bg-primary-50 border-primary-200'
                : 'border-transparent hover:bg-gray-50'
            }`}
          >
            <div
              className="w-2 h-2 flex-shrink-0 rounded"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{item.chainName}</div>
              <div className="text-xs text-gray-500">{item.share.toFixed(1)}%</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
