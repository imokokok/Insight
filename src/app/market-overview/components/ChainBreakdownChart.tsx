'use client';

import { useState } from 'react';
import { ChainBreakdown } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { TooltipProps } from '@/types/ui/recharts';
import { useI18n } from '@/lib/i18n/provider';
import { Globe } from 'lucide-react';

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
  const { locale } = useI18n();
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const CustomTooltip = ({ active, payload }: TooltipProps<ChainBreakdown>) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ChainBreakdown;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-semibold text-gray-900">{item.chainName}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">TVS:</span>
              <span className="font-medium">{item.tvsFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{locale === 'zh-CN' ? '份额' : 'Share'}:</span>
              <span className="font-medium">{item.share.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{locale === 'zh-CN' ? '协议数' : 'Protocols'}:</span>
              <span className="font-medium">{item.protocols}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">24h:</span>
              <span
                className={`font-medium ${item.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {item.change24h >= 0 ? '+' : ''}
                {item.change24h.toFixed(1)}%
              </span>
            </div>
            <div className="pt-1 border-t border-gray-100 mt-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">
                  {locale === 'zh-CN' ? '主要预言机' : 'Top Oracle'}:
                </span>
                <span className="font-medium text-gray-600">{item.topOracle}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">{locale === 'zh-CN' ? '份额' : 'Share'}:</span>
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
      <div className="h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin rounded-full" />
          <span className="text-gray-500 text-sm">
            {locale === 'zh-CN' ? '加载中...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {locale === 'zh-CN' ? '暂无链数据' : 'No chain data available'}
          </p>
        </div>
      </div>
    );
  }

  if (viewType === 'table') {
    return (
      <div className="h-[360px] overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '链' : 'Chain'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                TVS
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '份额' : 'Share'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '协议' : 'Protocols'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                24h
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '主要预言机' : 'Top Oracle'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr
                key={item.chainId}
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedItem === item.chainId ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedItem(item.chainId === selectedItem ? null : item.chainId)}
                onMouseEnter={() => setHoveredItem(item.chainId)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-gray-900">{item.chainName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium text-gray-900">{item.tvsFormatted}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-gray-600">{item.share.toFixed(1)}%</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-gray-600">{item.protocols}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-medium ${
                      item.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.change24h >= 0 ? '+' : ''}
                    {item.change24h.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3">
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
    <div className="space-y-4">
      {/* 图表类型切换 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('pie')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              chartType === 'pie'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {locale === 'zh-CN' ? '饼图' : 'Pie'}
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              chartType === 'bar'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {locale === 'zh-CN' ? '柱状图' : 'Bar'}
          </button>
        </div>
        <span className="text-xs text-gray-400">
          {locale === 'zh-CN' ? '点击图表查看详情' : 'Click chart for details'}
        </span>
      </div>

      {/* 图表 */}
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                innerRadius={60}
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
                    stroke={selectedItem === entry.chainId ? '#3B82F6' : 'transparent'}
                    strokeWidth={selectedItem === entry.chainId ? 3 : 0}
                    opacity={hoveredItem && hoveredItem !== entry.chainId ? 0.6 : 1}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          ) : (
            <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
              <YAxis
                dataKey="chainName"
                type="category"
                stroke="#9CA3AF"
                fontSize={12}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="share"
                name="Share %"
                radius={[0, 4, 4, 0]}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {data.slice(0, 8).map((item) => (
          <button
            key={item.chainId}
            onClick={() => setSelectedItem(item.chainId === selectedItem ? null : item.chainId)}
            className={`flex items-center gap-2 p-2 rounded-lg transition-all text-left ${
              selectedItem === item.chainId
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
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
