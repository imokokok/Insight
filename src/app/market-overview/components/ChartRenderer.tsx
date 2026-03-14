'use client';

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
import { TooltipProps } from '@/types/ui/recharts';
import { OracleMarketData, TVSTrendData, ChartType, ViewType, ChainBreakdown, ProtocolDetail, AssetCategory, ComparisonData, BenchmarkData, CorrelationData } from '../types';
import { chartColors } from '@/lib/config/colors';
import ChainBreakdownChart from './ChainBreakdownChart';
import ProtocolList from './ProtocolList';
import AssetCategoryChart from './AssetCategoryChart';
import OracleComparison from './OracleComparison';
import BenchmarkComparison from './BenchmarkComparison';
import CorrelationMatrix from './CorrelationMatrix';
import { CHAIN_SUPPORT_DATA } from '../constants';

interface ChartRendererProps {
  activeChart: ChartType;
  viewType: ViewType;
  sortedOracleData: OracleMarketData[];
  trendData: TVSTrendData[];
  chainBreakdown: ChainBreakdown[];
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
  setSelectedAnomaly: (anomaly: {
    dataKey: string;
    date: string;
    value: number;
    prevValue: number;
    changeRate: number;
  } | null) => void;
  comparisonMode: 'none' | 'yoy' | 'mom';
  trendComparisonData: TVSTrendData[];
  showConfidenceInterval: boolean;
}

export default function ChartRenderer({
  activeChart,
  viewType,
  sortedOracleData,
  trendData,
  chainBreakdown,
  protocolDetails,
  assetCategories,
  comparisonData,
  benchmarkData,
  correlationData,
  loading,
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
  selectedAnomaly,
  setSelectedAnomaly,
  comparisonMode,
  trendComparisonData,
  showConfidenceInterval,
}: ChartRendererProps) {
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

  const prepareComparisonData = (currentData: TVSTrendData[], compareData: TVSTrendData[]) => {
    return currentData.map((item, index) => {
      const compareItem = compareData[index];
      const result: any = { ...item };

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

  const isCellHighlighted = (name: string) => {
    if (!linkedOracle) return true;
    return name === linkedOracle.primary || name === linkedOracle.secondary;
  };

  const isLineHighlighted = (name: string) => {
    if (!linkedOracle) return true;
    return name === linkedOracle.primary || name === linkedOracle.secondary;
  };

  const renderPieChart = () => (
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

  const renderTrendChart = () => {
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

    const chartData =
      comparisonMode !== 'none' && trendComparisonData.length > 0
        ? prepareComparisonData(trendData, trendComparisonData)
        : trendData;

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
        {showConfidenceInterval &&
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
        {showConfidenceInterval &&
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
  };

  const renderBarChart = () => (
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

  if (viewType === 'table' && !['chain', 'protocol', 'asset'].includes(activeChart)) {
    return renderTable();
  }

  switch (activeChart) {
    case 'pie':
      return renderPieChart();
    case 'trend':
      return renderTrendChart();
    case 'bar':
      return renderBarChart();
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
}
