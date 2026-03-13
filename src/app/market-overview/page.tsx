'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useI18n } from '@/lib/i18n/provider';
import { useMarketOverviewData } from './useMarketOverviewData';
import { REFRESH_OPTIONS, CHAIN_SUPPORT_DATA } from './constants';
import { ChartType, ViewType, TIME_RANGES } from './types';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { formatCompactNumber } from '@/lib/utils/format';
import { chartColors } from '@/lib/config/colors';
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
  Brush,
  ReferenceDot,
  Area,
} from 'recharts';
import { Image as ImageIcon } from 'lucide-react';
import { TooltipProps } from '@/lib/types/recharts';
import { OracleMarketData, TVSTrendData } from './types';
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
  Network,
  Building2,
  PieChart as PieChartIcon2,
  GitCompare,
  Target,
  ActivitySquare,
  Link2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import ChainBreakdownChart from './components/ChainBreakdownChart';
import ProtocolList from './components/ProtocolList';
import AssetCategoryChart from './components/AssetCategoryChart';
import OracleComparison from './components/OracleComparison';
import BenchmarkComparison from './components/BenchmarkComparison';
import CorrelationMatrix from './components/CorrelationMatrix';
import RiskDashboard from './components/RiskDashboard';
import AnomalyAlert from './components/AnomalyAlert';
import RealtimeIndicator from './components/RealtimeIndicator';
import PriceAlertConfig from './components/PriceAlertConfig';
import ExportConfigComponent from './components/ExportConfig';
import ScheduledExportConfig from './components/ScheduledExportConfig';
import { ExportConfig } from '@/lib/export/exportConfig';
import { ScheduledExportTask } from '@/lib/export/scheduledExport';
import { exportWithConfig, downloadExport } from '@/lib/services/marketData';

export default function MarketOverviewPage() {
  const { t, locale } = useI18n();
  const data = useMarketOverviewData();

  // 图表容器 ref，用于导出图片
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // 移动端检测
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 图表类型配置
  const chartTypes = [
    { key: 'pie', label: locale === 'zh-CN' ? '市场份额' : 'Market Share', icon: PieChartIcon },
    { key: 'trend', label: locale === 'zh-CN' ? 'TVS趋势' : 'TVS Trend', icon: TrendingUp },
    { key: 'bar', label: locale === 'zh-CN' ? '链支持' : 'Chain Support', icon: BarChart3 },
    { key: 'chain', label: locale === 'zh-CN' ? '链分布' : 'Chain Breakdown', icon: Network },
    { key: 'protocol', label: locale === 'zh-CN' ? '协议' : 'Protocols', icon: Building2 },
    {
      key: 'asset',
      label: locale === 'zh-CN' ? '资产类别' : 'Asset Categories',
      icon: PieChartIcon2,
    },
    {
      key: 'comparison',
      label: locale === 'zh-CN' ? '多预言机对比' : 'Oracle Comparison',
      icon: GitCompare,
    },
    { key: 'benchmark', label: locale === 'zh-CN' ? '行业基准' : 'Benchmark', icon: Target },
    {
      key: 'correlation',
      label: locale === 'zh-CN' ? '相关性' : 'Correlation',
      icon: ActivitySquare,
    },
  ];

  // 时间轴缩放状态
  const [zoomRange, setZoomRange] = useState<{ startIndex?: number; endIndex?: number } | null>(
    null
  );

  // 异常检测配置和状态
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(0.1); // 默认10%
  const [selectedAnomaly, setSelectedAnomaly] = useState<{
    dataKey: string;
    date: string;
    value: number;
    prevValue: number;
    changeRate: number;
  } | null>(null);

  // 图表联动状态
  const [linkedOracle, setLinkedOracle] = useState<{ primary: string; secondary: string } | null>(
    null
  );

  // 对比模式状态
  const [comparisonMode, setComparisonMode] = useState<'none' | 'yoy' | 'mom'>('none');
  const [comparisonTimeRange, setComparisonTimeRange] = useState<string>('7d');
  const [trendComparisonData, setTrendComparisonData] = useState<TVSTrendData[]>([]);
  const [showComparisonSelector, setShowComparisonSelector] = useState(false);

  // 置信区间显示状态
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(false);

  const {
    oracleData,
    assets,
    trendData,
    marketStats,
    chainBreakdown,
    protocolDetails,
    assetCategories,
    comparisonData,
    benchmarkData,
    correlationData,
    riskMetrics,
    anomalies,
    loading,
    loadingEnhanced,
    loadingComparison,
    loadingRiskMetrics,
    loadingAnomalies,
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
    acknowledgeAnomaly,

    // WebSocket
    wsStatus,
    wsLastUpdated,
    wsReconnect,
    wsMessageCount,
    wsConnectedChannels,

    // 价格预警
    priceAlerts,
    alertHistory,
    addPriceAlert,
    removePriceAlert,
    togglePriceAlert,
    acknowledgeAlertHistory,
    clearAlertHistory,
    requestNotificationPermission,
    hasNotificationPermission,
  } = data;

  // 自定义Tooltip组件
  const CustomTooltip = ({ active, payload, label }: TooltipProps<OracleMarketData>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
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

  // 异常检测函数
  const detectAnomalies = (data: TVSTrendData[], dataKey: string, threshold: number = 0.1) => {
    return data
      .map((item, index) => {
        if (index === 0) return null;
        const prev = data[index - 1];
        const currentValue = item[dataKey as keyof TVSTrendData] as number;
        const prevValue = prev[dataKey as keyof TVSTrendData] as number;
        if (prevValue === 0) return null;
        const change = Math.abs((currentValue - prevValue) / prevValue);
        if (change > threshold) {
          return {
            index,
            date: item.date,
            value: currentValue,
            prevValue,
            changeRate: change,
            dataKey,
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  };

  // 对比数据准备函数
  const prepareComparisonData = (currentData: TVSTrendData[], compareData: TVSTrendData[]) => {
    return currentData.map((item, index) => {
      const compareItem = compareData[index];
      const result: any = { ...item };

      // 为每个预言机添加对比值和差异
      ['chainlink', 'pyth', 'band', 'api3', 'uma'].forEach((key) => {
        const currentValue = item[key as keyof TVSTrendData] as number;
        const compareValue = compareItem?.[key as keyof TVSTrendData] as number;
        result[`${key}Compare`] = compareValue || 0;
        result[`${key}Diff`] = currentValue - (compareValue || 0);
        result[`${key}DiffPercent`] = compareValue
          ? ((currentValue - compareValue) / compareValue) * 100
          : 0;
      });

      return result;
    });
  };

  // 生成模拟对比数据（实际项目中应从API获取）
  const generateComparisonData = (
    baseData: TVSTrendData[],
    mode: 'yoy' | 'mom'
  ): TVSTrendData[] => {
    return baseData.map((item) => {
      const variance = mode === 'yoy' ? 0.15 : 0.08; // 同比变化更大
      return {
        ...item,
        chainlink: item.chainlink * (1 + (Math.random() - 0.5) * variance),
        pyth: item.pyth * (1 + (Math.random() - 0.5) * variance),
        band: item.band * (1 + (Math.random() - 0.5) * variance),
        api3: item.api3 * (1 + (Math.random() - 0.5) * variance),
        uma: item.uma * (1 + (Math.random() - 0.5) * variance),
      };
    });
  };

  // 切换对比模式
  const toggleComparisonMode = (mode: 'yoy' | 'mom') => {
    if (comparisonMode === mode) {
      setComparisonMode('none');
      setTrendComparisonData([]);
    } else {
      setComparisonMode(mode);
      const newComparisonData = generateComparisonData(trendData, mode);
      setTrendComparisonData(newComparisonData);
    }
  };

  // 判断单元格是否高亮（图表联动功能）
  const isCellHighlighted = (name: string) => {
    if (!linkedOracle) return true;
    return name === linkedOracle.primary || name === linkedOracle.secondary;
  };

  const isLineHighlighted = (name: string) => {
    if (!linkedOracle) return true;
    return name === linkedOracle.primary || name === linkedOracle.secondary;
  };

  // 渲染图表
  const renderChart = () => {
    if (viewType === 'table' && !['chain', 'protocol', 'asset'].includes(activeChart)) {
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
              fill={chartColors.pie.default}
              dataKey="share"
              paddingAngle={2}
              onMouseEnter={(_, index) => setHoveredItem(sortedOracleData[index]?.name)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(_, index) => {
                const name = sortedOracleData[index]?.name;
                setSelectedItem(name === selectedItem ? null : name);
              }}
            >
              {sortedOracleData.map((entry, index) => {
                const isHighlighted = isCellHighlighted(entry.name);
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={
                      selectedItem === entry.name
                        ? chartColors.pie.stroke.selected
                        : chartColors.pie.stroke.none
                    }
                    strokeWidth={selectedItem === entry.name ? 3 : 0}
                    opacity={!linkedOracle ? (hoveredItem && hoveredItem !== entry.name ? 0.6 : 1) : (isHighlighted ? 1 : 0.2)}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );
      case 'trend': {
        const oracleKeys = ['chainlink', 'pyth', 'band', 'api3', 'uma'];
        const oracleColors: Record<string, string> = {
          chainlink: chartColors.marketOverview.chainlink,
          pyth: chartColors.marketOverview.pyth,
          band: chartColors.marketOverview.band,
          api3: chartColors.marketOverview.api3,
          uma: chartColors.marketOverview.uma,
        };
        const oracleNames: Record<string, string> = {
          chainlink: 'Chainlink',
          pyth: 'Pyth Network',
          band: 'Band Protocol',
          api3: 'API3',
          uma: 'UMA',
        };
        // 从外部作用域读取 showConfidenceInterval
        const showCI = showConfidenceInterval;

        // 对比模式下的数据准备
        const chartData =
          comparisonMode !== 'none' && trendComparisonData.length > 0
            ? prepareComparisonData(trendData, trendComparisonData)
            : trendData;

        // 对比模式下的自定义Tooltip
        const ComparisonTooltip = ({ active, payload, label }: TooltipProps<any>) => {
          if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
                <p className="font-medium text-gray-900 mb-2">{label}</p>
                {comparisonMode !== 'none' ? (
                  <div className="space-y-2">
                    {oracleKeys.map((key) => {
                      const currentValue = data[key] as number;
                      const compareValue = data[`${key}Compare`] as number;
                      const diffPercent = data[`${key}DiffPercent`] as number;
                      return (
                        <div key={key} className="text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: oracleColors[key] }}
                            />
                            <span className="text-gray-600">{oracleNames[key]}:</span>
                          </div>
                          <div className="ml-5 mt-1 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                {locale === 'zh-CN' ? '当期' : 'Current'}:
                              </span>
                              <span className="font-medium">${currentValue?.toFixed(2)}B</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                {comparisonMode === 'yoy'
                                  ? locale === 'zh-CN'
                                    ? '同比'
                                    : 'YoY'
                                  : locale === 'zh-CN'
                                    ? '环比'
                                    : 'MoM'}
                                :
                              </span>
                              <span className="font-medium text-gray-600">
                                ${compareValue?.toFixed(2)}B
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                {locale === 'zh-CN' ? '变化' : 'Change'}:
                              </span>
                              <span
                                className={`font-medium ${diffPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {diffPercent >= 0 ? '+' : ''}
                                {diffPercent?.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  payload.map((entry, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-gray-600">{entry.name}:</span>
                      <span className="font-medium text-gray-900">${entry.value}B</span>
                    </div>
                  ))
                )}
              </div>
            );
          }
          return null;
        };

        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.lineChart.grid} />
            <XAxis dataKey="date" stroke={chartColors.lineChart.axis} fontSize={12} />
            <YAxis
              stroke={chartColors.lineChart.axis}
              fontSize={12}
              tickFormatter={(v) => `$${v}B`}
            />
            <Tooltip content={<ComparisonTooltip />} />
            <Legend />
            {oracleKeys.map((key) => {
              const isHighlighted = isLineHighlighted(oracleNames[key]);
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={oracleNames[key]}
                  stroke={oracleColors[key]}
                  strokeWidth={comparisonMode !== 'none' ? 3 : (isHighlighted ? 3 : 1)}
                  dot={false}
                  activeDot={{ r: comparisonMode !== 'none' ? 6 : 4 }}
                  opacity={!linkedOracle ? 1 : (isHighlighted ? 1 : 0.2)}
                  strokeDasharray={!isHighlighted && linkedOracle ? '3 3' : undefined}
                />
              );
            })}
            {/* 置信区间区域 */}
            {showCI &&
              comparisonMode === 'none' &&
              oracleKeys.map((key) => (
                <Area
                  key={`${key}-confidence`}
                  type="monotone"
                  dataKey={`${key}Upper`}
                  stroke="none"
                  fill={oracleColors[key]}
                  fillOpacity={0.15}
                  isAnimationActive={false}
                />
              ))}
            {showCI &&
              comparisonMode === 'none' &&
              oracleKeys.map((key) => (
                <Area
                  key={`${key}-confidence-lower`}
                  type="monotone"
                  dataKey={`${key}Lower`}
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
              ))}
            {/* 对比期线条（虚线） */}
            {comparisonMode !== 'none' &&
              trendComparisonData.length > 0 &&
              oracleKeys.map((key) => (
                <Line
                  key={`${key}-compare`}
                  type="monotone"
                  dataKey={`${key}Compare`}
                  name={`${oracleNames[key]} ${comparisonMode === 'yoy' ? (locale === 'zh-CN' ? '(同比)' : '(YoY)') : locale === 'zh-CN' ? '(环比)' : '(MoM)'}`}
                  stroke={oracleColors[key]}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  opacity={0.7}
                />
              ))}
            {oracleKeys.map((key) =>
              detectAnomalies(trendData, key, anomalyThreshold).map((anomaly, idx) => (
                <ReferenceDot
                  key={`${key}-anomaly-${idx}`}
                  x={anomaly.date}
                  y={anomaly.value}
                  r={6}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth={2}
                  onClick={() =>
                    setSelectedAnomaly({
                      dataKey: oracleNames[key],
                      date: anomaly.date,
                      value: anomaly.value,
                      prevValue: anomaly.prevValue,
                      changeRate: anomaly.changeRate,
                    })
                  }
                />
              ))
            )}
            <Brush
              dataKey="date"
              height={30}
              stroke="#8884d8"
              startIndex={zoomRange?.startIndex}
              endIndex={zoomRange?.endIndex}
              onChange={(range) => setZoomRange(range)}
            />
          </LineChart>
        );
      }
      case 'bar':
        return (
          <BarChart data={CHAIN_SUPPORT_DATA} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.lineChart.grid}
              horizontal={false}
            />
            <XAxis type="number" stroke={chartColors.lineChart.axis} fontSize={12} />
            <YAxis
              dataKey="name"
              type="category"
              stroke={chartColors.lineChart.axis}
              fontSize={12}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="chains" name="Supported Chains" radius={[0, 4, 4, 0]}>
              {CHAIN_SUPPORT_DATA.map((entry, index) => {
                const isHighlighted = isCellHighlighted(entry.name);
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    opacity={!linkedOracle ? 1 : (isHighlighted ? 1 : 0.3)}
                  />
                );
              })}
            </Bar>
          </BarChart>
        );
      case 'chain':
        return (
          <ChainBreakdownChart
            data={chainBreakdown}
            loading={loadingEnhanced}
            viewType={viewType}
          />
        );
      case 'protocol':
        return <ProtocolList data={protocolDetails} loading={loadingEnhanced} />;
      case 'asset':
        return (
          <AssetCategoryChart
            data={assetCategories}
            loading={loadingEnhanced}
            viewType={viewType}
          />
        );
      case 'comparison':
        return <OracleComparison data={comparisonData} loading={loadingComparison} />;
      case 'benchmark':
        return <BenchmarkComparison data={benchmarkData} loading={loadingComparison} />;
      case 'correlation':
        return <CorrelationMatrix data={correlationData} loading={loadingComparison} onCellClick={(primary, secondary) => setLinkedOracle({ primary, secondary })} linkedOracle={linkedOracle} />;
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
            {data.map((item, index: number) => (
              <tr
                key={item.name}
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
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
                    {activeChart === 'pie' ? `${item.share}%` : item.chains}
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
                      <span className="text-gray-600">{item.tvs ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          (item.change24h ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {(item.change24h ?? 0) >= 0 ? '+' : ''}
                        {(item.change24h ?? 0).toFixed(2)}%
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
        return locale === 'zh-CN' ? '市场份额分布' : 'Market Share Distribution';
      case 'trend':
        return locale === 'zh-CN' ? 'TVS 趋势分析' : 'TVS Trend Analysis';
      case 'bar':
        return locale === 'zh-CN' ? '链支持情况' : 'Chain Support Overview';
      case 'chain':
        return locale === 'zh-CN' ? '链级别 TVS 分布' : 'Chain TVS Breakdown';
      case 'protocol':
        return locale === 'zh-CN' ? '协议列表' : 'Protocol List';
      case 'asset':
        return locale === 'zh-CN' ? '资产类别分析' : 'Asset Category Analysis';
      case 'comparison':
        return locale === 'zh-CN' ? '多预言机对比分析' : 'Multi-Oracle Comparison';
      case 'benchmark':
        return locale === 'zh-CN' ? '行业基准对比' : 'Industry Benchmark Comparison';
      case 'correlation':
        return locale === 'zh-CN' ? 'TVS 相关性分析' : 'TVS Correlation Analysis';
      default:
        return '';
    }
  };

  // 导出图表为 PNG 图片
  const exportChartToImage = async () => {
    if (!chartContainerRef.current) return;

    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // 创建新的 canvas 添加标题和时间戳
      const title = getChartTitle();
      const timestamp = new Date().toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US');

      const finalCanvas = document.createElement('canvas');
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      const padding = 20;
      const titleHeight = 40;
      const timestampHeight = 24;
      const extraHeight = titleHeight + timestampHeight + padding * 2;

      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height + extraHeight;

      // 填充白色背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // 绘制标题
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'left';
      ctx.fillText(title, padding, padding + 24);

      // 绘制时间戳
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(
        locale === 'zh-CN' ? `导出时间: ${timestamp}` : `Exported: ${timestamp}`,
        padding,
        padding + titleHeight + 16
      );

      // 绘制原图表
      ctx.drawImage(canvas, 0, extraHeight);

      // 下载图片
      const link = document.createElement('a');
      const fileName = `market-overview-${activeChart}-${Date.now()}.png`;
      link.download = fileName;
      link.href = finalCanvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('导出图片失败:', error);
      alert(
        locale === 'zh-CN' ? '导出图片失败，请重试' : 'Failed to export image, please try again'
      );
    }
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
            {/* 导出按钮组 */}
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
              <button
                onClick={exportChartToImage}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title={locale === 'zh-CN' ? '导出为 PNG 图片' : 'Export as PNG image'}
              >
                <ImageIcon className="w-4 h-4" />
                {locale === 'zh-CN' ? '图片' : 'Image'}
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
                className={`w-4 h-4 ${refreshStatus === 'refreshing' ? 'animate-spin' : ''}`}
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

            {/* 实时状态指示器 */}
            <RealtimeIndicator
              status={wsStatus}
              lastUpdated={wsLastUpdated}
              onReconnect={wsReconnect}
              connectedChannels={wsConnectedChannels}
              messageCount={wsMessageCount}
            />
          </div>
        </div>

        {/* 关键指标统计栏 - 简洁横向布局 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* TVS */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {locale === 'zh-CN' ? '总 TVS' : 'Total TVS'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">{totalTVS}</span>
                  <span
                    className={`text-xs ${marketStats.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {marketStats.change24h >= 0 ? '+' : ''}
                    {marketStats.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="w-px h-10 bg-gray-200 hidden sm:block" />

            {/* 支持链数 */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {locale === 'zh-CN' ? '支持链数' : 'Chains'}
                </p>
                <p className="text-lg font-bold text-gray-900">{totalChains}</p>
              </div>
            </div>

            <div className="w-px h-10 bg-gray-200 hidden sm:block" />

            {/* 协议数量 */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <Layers className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {locale === 'zh-CN' ? '协议数量' : 'Protocols'}
                </p>
                <p className="text-lg font-bold text-gray-900">{totalProtocols}+</p>
              </div>
            </div>

            <div className="w-px h-10 bg-gray-200 hidden sm:block" />

            {/* 市场主导 */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-50 rounded-lg">
                <Activity className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {locale === 'zh-CN' ? '市场主导' : 'Dominance'}
                </p>
                <p className="text-lg font-bold text-gray-900">{marketStats.marketDominance}%</p>
              </div>
            </div>

            <div className="w-px h-10 bg-gray-200 hidden sm:block" />

            {/* 平均延迟 */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {locale === 'zh-CN' ? '平均延迟' : 'Latency'}
                </p>
                <p className="text-lg font-bold text-gray-900">{marketStats.avgUpdateLatency}ms</p>
              </div>
            </div>

            <div className="w-px h-10 bg-gray-200 hidden sm:block" />

            {/* 预言机数 */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {locale === 'zh-CN' ? '预言机数' : 'Oracles'}
                </p>
                <p className="text-lg font-bold text-gray-900">{marketStats.oracleCount}</p>
              </div>
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
              <button
                onClick={() => setActiveChart('chain')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeChart === 'chain'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Network className="w-4 h-4" />
                {locale === 'zh-CN' ? '链分布' : 'Chain Breakdown'}
              </button>
              <button
                onClick={() => setActiveChart('protocol')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeChart === 'protocol'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-4 h-4" />
                {locale === 'zh-CN' ? '协议' : 'Protocols'}
              </button>
              <button
                onClick={() => setActiveChart('asset')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeChart === 'asset'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <PieChartIcon2 className="w-4 h-4" />
                {locale === 'zh-CN' ? '资产类别' : 'Asset Categories'}
              </button>
              <button
                onClick={() => setActiveChart('comparison')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeChart === 'comparison'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <GitCompare className="w-4 h-4" />
                {locale === 'zh-CN' ? '多预言机对比' : 'Oracle Comparison'}
              </button>
              <button
                onClick={() => setActiveChart('benchmark')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeChart === 'benchmark'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Target className="w-4 h-4" />
                {locale === 'zh-CN' ? '行业基准' : 'Benchmark'}
              </button>
              <button
                onClick={() => setActiveChart('correlation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeChart === 'correlation'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ActivitySquare className="w-4 h-4" />
                {locale === 'zh-CN' ? '相关性' : 'Correlation'}
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

            {/* 对比模式切换 - 仅在趋势图显示 */}
            {activeChart === 'trend' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {locale === 'zh-CN' ? '对比:' : 'Compare:'}
                </span>
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => toggleComparisonMode('yoy')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      comparisonMode === 'yoy'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={locale === 'zh-CN' ? '同比对比' : 'Year-over-Year'}
                  >
                    {locale === 'zh-CN' ? '同比' : 'YoY'}
                  </button>
                  <button
                    onClick={() => toggleComparisonMode('mom')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      comparisonMode === 'mom'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={locale === 'zh-CN' ? '环比对比' : 'Month-over-Month'}
                  >
                    {locale === 'zh-CN' ? '环比' : 'MoM'}
                  </button>
                </div>
              </div>
            )}

            {/* 异常检测阈值配置 - 仅在趋势图显示 */}
            {activeChart === 'trend' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100">
                <span className="text-sm text-red-600">
                  {locale === 'zh-CN' ? '异常阈值:' : 'Anomaly Threshold:'}
                </span>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={anomalyThreshold * 100}
                  onChange={(e) => setAnomalyThreshold(Number(e.target.value) / 100)}
                  className="w-20 h-1.5 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <span className="text-sm font-medium text-red-600 min-w-[3rem]">
                  {(anomalyThreshold * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {/* 置信区间开关 - 仅在趋势图显示 */}
            {activeChart === 'trend' && comparisonMode === 'none' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-100">
                <span className="text-sm text-purple-600">
                  {locale === 'zh-CN' ? '置信区间:' : 'Confidence:'}
                </span>
                <button
                  onClick={() => setShowConfidenceInterval(!showConfidenceInterval)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    showConfidenceInterval ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      showConfidenceInterval ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-purple-500">
                  {showConfidenceInterval ? (locale === 'zh-CN' ? '95%' : '95%') : ''}
                </span>
              </div>
            )}

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
            <div
              ref={chartContainerRef}
              className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">{getChartTitle()}</h3>
                  {/* 联动指示器 */}
                  {linkedOracle && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-100">
                      <Link2 className="w-4 h-4 text-purple-600" />
                      <span className="text-xs text-purple-600 font-medium">
                        {locale === 'zh-CN' ? '联动' : 'Linked'}:
                      </span>
                      <span className="text-sm font-semibold text-purple-700">
                        {linkedOracle.primary} ↔ {linkedOracle.secondary}
                      </span>
                      <button
                        onClick={() => setLinkedOracle(null)}
                        className="ml-1 p-0.5 hover:bg-purple-200 rounded transition-colors"
                        title={locale === 'zh-CN' ? '清除联动' : 'Clear Link'}
                      >
                        <X className="w-3 h-3 text-purple-600" />
                      </button>
                    </div>
                  )}
                  {/* 对比模式差异统计 */}
                  {activeChart === 'trend' &&
                    comparisonMode !== 'none' &&
                    trendComparisonData.length > 0 && (
                      <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-xs text-blue-600 font-medium">
                          {comparisonMode === 'yoy'
                            ? locale === 'zh-CN'
                              ? '同比差异'
                              : 'YoY Diff'
                            : locale === 'zh-CN'
                              ? '环比差异'
                              : 'MoM Diff'}
                          :
                        </span>
                        {(() => {
                          const latestData = prepareComparisonData(trendData, trendComparisonData)[
                            trendData.length - 1
                          ];
                          const oracleKeys = ['chainlink', 'pyth', 'band', 'api3', 'uma'];
                          const avgDiff =
                            oracleKeys.reduce((sum, key) => {
                              return sum + (latestData[`${key}DiffPercent`] || 0);
                            }, 0) / oracleKeys.length;
                          return (
                            <span
                              className={`text-sm font-bold ${avgDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {avgDiff >= 0 ? '+' : ''}
                              {avgDiff.toFixed(2)}%
                            </span>
                          );
                        })()}
                      </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  {activeChart === 'trend' && zoomRange && (
                    <button
                      onClick={() => setZoomRange(null)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {locale === 'zh-CN' ? '重置缩放' : 'Reset Zoom'}
                    </button>
                  )}
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
              </div>

              {loading && !['chain', 'protocol', 'asset'].includes(activeChart) ? (
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
                    className={`${viewType === 'table' && !['chain', 'protocol', 'asset'].includes(activeChart) ? 'h-[360px]' : 'h-[400px]'}`}
                  >
                    {['chain', 'protocol', 'asset'].includes(activeChart) ? (
                      renderChart()
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        {renderChart()}
                      </ResponsiveContainer>
                    )}
                  </div>
                  {viewType === 'chart' &&
                    !['chain', 'protocol', 'asset'].includes(activeChart) && (
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
                  } ${hoveredItem && hoveredItem !== item.name ? 'opacity-60' : 'opacity-100'}`}
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
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">{item.share}%</span>
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
                      <span className="font-medium text-gray-700">{item.tvs}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">
                        {locale === 'zh-CN' ? '链' : 'Chains'}
                      </span>
                      <span className="font-medium text-gray-700">{item.chains}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">24h</span>
                      <span
                        className={`font-medium ${
                          item.change24h >= 0 ? 'text-green-600' : 'text-red-600'
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

          {/* 风险指标、异常预警和价格预警 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <RiskDashboard data={riskMetrics} loading={loadingRiskMetrics} />
            </div>
            <div className="lg:col-span-1">
              <AnomalyAlert
                anomalies={anomalies}
                loading={loadingAnomalies}
                onAcknowledge={acknowledgeAnomaly}
                maxDisplay={5}
              />
            </div>
            <div className="lg:col-span-1">
              <PriceAlertConfig
                alerts={priceAlerts}
                history={alertHistory}
                onAddAlert={addPriceAlert}
                onRemoveAlert={removePriceAlert}
                onToggleAlert={togglePriceAlert}
                onAcknowledgeHistory={acknowledgeAlertHistory}
                onClearHistory={clearAlertHistory}
                onRequestNotificationPermission={requestNotificationPermission}
                hasNotificationPermission={hasNotificationPermission}
              />
            </div>
          </div>

          {/* 导出配置和定时导出 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExportConfigComponent
              locale={locale}
              onExport={(config: ExportConfig) => {
                const { content, fileName, mimeType } = exportWithConfig(config, {
                  oracleData,
                  assets,
                  trendData,
                  chainBreakdown,
                  protocolDetails,
                  assetCategories,
                  comparisonData,
                  benchmarkData,
                  correlationData,
                  riskMetrics: riskMetrics || undefined,
                  anomalies,
                });
                downloadExport(content, fileName, mimeType);
              }}
            />
            <ScheduledExportConfig
              locale={locale}
              onRunTask={async (task: ScheduledExportTask) => {
                const { content, fileName, mimeType } = exportWithConfig(task.config, {
                  oracleData,
                  assets,
                  trendData,
                  chainBreakdown,
                  protocolDetails,
                  assetCategories,
                  comparisonData,
                  benchmarkData,
                  correlationData,
                  riskMetrics: riskMetrics || undefined,
                  anomalies,
                });
                downloadExport(content, fileName, mimeType);
              }}
            />
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
                    <tr key={asset.symbol} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">{asset.symbol}</span>
                          <span className="text-xs text-gray-400">
                            {formatCompactNumber(asset.marketCap)}
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
                            asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {asset.change24h >= 0 ? '+' : ''}
                          {asset.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-medium ${
                            asset.change7d >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {asset.change7d >= 0 ? '+' : ''}
                          {asset.change7d.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-gray-600">
                          ${formatCompactNumber(asset.volume24h)}
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

      {/* 异常点详情弹窗 */}
      {selectedAnomaly && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAnomaly(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {locale === 'zh-CN' ? '数据异常检测' : 'Anomaly Detected'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <p className="text-sm text-red-600 mb-1">
                  {locale === 'zh-CN' ? '检测到异常波动' : 'Abnormal fluctuation detected'}
                </p>
                <p className="text-2xl font-bold text-red-700">
                  {(selectedAnomaly.changeRate * 100).toFixed(2)}%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">
                    {locale === 'zh-CN' ? '预言机' : 'Oracle'}
                  </p>
                  <p className="font-medium text-gray-900">{selectedAnomaly.dataKey}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">
                    {locale === 'zh-CN' ? '日期' : 'Date'}
                  </p>
                  <p className="font-medium text-gray-900">{selectedAnomaly.date}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">
                    {locale === 'zh-CN' ? '当前值' : 'Current Value'}
                  </span>
                  <span className="font-medium text-gray-900">
                    ${selectedAnomaly.value.toFixed(2)}B
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">
                    {locale === 'zh-CN' ? '上一期值' : 'Previous Value'}
                  </span>
                  <span className="font-medium text-gray-900">
                    ${selectedAnomaly.prevValue.toFixed(2)}B
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">
                    {locale === 'zh-CN' ? '变化量' : 'Change'}
                  </span>
                  <span
                    className={`font-medium ${
                      selectedAnomaly.value > selectedAnomaly.prevValue
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {selectedAnomaly.value > selectedAnomaly.prevValue ? '+' : ''}
                    {(selectedAnomaly.value - selectedAnomaly.prevValue).toFixed(2)}B
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-amber-700">
                  {locale === 'zh-CN'
                    ? '该数据点的变化率超过了设定的阈值，可能存在异常波动。建议进一步调查原因。'
                    : 'This data point exceeds the configured threshold. Further investigation is recommended.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                {locale === 'zh-CN' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
