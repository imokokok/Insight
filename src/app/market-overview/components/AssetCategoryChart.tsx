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
import { useI18n } from '@/lib/i18n/provider';
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
  const { locale } = useI18n();
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'radar'>('pie');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const CustomTooltip = ({ active, payload }: TooltipProps<AssetCategory>) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as AssetCategory;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[220px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-semibold text-gray-900">{item.label}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{locale === 'zh-CN' ? 'TVS' : 'TVS'}:</span>
              <span className="font-medium">${(item.value / 1e9).toFixed(1)}B</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{locale === 'zh-CN' ? '份额' : 'Share'}:</span>
              <span className="font-medium">{item.share.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{locale === 'zh-CN' ? '资产数' : 'Assets'}:</span>
              <span className="font-medium">{item.assets.length}</span>
            </div>
            <div className="pt-1 border-t border-gray-100 mt-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {locale === 'zh-CN' ? '波动率' : 'Volatility'}:
                </span>
                <span className="font-medium text-gray-600">{item.avgVolatility.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  {locale === 'zh-CN' ? '流动性' : 'Liquidity'}:
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
          <PieChartIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {locale === 'zh-CN' ? '暂无资产类别数据' : 'No asset category data available'}
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
                {locale === 'zh-CN' ? '类别' : 'Category'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                TVS
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '份额' : 'Share'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '资产数' : 'Assets'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '波动率' : 'Volatility'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '流动性' : 'Liquidity'}
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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-gray-900">{item.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium text-gray-900">
                    ${(item.value / 1e9).toFixed(1)}B
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-gray-600">{item.share.toFixed(1)}%</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-gray-600">{item.assets.length}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-gray-600">{item.avgVolatility.toFixed(1)}%</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-gray-600">{item.avgLiquidity.toFixed(1)}%</span>
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
            <PieChartIcon className="w-4 h-4 inline mr-1" />
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
            <BarChart3 className="w-4 h-4 inline mr-1" />
            {locale === 'zh-CN' ? '柱状图' : 'Bar'}
          </button>
          <button
            onClick={() => setChartType('radar')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              chartType === 'radar'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-1" />
            {locale === 'zh-CN' ? '雷达图' : 'Radar'}
          </button>
        </div>
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
                  stroke={selectedItem === entry.category ? chartColors.recharts.primary : 'transparent'}
                  strokeWidth={selectedItem === entry.category ? 3 : 0}
                  opacity={hoveredItem && hoveredItem !== entry.category ? 0.6 : 1}
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          ) : chartType === 'bar' ? (
            <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} horizontal={false} />
              <XAxis type="number" stroke={chartColors.recharts.axis} fontSize={12} />
              <YAxis dataKey="label" type="category" stroke={chartColors.recharts.axis} fontSize={11} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="share"
                name="Share %"
                radius={[0, 4, 4, 0]}
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
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs">
                        <p className="font-medium mb-1">{payload[0].payload.category}</p>
                        {payload.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {data.map((item) => (
          <button
            key={item.category}
            onClick={() => setSelectedItem(item.category === selectedItem ? null : item.category)}
            className={`flex items-center gap-2 p-2 rounded-lg transition-all text-left ${
              selectedItem === item.category
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{item.label}</div>
              <div className="text-xs text-gray-500">
                {item.share.toFixed(1)}% • {item.assets.length}{' '}
                {locale === 'zh-CN' ? '资产' : 'assets'}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
            <TrendingUp className="w-3 h-3" />
            {locale === 'zh-CN' ? '平均波动率' : 'Avg Volatility'}
          </div>
          <div className="font-semibold text-gray-900">
            {(data.reduce((sum, d) => sum + d.avgVolatility, 0) / data.length).toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
            <Droplets className="w-3 h-3" />
            {locale === 'zh-CN' ? '平均流动性' : 'Avg Liquidity'}
          </div>
          <div className="font-semibold text-gray-900">
            {(data.reduce((sum, d) => sum + d.avgLiquidity, 0) / data.length).toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
            <Zap className="w-3 h-3" />
            {locale === 'zh-CN' ? '总类别' : 'Categories'}
          </div>
          <div className="font-semibold text-gray-900">{data.length}</div>
        </div>
      </div>
    </div>
  );
}
