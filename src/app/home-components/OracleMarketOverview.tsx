'use client';

import { useState, useMemo, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
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
  Bar,
  ReferenceLine,
} from 'recharts';
import { TooltipProps, CustomLabelProps } from '@/types/ui/recharts';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart3,
  Table as TableIcon,
  Activity,
  DollarSign,
  Layers,
  Globe,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

// 专业配色方案
const COLORS = {
  chainlink: '#1E3A8A', // 深蓝
  pyth: '#3B82F6', // 亮蓝
  band: '#06B6D4', // 青色
  api3: '#8B5CF6', // 紫色
  uma: '#EC4899', // 粉色
  others: '#9CA3AF', // 灰色
};

const marketShareData = [
  { name: 'Chainlink', value: 65, color: COLORS.chainlink, tvs: '$42.1B', chains: 15 },
  { name: 'Pyth Network', value: 15, color: COLORS.pyth, tvs: '$15.2B', chains: 20 },
  { name: 'Band Protocol', value: 8, color: COLORS.band, tvs: '$4.1B', chains: 12 },
  { name: 'API3', value: 7, color: COLORS.api3, tvs: '$3.5B', chains: 10 },
  { name: 'UMA', value: 5, color: COLORS.uma, tvs: '$2.5B', chains: 8 },
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
  { name: 'Chainlink', chains: 15, color: COLORS.chainlink, protocols: 450 },
  { name: 'Pyth Network', chains: 20, color: COLORS.pyth, protocols: 280 },
  { name: 'Band Protocol', chains: 12, color: COLORS.band, protocols: 120 },
  { name: 'API3', chains: 10, color: COLORS.api3, protocols: 85 },
  { name: 'UMA', chains: 8, color: COLORS.uma, protocols: 45 },
];

const timeRanges = [
  { key: '1H', label: '1H' },
  { key: '24H', label: '24H' },
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: '90D', label: '90D' },
  { key: '1Y', label: '1Y' },
  { key: 'ALL', label: 'ALL' },
];

type ChartType = 'pie' | 'trend' | 'bar';
type ViewType = 'chart' | 'table';

interface MarketShareDataItem {
  name: string;
  value: number;
  color: string;
  tvs: string;
  chains: number;
  protocols?: number;
}

export default function OracleMarketOverview() {
  const { t, locale } = useI18n();
  const [selectedRange, setSelectedRange] = useState('30D');
  const [activeChart, setActiveChart] = useState<ChartType>('pie');
  const [viewType, setViewType] = useState<ViewType>('chart');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // 计算统计数据
  const stats = useMemo(() => {
    const totalTVS = marketShareData.reduce((acc, item) => {
      const tvsValue = parseFloat(item.tvs.replace(/[$B]/g, ''));
      return acc + tvsValue;
    }, 0);

    const totalChains = chainSupportData.reduce((acc, item) => acc + item.chains, 0);
    const totalProtocols = chainSupportData.reduce((acc, item) => acc + item.protocols, 0);
    const avgDominance = marketShareData[0]?.value || 0;

    return {
      totalTVS: `$${totalTVS.toFixed(1)}B`,
      totalChains,
      totalProtocols,
      avgDominance: `${avgDominance}%`,
      oracleCount: marketShareData.length,
    };
  }, []);

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: CustomLabelProps) => {
    if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || !percent) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<MarketShareDataItem>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">
                {entry.value}
                {activeChart === 'pie' ? '%' : activeChart === 'bar' ? ' chains' : 'B'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (viewType === 'table') {
      return renderTable();
    }

    switch (activeChart) {
      case 'pie':
        return (
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
              onMouseEnter={(_, index) => setHoveredItem(marketShareData[index]?.name)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(_, index) =>
                setSelectedItem(
                  marketShareData[index]?.name === selectedItem
                    ? null
                    : marketShareData[index]?.name
                )
              }
            >
              {marketShareData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={selectedItem === entry.name ? '#fff' : 'none'}
                  strokeWidth={selectedItem === entry.name ? 3 : 0}
                  opacity={hoveredItem && hoveredItem !== entry.name ? 0.6 : 1}
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );
      case 'trend':
        return (
          <LineChart data={tvsTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Line
              type="monotone"
              dataKey="chainlink"
              name="Chainlink"
              stroke={COLORS.chainlink}
              strokeWidth={hoveredItem === 'Chainlink' || !hoveredItem ? 3 : 2}
              dot={{ r: hoveredItem === 'Chainlink' ? 6 : 4, fill: COLORS.chainlink }}
              activeDot={{ r: 8 }}
              opacity={hoveredItem && hoveredItem !== 'Chainlink' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('Chainlink')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="pyth"
              name="Pyth Network"
              stroke={COLORS.pyth}
              strokeWidth={hoveredItem === 'Pyth Network' || !hoveredItem ? 3 : 2}
              dot={{ r: hoveredItem === 'Pyth Network' ? 6 : 4, fill: COLORS.pyth }}
              activeDot={{ r: 8 }}
              opacity={hoveredItem && hoveredItem !== 'Pyth Network' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('Pyth Network')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="band"
              name="Band Protocol"
              stroke={COLORS.band}
              strokeWidth={hoveredItem === 'Band Protocol' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'Band Protocol' ? 5 : 3, fill: COLORS.band }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'Band Protocol' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('Band Protocol')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="api3"
              name="API3"
              stroke={COLORS.api3}
              strokeWidth={hoveredItem === 'API3' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'API3' ? 5 : 3, fill: COLORS.api3 }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'API3' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('API3')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="uma"
              name="UMA"
              stroke={COLORS.uma}
              strokeWidth={hoveredItem === 'UMA' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'UMA' ? 5 : 3, fill: COLORS.uma }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'UMA' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('UMA')}
              onMouseLeave={() => setHoveredItem(null)}
            />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={chainSupportData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" stroke="#9ca3af" fontSize={12} />
            <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={100} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="chains"
              name="Supported Chains"
              radius={[0, 8, 8, 0]}
              onMouseEnter={(_, index) => setHoveredItem(chainSupportData[index]?.name)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(_, index) =>
                setSelectedItem(
                  chainSupportData[index]?.name === selectedItem
                    ? null
                    : chainSupportData[index]?.name
                )
              }
            >
              {chainSupportData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={hoveredItem && hoveredItem !== entry.name ? 0.5 : 1}
                  stroke={selectedItem === entry.name ? entry.color : 'none'}
                  strokeWidth={selectedItem === entry.name ? 2 : 0}
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                />
              ))}
            </Bar>
          </BarChart>
        );
      default:
        return null;
    }
  };

  const renderTable = () => {
    const data =
      activeChart === 'pie'
        ? marketShareData
        : activeChart === 'bar'
          ? chainSupportData
          : marketShareData;

    return (
      <div className="h-full overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {locale === 'zh-CN' ? '预言机' : 'Oracle'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {activeChart === 'pie'
                  ? locale === 'zh-CN'
                    ? '市场份额'
                    : 'Market Share'
                  : activeChart === 'bar'
                    ? locale === 'zh-CN'
                      ? '支持链数'
                      : 'Chains'
                    : locale === 'zh-CN'
                      ? 'TVS'
                      : 'TVS'}
              </th>
              {activeChart === 'bar' && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {locale === 'zh-CN' ? '协议数' : 'Protocols'}
                </th>
              )}
              {activeChart === 'pie' && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {locale === 'zh-CN' ? 'TVS' : 'TVS'}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item, index: number) => (
              <tr
                key={item.name}
                className={`hover:bg-blue-50 transition-colors cursor-pointer ${
                  selectedItem === item.name ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedItem(item.name === selectedItem ? null : item.name)}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-gray-900">
                    {activeChart === 'pie' ? `${'value' in item ? item.value : 0}%` : item.chains}
                  </span>
                </td>
                {activeChart === 'bar' && (
                  <td className="px-4 py-3 text-right">
                    <span className="text-gray-600">
                      {'protocols' in item ? item.protocols : 0}
                    </span>
                  </td>
                )}
                {activeChart === 'pie' && (
                  <td className="px-4 py-3 text-right">
                    <span className="text-gray-600">{'tvs' in item ? item.tvs : ''}</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getChartTitle = () => {
    switch (activeChart) {
      case 'pie':
        return locale === 'zh-CN' ? '市场份额分布' : 'Market Share Distribution';
      case 'trend':
        return locale === 'zh-CN' ? 'TVS 趋势分析' : 'TVS Trend Analysis';
      case 'bar':
        return locale === 'zh-CN' ? '链支持情况' : 'Chain Support Overview';
      default:
        return '';
    }
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
                {locale === 'zh-CN' ? '市场概览' : 'Market Overview'}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {locale === 'zh-CN' ? '预言机市场分析' : 'Oracle Market Analysis'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              {locale === 'zh-CN'
                ? '全面分析预言机市场份额、TVS趋势和链支持情况'
                : 'Comprehensive analysis of oracle market share, TVS trends and chain support'}
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto max-w-full">
            {timeRanges.map((range) => (
              <button
                key={range.key}
                onClick={() => setSelectedRange(range.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '总 TVS' : 'Total TVS'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalTVS}</div>
            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12.5%
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                <Globe className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '支持链数' : 'Total Chains'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalChains}</div>
            <div className="text-xs text-gray-500 mt-1">
              {locale === 'zh-CN' ? '跨链覆盖' : 'Cross-chain'}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-50 rounded-lg group-hover:bg-cyan-100 transition-colors">
                <Layers className="w-4 h-4 text-cyan-600" />
              </div>
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '协议数量' : 'Protocols'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalProtocols}+</div>
            <div className="text-xs text-gray-500 mt-1">
              {locale === 'zh-CN' ? '集成项目' : 'Integrations'}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-pink-50 rounded-lg group-hover:bg-pink-100 transition-colors">
                <Activity className="w-4 h-4 text-pink-600" />
              </div>
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '市场主导' : 'Dominance'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.avgDominance}</div>
            <div className="text-xs text-gray-500 mt-1">
              {locale === 'zh-CN' ? 'Chainlink 份额' : 'Chainlink Share'}
            </div>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          {/* Chart Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveChart('pie')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeChart === 'pie'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <PieChartIcon className="w-4 h-4" />
              {locale === 'zh-CN' ? '市场份额' : 'Market Share'}
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
              {locale === 'zh-CN' ? 'TVS趋势' : 'TVS Trend'}
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
              {locale === 'zh-CN' ? '链支持' : 'Chain Support'}
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewType('chart')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewType === 'chart'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <PieChartIcon className="w-4 h-4" />
              {locale === 'zh-CN' ? '图表' : 'Chart'}
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewType === 'table'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              {locale === 'zh-CN' ? '表格' : 'Table'}
            </button>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{getChartTitle()}</h3>
              {selectedItem && !isLoading && (
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {locale === 'zh-CN' ? '清除选择' : 'Clear Selection'}
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              )}
            </div>
            <div className={`${viewType === 'table' ? 'h-[360px]' : 'h-[400px]'}`}>
              {isLoading ? (
                <ChartSkeleton
                  height={viewType === 'table' ? 360 : 400}
                  variant={activeChart === 'pie' ? 'area' : activeChart === 'bar' ? 'bar' : 'price'}
                  showToolbar={false}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              )}
            </div>
            {!isLoading && viewType === 'chart' && (
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4" />
                {locale === 'zh-CN'
                  ? '悬停查看详情，点击选中项目'
                  : 'Hover for details, click to select'}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white">
              <div className="text-sm text-blue-100 mb-1">
                {locale === 'zh-CN' ? '选中时间范围' : 'Selected Time Range'}
              </div>
              <div className="text-2xl font-bold">{selectedRange}</div>
              <div className="text-xs text-blue-200 mt-1">
                {locale === 'zh-CN' ? '数据已更新' : 'Data updated'}
              </div>
            </div>

            {marketShareData.map((item) => (
              <div
                key={item.name}
                className={`bg-white rounded-xl border p-4 transition-all cursor-pointer group ${
                  selectedItem === item.name
                    ? 'border-blue-500 shadow-md ring-1 ring-blue-500'
                    : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
                } ${hoveredItem && hoveredItem !== item.name ? 'opacity-60' : 'opacity-100'}`}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => setSelectedItem(item.name === selectedItem ? null : item.name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{item.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: item.color,
                      width: `${item.value}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>TVS: {item.tvs}</span>
                  <span>{item.chains} chains</span>
                </div>
              </div>
            ))}

            {/* Summary Stats */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">
                {locale === 'zh-CN' ? '总市场份额' : 'Total Market Share'}
              </div>
              <div className="text-2xl font-bold text-gray-900">100%</div>
              <div className="text-xs text-gray-500 mt-1">
                {locale === 'zh-CN'
                  ? `覆盖 ${stats.oracleCount} 个主要预言机`
                  : `Covering ${stats.oracleCount} major oracles`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
