/* eslint-disable max-lines-per-function */
'use client';

import { useState } from 'react';

import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Legend,
  Brush,
  ReferenceDot,
  Area,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import { useIsMobile } from '@/stores/uiStore';
import { type TooltipProps } from '@/types/ui/recharts';

import { prepareComparisonData, ORACLE_KEYS } from '../comparisonUtils';
import { CHAIN_SUPPORT_DATA } from '../constants';
import {
  type OracleMarketData,
  type TVSTrendData,
  type ChartType,
  type ViewType,
  type ProtocolDetail,
  type AssetCategory,
  type ComparisonData,
  type BenchmarkData,
  type CorrelationData,
  type ChainSupportData,
} from '../types';

import AssetCategoryChart from './AssetCategoryChart';
import BenchmarkComparison from './BenchmarkComparison';
import CorrelationMatrix from './CorrelationMatrix';
import EmptyState from './EmptyState';
import OracleComparison from './OracleComparison';
import ProtocolList from './ProtocolList';

interface ComparisonTooltipData {
  [key: string]: number | string | undefined;
}

interface ChartRendererProps {
  activeChart: ChartType;
  viewType: ViewType;
  sortedOracleData: OracleMarketData[];
  trendData: TVSTrendData[];
  protocolDetails: ProtocolDetail[];
  assetCategories: AssetCategory[];
  comparisonData: ComparisonData[];
  benchmarkData: BenchmarkData[];
  correlationData: CorrelationData;
  loading: boolean;
  loadingEnhanced: boolean;
  loadingComparison: boolean;
  locale: string;
  hoveredItem: string | null;
  setHoveredItem: (item: string | null) => void;
  selectedItem: string | null;
  setSelectedItem: (item: string | null) => void;
  linkedOracle: { primary: string; secondary: string } | null;
  setLinkedOracle: (link: { primary: string; secondary: string } | null) => void;
  zoomRange: { startIndex?: number; endIndex?: number } | null;
  setZoomRange: (range: { startIndex?: number; endIndex?: number } | null) => void;
  anomalyThreshold: number;
  selectedAnomaly: {
    dataKey: string;
    date: string;
    value: number;
    prevValue: number;
    changeRate: number;
  } | null;
  setSelectedAnomaly: (
    anomaly: {
      dataKey: string;
      date: string;
      value: number;
      prevValue: number;
      changeRate: number;
    } | null
  ) => void;
  comparisonMode: 'none' | 'yoy' | 'mom';
  trendComparisonData: TVSTrendData[];
  showConfidenceInterval: boolean;
  chartType?: 'line' | 'area' | 'candle';
}

export default function ChartRenderer({
  activeChart,
  viewType,
  sortedOracleData,
  trendData,
  protocolDetails,
  assetCategories,
  comparisonData,
  benchmarkData,
  correlationData,
  loading: _loading,
  loadingEnhanced,
  loadingComparison,
  locale,
  hoveredItem,
  setHoveredItem,
  selectedItem,
  setSelectedItem,
  linkedOracle,
  setLinkedOracle,
  zoomRange,
  setZoomRange,
  anomalyThreshold,
  selectedAnomaly: _selectedAnomaly,
  setSelectedAnomaly,
  comparisonMode,
  trendComparisonData,
  showConfidenceInterval,
  chartType: _chartType,
}: ChartRendererProps) {
  const t = useTranslations('marketOverview.chart');
  const isMobile = useIsMobile();
  const [showAllOracles, setShowAllOracles] = useState(false);
  const CustomTooltip = ({ active, payload, label }: TooltipProps<OracleMarketData>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded p-3">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }} />
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

  const isCellHighlighted = (name: string) => {
    if (!linkedOracle) return true;
    return name === linkedOracle.primary || name === linkedOracle.secondary;
  };

  const isLineHighlighted = (name: string) => {
    if (!linkedOracle) return true;
    return name === linkedOracle.primary || name === linkedOracle.secondary;
  };

  const renderPieChart = () => {
    if (!sortedOracleData || sortedOracleData.length === 0) {
      return <EmptyState type="chart" />;
    }

    const totalTVS = sortedOracleData.reduce((sum, item) => sum + item.tvsValue, 0);

    // 获取悬停或选中的预言机数据
    const activeItem = hoveredItem
      ? sortedOracleData.find((d) => d.name === hoveredItem)
      : selectedItem
        ? sortedOracleData.find((d) => d.name === selectedItem)
        : null;

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col md:flex-row">
          <div className="flex-1 relative">
            <PieChart width={isMobile ? 340 : 520} height={isMobile ? 320 : 440}>
              <Pie
                data={sortedOracleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={isMobile ? 120 : 190}
                innerRadius={isMobile ? 70 : 110}
                fill={chartColors.pie.default}
                dataKey="share"
                paddingAngle={2}
                onMouseEnter={(_, index) => setHoveredItem(sortedOracleData[index]?.name)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={(_, index) => {
                  const name = sortedOracleData[index]?.name;
                  setSelectedItem(name === selectedItem ? null : name);
                }}
                label={(props) => {
                  const share = typeof props.value === 'number' ? props.value : 0;
                  if (share < (isMobile ? 8 : 5)) return null;
                  return `${share}%`;
                }}
              >
                {sortedOracleData.map((entry, index) => {
                  const isHighlighted = isCellHighlighted(entry.name);
                  const isActive = hoveredItem === entry.name || selectedItem === entry.name;
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
                      opacity={
                        !linkedOracle
                          ? hoveredItem && hoveredItem !== entry.name
                            ? 0.5
                            : 1
                          : isHighlighted
                            ? 1
                            : 0.2
                      }
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: isActive ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: 'center',
                      }}
                    />
                  );
                })}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                {activeItem ? (
                  <>
                    <p className="text-xs text-gray-500 mb-1">{activeItem.name}</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">
                      {activeItem.share}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">${activeItem.tvsValue.toFixed(1)}B</p>
                    <p
                      className={`text-xs mt-1 ${(activeItem.change24h || 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}
                    >
                      {(activeItem.change24h || 0) >= 0 ? '+' : ''}
                      {(activeItem.change24h || 0).toFixed(1)}%
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-1">{t('totalTVS')}</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">
                      ${totalTVS.toFixed(1)}B
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {sortedOracleData.length} {t('oracles')}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            className={`flex flex-col justify-center space-y-2 pr-4 ${isMobile ? 'w-full mt-4' : 'w-48'}`}
          >
            {sortedOracleData.map((item) => (
              <div
                key={item.name}
                className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-all ${
                  hoveredItem === item.name || selectedItem === item.name
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-50'
                }`}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => setSelectedItem(item.name === selectedItem ? null : item.name)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-700 truncate max-w-[80px]">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-gray-900">{item.share}%</span>
                  <span
                    className={`text-xs ml-1.5 ${(item.change24h || 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}
                  >
                    {(item.change24h || 0) >= 0 ? '+' : ''}
                    {(item.change24h || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTrendChart = () => {
    if (!trendData || trendData.length === 0) {
      return <EmptyState type="chart" />;
    }

    const oracleColors: Record<string, string> = {
      chainlink: chartColors.marketOverview.chainlink,
      pyth: chartColors.marketOverview.pyth,
      api3: chartColors.marketOverview.api3,
      redstone: chartColors.oracle.redstone,
      dia: chartColors.oracle.dia,
      winklink: chartColors.oracle.winklink,
    };
    const oracleNames: Record<string, string> = {
      chainlink: 'Chainlink',
      pyth: 'Pyth Network',
      api3: 'API3',
      redstone: 'RedStone',
      dia: 'DIA',
      winklink: 'WINkLink',
    };

    const chartData =
      comparisonMode !== 'none' && trendComparisonData.length > 0
        ? prepareComparisonData(trendData, trendComparisonData)
        : trendData;

    const sortedOraclesByShare = [...sortedOracleData].sort(
      (a, b) => (b.share || 0) - (a.share || 0)
    );
    const topOracles = sortedOraclesByShare.slice(0, 5).map((o) => o.name.toLowerCase());

    const displayOracleKeys =
      isMobile && !showAllOracles
        ? ORACLE_KEYS.filter((key) => topOracles.includes(key))
        : ORACLE_KEYS;

    const ComparisonTooltip = ({ active, payload, label }: TooltipProps<ComparisonTooltipData>) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        if (!data) return null;
        return (
          <div className="bg-white border border-gray-200 rounded p-3 max-w-xs">
            <p className="font-medium text-gray-900 mb-2">{label}</p>
            {comparisonMode !== 'none' ? (
              <div className="space-y-2">
                {ORACLE_KEYS.map((key) => {
                  const currentValue = data[key] as number;
                  const compareValue = data[`${key}Compare`] as number;
                  const diffPercent = data[`${key}DiffPercent`] as number;
                  return (
                    <div key={key} className="text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: oracleColors[key] }}
                        />
                        <span className="text-gray-600">{oracleNames[key]}:</span>
                      </div>
                      <div className="ml-5 mt-1 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('current')}:</span>
                          <span className="font-medium">${currentValue?.toFixed(2)}B</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            {comparisonMode === 'yoy' ? t('yoy') : t('mom')}:
                          </span>
                          <span className="font-medium text-gray-600">
                            ${compareValue?.toFixed(2)}B
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('change')}:</span>
                          <span
                            className={`font-medium ${diffPercent >= 0 ? 'text-success-600' : 'text-danger-600'}`}
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
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }} />
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
      <div className="relative h-full">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.lineChart.grid} />
          <XAxis
            dataKey="date"
            stroke={chartColors.lineChart.axis}
            fontSize={isMobile ? 10 : 12}
            interval={isMobile ? 'preserveStartEnd' : 0}
          />
          <YAxis
            stroke={chartColors.lineChart.axis}
            fontSize={isMobile ? 10 : 12}
            tickFormatter={(v) => `$${v}B`}
            width={isMobile ? 45 : 60}
          />
          <RechartsTooltip
            content={<ComparisonTooltip />}
            position={isMobile ? { x: 0, y: 0 } : undefined}
            wrapperStyle={isMobile ? { zIndex: 100 } : undefined}
          />
          <Legend
            wrapperStyle={isMobile ? { fontSize: '10px' } : undefined}
            iconSize={isMobile ? 8 : 14}
          />
          {displayOracleKeys.map((key) => {
            const isHighlighted = isLineHighlighted(oracleNames[key]);
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={oracleNames[key]}
                stroke={oracleColors[key]}
                strokeWidth={comparisonMode !== 'none' ? 3 : isHighlighted ? 3 : 1}
                dot={false}
                activeDot={{ r: comparisonMode !== 'none' ? 6 : 4 }}
                opacity={!linkedOracle ? 1 : isHighlighted ? 1 : 0.2}
                strokeDasharray={!isHighlighted && linkedOracle ? '3 3' : undefined}
              />
            );
          })}
          {showConfidenceInterval &&
            comparisonMode === 'none' &&
            displayOracleKeys.map((key) => (
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
          {showConfidenceInterval &&
            comparisonMode === 'none' &&
            displayOracleKeys.map((key) => (
              <Area
                key={`${key}-confidence-lower`}
                type="monotone"
                dataKey={`${key}Lower`}
                stroke="none"
                fill={baseColors.gray[50]}
                fillOpacity={1}
                isAnimationActive={false}
              />
            ))}
          {comparisonMode !== 'none' &&
            trendComparisonData.length > 0 &&
            displayOracleKeys.map((key) => (
              <Line
                key={`${key}-compare`}
                type="monotone"
                dataKey={`${key}Compare`}
                name={`${oracleNames[key]} ${comparisonMode === 'yoy' ? `(${t('yoy')})` : `(${t('mom')})`}`}
                stroke={oracleColors[key]}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                opacity={0.7}
              />
            ))}
          {displayOracleKeys.map((key) =>
            detectAnomalies(trendData, key, anomalyThreshold).map((anomaly, idx) => (
              <ReferenceDot
                key={`${key}-anomaly-${idx}`}
                x={anomaly.date}
                y={anomaly.value}
                r={6}
                fill={semanticColors.danger.DEFAULT}
                stroke={baseColors.gray[50]}
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
            height={isMobile ? 20 : 30}
            stroke={chartColors.pie.default}
            startIndex={zoomRange?.startIndex}
            endIndex={zoomRange?.endIndex}
            onChange={(range) => setZoomRange(range)}
          />
        </LineChart>

        {isMobile && (
          <button
            onClick={() => setShowAllOracles(!showAllOracles)}
            className="absolute bottom-12 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm z-10"
          >
            {showAllOracles ? t('showTop5') : t('showAll')}
          </button>
        )}
      </div>
    );
  };

  const ChainSupportTooltip = ({ active, payload }: TooltipProps<ChainSupportData>) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ChainSupportData;
      const oracleData = sortedOracleData.find((o) => o.name === item.name);
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg min-w-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
            <span className="font-semibold text-gray-900">{item.name}</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('chains')}:</span>
              <span className="font-medium text-gray-900">{item.chains}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('protocols')}:</span>
              <span className="font-medium text-gray-900">{item.protocols}</span>
            </div>
            {oracleData && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('share')}:</span>
                  <span className="font-medium text-gray-900">{oracleData.share}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">TVS:</span>
                  <span className="font-medium text-gray-900">{oracleData.tvs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">24h:</span>
                  <span
                    className={`font-medium ${
                      oracleData.change24h >= 0 ? 'text-success-600' : 'text-danger-600'
                    }`}
                  >
                    {oracleData.change24h >= 0 ? '+' : ''}
                    {oracleData.change24h.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderBarChart = () => {
    if (!CHAIN_SUPPORT_DATA || CHAIN_SUPPORT_DATA.length === 0) {
      return <EmptyState type="chart" />;
    }

    return (
      <BarChart
        data={CHAIN_SUPPORT_DATA}
        layout="vertical"
        margin={{ left: 20, right: 30, top: 20, bottom: 20 }}
        barCategoryGap={20}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={chartColors.lineChart.grid}
          horizontal={false}
        />
        <XAxis
          type="number"
          stroke={chartColors.lineChart.axis}
          fontSize={13}
          tickLine={false}
          axisLine={{ stroke: chartColors.lineChart.axis, strokeWidth: 1 }}
        />
        <YAxis
          dataKey="name"
          type="category"
          stroke={chartColors.lineChart.axis}
          fontSize={12}
          width={100}
          tickLine={false}
          axisLine={false}
        />
        <RechartsTooltip content={<ChainSupportTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="chains" name="Supported Chains" radius={[0, 6, 6, 0]} barSize={32}>
          {CHAIN_SUPPORT_DATA.map((entry, index) => {
            const isHighlighted = isCellHighlighted(entry.name);
            return (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                opacity={!linkedOracle ? 1 : isHighlighted ? 1 : 0.3}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
              />
            );
          })}
        </Bar>
      </BarChart>
    );
  };

  const renderTable = () => {
    const data =
      activeChart === 'pie'
        ? sortedOracleData
        : activeChart === 'bar'
          ? CHAIN_SUPPORT_DATA
          : sortedOracleData;

    if (!data || data.length === 0) {
      return <EmptyState type="table" />;
    }

    // 链支持表格 - 合并显示完整信息
    if (activeChart === 'bar') {
      return (
        <div className="h-full overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                  {t('oracle')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                  {t('chains')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                  {t('protocols')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                  {t('share')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                  TVS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((item: OracleMarketData | ChainSupportData, index: number) => {
                const oracleData = sortedOracleData.find((o) => o.name === item.name);
                const chainItem = item as ChainSupportData;
                return (
                  <tr
                    key={item.name}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedItem === item.name ? 'bg-primary-50' : ''
                    }`}
                    onClick={() => setSelectedItem(item.name === selectedItem ? null : item.name)}
                    onMouseEnter={() => setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-gray-900">{chainItem.chains}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-gray-600">{chainItem.protocols}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900">{oracleData?.share ?? '-'}%</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-gray-600">{oracleData?.tvs ?? '-'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="h-full overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                {t('oracle')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                {activeChart === 'pie' ? t('marketShare') : 'TVS'}
              </th>
              {activeChart === 'pie' && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                    TVS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                    {t('chains')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">
                    {t('change24h')}
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item, index: number) => {
              const oracleItem = item as OracleMarketData;
              return (
                <tr
                  key={oracleItem.name}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedItem === oracleItem.name ? 'bg-primary-50' : ''
                  }`}
                  onClick={() =>
                    setSelectedItem(oracleItem.name === selectedItem ? null : oracleItem.name)
                  }
                  onMouseEnter={() => setHoveredItem(oracleItem.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: oracleItem.color }}
                      />
                      <span className="font-medium text-gray-900">{oracleItem.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">
                      {activeChart === 'pie' ? `${oracleItem.share}%` : oracleItem.tvs}
                    </span>
                  </td>
                  {activeChart === 'pie' && (
                    <>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-600">{oracleItem.tvs}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-600">{oracleItem.chains}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${
                            (oracleItem.change24h ?? 0) >= 0
                              ? 'text-success-600'
                              : 'text-danger-600'
                          }`}
                        >
                          {(oracleItem.change24h ?? 0) >= 0 ? '+' : ''}
                          {(oracleItem.change24h ?? 0).toFixed(2)}%
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (
    viewType === 'table' &&
    !['chain', 'protocol', 'asset', 'pie', 'trend', 'bar'].includes(activeChart)
  ) {
    return (
      <div
        key={`table-${activeChart}`}
        className="will-change-transform gpu-accelerated animate-fade-in"
      >
        {renderTable()}
      </div>
    );
  }

  switch (activeChart) {
    case 'pie':
      return (
        <div key="chart-pie" className="will-change-transform gpu-accelerated animate-fade-in">
          {renderPieChart()}
        </div>
      );
    case 'trend':
      return (
        <div key="chart-trend" className="will-change-transform gpu-accelerated animate-fade-in">
          {renderTrendChart()}
        </div>
      );
    case 'bar':
      return (
        <div key="chart-bar" className="will-change-transform gpu-accelerated animate-fade-in">
          {renderBarChart()}
        </div>
      );
    case 'protocol':
      return (
        <div key="chart-protocol" className="will-change-transform gpu-accelerated animate-fade-in">
          <ProtocolList data={protocolDetails} loading={loadingEnhanced} />
        </div>
      );
    case 'asset':
      return (
        <div key="chart-asset" className="will-change-transform gpu-accelerated animate-fade-in">
          <AssetCategoryChart data={assetCategories} loading={loadingEnhanced} />
        </div>
      );
    case 'comparison':
      return (
        <div
          key="chart-comparison"
          className="will-change-transform gpu-accelerated animate-fade-in"
        >
          <OracleComparison data={comparisonData} loading={loadingComparison} />
        </div>
      );
    case 'benchmark':
      return (
        <div
          key="chart-benchmark"
          className="will-change-transform gpu-accelerated animate-fade-in"
        >
          <BenchmarkComparison data={benchmarkData} loading={loadingComparison} />
        </div>
      );
    case 'correlation':
      return (
        <div
          key="chart-correlation"
          className="will-change-transform gpu-accelerated animate-fade-in"
        >
          <CorrelationMatrix data={correlationData} loading={loadingComparison} />
        </div>
      );
    default:
      return null;
  }
}
