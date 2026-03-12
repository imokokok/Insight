'use client';

import { useI18n } from '@/lib/i18n/context';
import { useMarketOverviewData } from './useMarketOverviewData';
import { REFRESH_OPTIONS, CHAIN_SUPPORT_DATA } from './constants';
import { ChartType, ViewType, TIME_RANGES } from './types';
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
  Legend,
} from 'recharts';
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
  RefreshCw,
  Download,
  Clock,
  Shield,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import Link from 'next/link';

export default function MarketOverviewPage() {
  const { t, locale } = useI18n();
  const data = useMarketOverviewData();

  const {
    oracleData,
    assets,
    trendData,
    marketStats,
    loading,
    lastUpdated,
    selectedTimeRange,
    setSelectedTimeRange,
    activeChart,
    setActiveChart,
    viewType,
    setViewType,
    hoveredItem,
    setHoveredItem,
    selectedItem,
    setSelectedItem,
    refreshInterval,
    setRefreshInterval,
    refreshStatus,
    showRefreshSuccess,
    fetchData,
    exportToCSV,
    exportToJSON,
    sortedOracleData,
    topGainers,
    topLosers,
    totalTVS,
    totalChains,
    totalProtocols,
  } = data;

  // 自定义Tooltip组件
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">
                {activeChart === 'pie'
                  ? `${entry.value}%`
                  : activeChart === 'bar'
                  ? `${entry.value} chains`
                  : `$${entry.value}B`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // 渲染图表
  const renderChart = () => {
    if (viewType === 'table') {
      return renderTable();
    }

    switch (activeChart) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={sortedOracleData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={120}
              innerRadius={70}
              fill="#8884d8"
              dataKey="share"
              paddingAngle={2}
              onMouseEnter={(_, index) =>
                setHoveredItem(sortedOracleData[index]?.name)
              }
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(_, index) => {
                const name = sortedOracleData[index]?.name;
                setSelectedItem(name === selectedItem ? null : name);
              }}
            >
              {sortedOracleData.map((entry, index) => (
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
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickFormatter={(v) => `$${v}B`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="chainlink"
              name="Chainlink"
              stroke="#375BD2"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="pyth"
              name="Pyth Network"
              stroke="#E6B800"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="band"
              name="Band Protocol"
              stroke="#516BEB"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="api3"
              name="API3"
              stroke="#7CE3CB"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="uma"
              name="UMA"
              stroke="#FF4A8D"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={CHAIN_SUPPORT_DATA} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f3f4f6"
              horizontal={false}
            />
            <XAxis type="number" stroke="#9ca3af" fontSize={12} />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#9ca3af"
              fontSize={12}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="chains" name="Supported Chains" radius={[0, 4, 4, 0]}>
              {CHAIN_SUPPORT_DATA.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        );
      default:
        return null;
    }
  };

  // 渲染表格视图
  const renderTable = () => {
    const data =
      activeChart === 'pie'
        ? sortedOracleData
        : activeChart === 'bar'
        ? CHAIN_SUPPORT_DATA
        : sortedOracleData;

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
                <>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    TVS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {locale === 'zh-CN' ? '24h变化' : '24h Change'}
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item: any, index: number) => (
              <tr
                key={item.name}
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedItem === item.name ? 'bg-blue-50' : ''
                }`}
                onClick={() =>
                  setSelectedItem(
                    item.name === selectedItem ? null : item.name
                  )
                }
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-gray-900">
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-gray-900">
                    {activeChart === 'pie'
                      ? `${item.share}%`
                      : item.chains}
                  </span>
                </td>
                {activeChart === 'bar' && (
                  <td className="px-4 py-3 text-right">
                    <span className="text-gray-600">{item.protocols}</span>
                  </td>
                )}
                {activeChart === 'pie' && (
                  <>
                    <td className="px-4 py-3 text-right">
                      <span className="text-gray-600">{item.tvs}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          item.change24h >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {item.change24h >= 0 ? '+' : ''}
                        {item.change24h.toFixed(2)}%
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 获取图表标题
  const getChartTitle = () => {
    switch (activeChart) {
      case 'pie':
        return locale === 'zh-CN'
          ? '市场份额分布'
          : 'Market Share Distribution';
      case 'trend':
        return locale === 'zh-CN' ? 'TVS 趋势分析' : 'TVS Trend Analysis';
      case 'bar':
        return locale === 'zh-CN' ? '链支持情况' : 'Chain Support Overview';
      default:
        return '';
    }
  };

  // 格式化价格
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 4 : 2,
    }).format(price);
  };

  // 格式化大数字
  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑导航 */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            {locale === 'zh-CN' ? '首页' : 'Home'}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">
            {locale === 'zh-CN' ? '市场概览' : 'Market Overview'}
          </span>
        </nav>

        {/* 页面标题和操作栏 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {locale === 'zh-CN' ? '市场概览' : 'Market Overview'}
            </h1>
            <p className="mt-2 text-gray-600">
              {locale === 'zh-CN'
                ? '全面分析预言机市场份额、TVS趋势和链支持情况'
                : 'Comprehensive analysis of oracle market share, TVS trends and chain support'}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 导出按钮 */}
            <div className="flex items-center gap-1">
              <button
                onClick={exportToCSV}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={exportToJSON}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                JSON
              </button>
            </div>

            {/* 自动刷新选择 */}
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
              <Clock className="w-4 h-4 text-gray-500" />
              <select
                value={refreshInterval}
                onChange={(e) =>
                  setRefreshInterval(Number(e.target.value) as 0 | 30000 | 60000 | 300000)
                }
                className="text-sm bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {REFRESH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 刷新按钮 */}
            <button
              onClick={fetchData}
              disabled={refreshStatus === 'refreshing'}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white transition-colors ${
                refreshStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : refreshStatus === 'success' && showRefreshSuccess
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-900 hover:bg-gray-800'
              } disabled:opacity-50`}
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  refreshStatus === 'refreshing' ? 'animate-spin' : ''
                }`}
              />
              {refreshStatus === 'refreshing'
                ? locale === 'zh-CN'
                  ? '刷新中...'
                  : 'Refreshing...'
                : showRefreshSuccess
                ? locale === 'zh-CN'
                  ? '已更新'
                  : 'Updated'
                : locale === 'zh-CN'
                ? '刷新'
                : 'Refresh'}
            </button>

            {lastUpdated && (
              <span className="text-xs text-gray-400">
                {locale === 'zh-CN' ? '更新于 ' : 'Updated '}
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* 关键指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {/* 总TVS */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '总 TVS' : 'Total TVS'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalTVS}</div>
            <div
              className={`text-xs mt-1 flex items-center gap-1 ${
                marketStats.change24h >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {marketStats.change24h >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {marketStats.change24h >= 0 ? '+' : ''}
              {marketStats.change24h.toFixed(2)}%
            </div>
          </div>

          {/* 支持链数 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Globe className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '支持链数' : 'Total Chains'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalChains}</div>
            <div className="text-xs text-gray-500 mt-1">
              {locale === 'zh-CN' ? '跨链覆盖' : 'Cross-chain'}
            </div>
          </div>

          {/* 协议数量 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <Layers className="w-4 h-4 text-cyan-600" />
              </div>
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '协议数量' : 'Protocols'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalProtocols}+
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {locale === 'zh-CN' ? '集成项目' : 'Integrations'}
            </div>
          </div>

          {/* 市场主导 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-pink-50 rounded-lg">
                <Activity className="w-4 h-4 text-pink-600" />
              </div>
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '市场主导' : 'Dominance'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {marketStats.marketDominance}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Chainlink</div>
          </div>

          {/* 平均延迟 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Zap className="w-4 h-4 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '平均延迟' : 'Avg Latency'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {marketStats.avgUpdateLatency}ms
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {locale === 'zh-CN' ? '更新速度' : 'Update Speed'}
            </div>
          </div>

          {/* 预言机数量 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '预言机数' : 'Oracles'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {marketStats.oracleCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {locale === 'zh-CN' ? '活跃服务' : 'Active Services'}
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="space-y-6">
          {/* 图表控制栏 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4">
            {/* 图表类型切换 */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveChart('pie')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeChart === 'pie'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <PieChartIcon className="w-4 h-4" />
                {locale === 'zh-CN' ? '市场份额' : 'Market Share'}
              </button>
              <button
                onClick={() => setActiveChart('trend')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeChart === 'trend'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                {locale === 'zh-CN' ? 'TVS趋势' : 'TVS Trend'}
              </button>
              <button
                onClick={() => setActiveChart('bar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeChart === 'bar'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                {locale === 'zh-CN' ? '链支持' : 'Chain Support'}
              </button>
            </div>

            {/* 时间范围选择 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '时间范围:' : 'Time Range:'}
              </span>
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.key}
                    onClick={() => setSelectedTimeRange(range.key)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      selectedTimeRange === range.key
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 视图切换 */}
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

          {/* 图表和详情区 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 主图表 */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getChartTitle()}
                </h3>
                {selectedItem && (
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {locale === 'zh-CN' ? '清除选择' : 'Clear Selection'}
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </button>
                )}
              </div>

              {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin rounded-full" />
                    <span className="text-gray-500 text-sm">
                      {locale === 'zh-CN' ? '加载中...' : 'Loading...'}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`${
                      viewType === 'table' ? 'h-[360px]' : 'h-[400px]'
                    }`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      {renderChart()}
                    </ResponsiveContainer>
                  </div>
                  {viewType === 'chart' && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                      <Info className="w-4 h-4" />
                      {locale === 'zh-CN'
                        ? '悬停查看详情，点击选中项目'
                        : 'Hover for details, click to select'}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 详情卡片 */}
            <div className="space-y-4">
              {/* 选中时间范围 */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white">
                <div className="text-sm text-blue-100 mb-1">
                  {locale === 'zh-CN' ? '选中时间范围' : 'Selected Time Range'}
                </div>
                <div className="text-2xl font-bold">{selectedTimeRange}</div>
                <div className="text-xs text-blue-200 mt-1">
                  {locale === 'zh-CN' ? '数据已更新' : 'Data updated'}
                </div>
              </div>

              {/* 预言机详情卡片 */}
              {sortedOracleData.map((item) => (
                <Link
                  key={item.name}
                  href={`/${item.name.toLowerCase().replace(' ', '-')}`}
                  className={`block bg-white rounded-xl border p-4 transition-all cursor-pointer group hover:shadow-md ${
                    selectedItem === item.name
                      ? 'border-blue-500 shadow-md ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    hoveredItem && hoveredItem !== item.name
                      ? 'opacity-60'
                      : 'opacity-100'
                  }`}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={(e) => {
                    if (selectedItem === item.name) {
                      setSelectedItem(null);
                    } else {
                      setSelectedItem(item.name);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-gray-900">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        {item.share}%
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: item.color,
                        width: `${item.share}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <div>
                      <span className="block text-gray-400">TVS</span>
                      <span className="font-medium text-gray-700">
                        {item.tvs}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-400">
                        {locale === 'zh-CN' ? '链' : 'Chains'}
                      </span>
                      <span className="font-medium text-gray-700">
                        {item.chains}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-400">24h</span>
                      <span
                        className={`font-medium ${
                          item.change24h >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {item.change24h >= 0 ? '+' : ''}
                        {item.change24h.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </Link>
              ))}

              {/* 总市场份额 */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-1">
                  {locale === 'zh-CN' ? '总市场份额' : 'Total Market Share'}
                </div>
                <div className="text-2xl font-bold text-gray-900">100%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {locale === 'zh-CN'
                    ? `覆盖 ${marketStats.oracleCount} 个主要预言机`
                    : `Covering ${marketStats.oracleCount} major oracles`}
                </div>
              </div>
            </div>
          </div>

          {/* 资产列表 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {locale === 'zh-CN' ? '热门资产' : 'Top Assets'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '资产' : 'Asset'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '价格' : 'Price'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '24h变化' : '24h Change'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '7d变化' : '7d Change'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '24h成交量' : '24h Volume'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {locale === 'zh-CN' ? '主要预言机' : 'Primary Oracle'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assets.map((asset) => (
                    <tr
                      key={asset.symbol}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">
                            {asset.symbol}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatNumber(asset.marketCap)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-gray-900">
                          {formatPrice(asset.price)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-medium ${
                            asset.change24h >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {asset.change24h >= 0 ? '+' : ''}
                          {asset.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-medium ${
                            asset.change7d >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {asset.change7d >= 0 ? '+' : ''}
                          {asset.change7d.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-gray-600">
                          ${formatNumber(asset.volume24h)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {asset.primaryOracle}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
