'use client';

import { useState } from 'react';
import { AssetCategory } from '../types';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { TooltipProps } from '@/types/ui/recharts';
import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import {
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  TrendingUp,
  Droplets,
  Zap,
} from 'lucide-react';
import { chartColors, semanticColors } from '@/lib/config/colors';

interface AssetCategoryChartProps {
  data: AssetCategory[];
  loading?: boolean;
  viewType?: 'chart' | 'table';
}

export default function AssetCategoryChart({
  data,
  loading = false,
  viewType = 'chart',
}: AssetCategoryChartProps) {
  const locale = useLocale();
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'radar'>('pie');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const CustomTooltip = ({ active, payload }: TooltipProps<AssetCategory>) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as AssetCategory;
      return (
        <div className="bg-white border border-gray-200 p-2 min-w-[180px]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2" style={{ backgroundColor: item.color }} />
            <span className="font-medium text-gray-900 text-sm">{item.label}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{isChineseLocale(locale) ? 'TVS' : 'TVS'}:</span>
              <span className="font-medium">${(item.value / 1e9).toFixed(1)}B</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isChineseLocale(locale) ? '份额' : 'Share'}:</span>
              <span className="font-medium">{item.share.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isChineseLocale(locale) ? '资产数' : 'Assets'}:</span>
              <span className="font-medium">{item.assets.length}</span>
            </div>
            <div className="pt-1 border-t border-gray-100 mt-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {isChineseLocale(locale) ? '波动率' : 'Volatility'}:
                </span>
                <span className="font-medium text-gray-600">{item.avgVolatility.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  {isChineseLocale(locale) ? '流动性' : 'Liquidity'}:
                </span>
                <span className="font-medium text-gray-600">{item.avgLiquidity.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // 准备雷达图数据
  const radarData = data.map((item) => ({
    category: item.label,
    volatility: item.avgVolatility * 10, // 放大以便显示
    liquidity: item.avgLiquidity,
    share: item.share,
    fullMark: 100,
  }));

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin" />
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
          <PieChartIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {isChineseLocale(locale) ? '暂无资产类别数据' : 'No asset category data available'}
          </p>
        </div>
      </div>
    );
  }

  if (viewType === 'table') {
    return (
      <div className="h-[320px] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '类别' : 'Category'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                TVS
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '份额' : 'Share'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '资产数' : 'Assets'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '波动率' : 'Volatility'}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {isChineseLocale(locale) ? '流动性' : 'Liquidity'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr
                key={item.category}
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedItem === item.category ? 'bg-blue-50' : ''
                }`}
                onClick={() =>
                  setSelectedItem(item.category === selectedItem ? null : item.category)
                }
                onMouseEnter={() => setHoveredItem(item.category)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="font-medium text-gray-900 text-sm">
                    ${(item.value / 1e9).toFixed(1)}B
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-gray-600 text-sm">{item.share.toFixed(1)}%</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-gray-600 text-sm">{item.assets.length}</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-gray-600 text-sm">{item.avgVolatility.toFixed(1)}%</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-gray-600 text-sm">{item.avgLiquidity.toFixed(1)}%</span>
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
            className={`px-2.5 py-1 text-sm border transition-colors ${
              chartType === 'pie'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5 inline mr-1" />
            {isChineseLocale(locale) ? '饼图' : 'Pie'}
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-2.5 py-1 text-sm border transition-colors ${
              chartType === 'bar'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 inline mr-1" />
            {isChineseLocale(locale) ? '柱状图' : 'Bar'}
          </button>
          <button
            onClick={() => setChartType('radar')}
            className={`px-2.5 py-1 text-sm border transition-colors ${
              chartType === 'radar'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Activity className="w-3.5 h-3.5 inline mr-1" />
            {isChineseLocale(locale) ? '雷达图' : 'Radar'}
          </button>
        </div>
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
                onMouseEnter={(_, index) => setHoveredItem(data[index]?.category)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={(_, index) => {
                  const id = data[index]?.category;
                  setSelectedItem(id === selectedItem ? null : id);
                }}
              >
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.category}`}
                    fill={entry.color}
                    stroke={
                      selectedItem === entry.category ? chartColors.recharts.primary : 'transparent'
                    }
                    strokeWidth={selectedItem === entry.category ? 2 : 0}
                    opacity={hoveredItem && hoveredItem !== entry.category ? 0.6 : 1}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          ) : chartType === 'bar' ? (
            <BarChart data={data} layout="vertical" margin={{ left: 90 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.recharts.grid}
                horizontal={false}
              />
              <XAxis type="number" stroke={chartColors.recharts.axis} fontSize={12} />
              <YAxis
                dataKey="label"
                type="category"
                stroke={chartColors.recharts.axis}
                fontSize={11}
                width={85}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="share"
                name="Share %"
                radius={[0, 3, 3, 0]}
                onMouseEnter={(_, index) => setHoveredItem(data[index]?.category)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={(_, index) => {
                  const id = data[index]?.category;
                  setSelectedItem(id === selectedItem ? null : id);
                }}
              >
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.category}`}
                    fill={entry.color}
                    opacity={hoveredItem && hoveredItem !== entry.category ? 0.6 : 1}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke={chartColors.recharts.grid} />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Radar
                name="Liquidity"
                dataKey="liquidity"
                stroke={semanticColors.success.main}
                fill={semanticColors.success.main}
                fillOpacity={0.3}
              />
              <Radar
                name="Volatility (x10)"
                dataKey="volatility"
                stroke={semanticColors.warning.main}
                fill={semanticColors.warning.main}
                fillOpacity={0.3}
              />
              <Legend />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-gray-200 p-2 text-xs">
                        <p className="font-medium mb-1">{payload[0].payload.category}</p>
                        {payload.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-2 h-2" style={{ backgroundColor: entry.color }} />
                            <span>
                              {entry.name}:{' '}
                              {typeof entry.value === 'number'
                                ? entry.value.toFixed(1)
                                : entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 类别列表 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {data.map((item) => (
          <button
            key={item.category}
            onClick={() => setSelectedItem(item.category === selectedItem ? null : item.category)}
            className={`flex items-center gap-2 p-2 border transition-all text-left ${
              selectedItem === item.category
                ? 'bg-blue-50 border-blue-200'
                : 'border-transparent hover:bg-gray-50'
            }`}
          >
            <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: item.color }} />
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{item.label}</div>
              <div className="text-xs text-gray-500">
                {item.share.toFixed(1)}% • {item.assets.length}{' '}
                {isChineseLocale(locale) ? '资产' : 'assets'}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
            <TrendingUp className="w-3 h-3" />
            {isChineseLocale(locale) ? '平均波动率' : 'Avg Volatility'}
          </div>
          <div className="font-semibold text-gray-900 text-sm">
            {(data.reduce((sum, d) => sum + d.avgVolatility, 0) / data.length).toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
            <Droplets className="w-3 h-3" />
            {isChineseLocale(locale) ? '平均流动性' : 'Avg Liquidity'}
          </div>
          <div className="font-semibold text-gray-900 text-sm">
            {(data.reduce((sum, d) => sum + d.avgLiquidity, 0) / data.length).toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
            <Zap className="w-3 h-3" />
            {isChineseLocale(locale) ? '总类别' : 'Categories'}
          </div>
          <div className="font-semibold text-gray-900 text-sm">{data.length}</div>
        </div>
      </div>
    </div>
  );
}
