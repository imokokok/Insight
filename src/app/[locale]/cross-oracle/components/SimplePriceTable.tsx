'use client';

import { useMemo, useCallback, memo } from 'react';

import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Minus,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

import { chartColors } from '@/lib/config/colors';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { oracleNames, ANOMALY_THRESHOLD } from '../constants';

// ============================================================================
// 类型定义
// ============================================================================

export interface PriceAnomaly {
  provider: OracleProvider;
  deviationPercent: number;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface SimplePriceTableProps {
  priceData: PriceData[];
  anomalies?: PriceAnomaly[];
  medianPrice: number;
  minPrice?: number;
  maxPrice?: number;
  isLoading?: boolean;
  validPrices?: number[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface TableRow {
  provider: OracleProvider;
  price: number;
  deviation: number;
  deviationPercent: number;
  status: 'normal' | 'warning' | 'error';
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | null;
}

interface ChartDataPoint {
  name: string;
  price: number;
  median: number;
  isAnomaly: boolean;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取一致性评级
 */
const getConsistencyRating = (
  priceRange: number,
  medianPrice: number
): {
  label: string;
  color: string;
  bgColor: string;
  score: number;
} => {
  if (medianPrice === 0) {
    return { label: 'unknown', color: 'text-gray-500', bgColor: 'bg-gray-100', score: 0 };
  }
  const rangePercent = (priceRange / medianPrice) * 100;
  if (rangePercent < 0.1) {
    return { label: 'excellent', color: 'text-green-600', bgColor: 'bg-green-50', score: 95 };
  } else if (rangePercent < 0.3) {
    return { label: 'good', color: 'text-blue-600', bgColor: 'bg-blue-50', score: 85 };
  } else if (rangePercent < 0.5) {
    return { label: 'fair', color: 'text-yellow-600', bgColor: 'bg-yellow-50', score: 70 };
  } else if (rangePercent < 1.0) {
    return { label: 'poor', color: 'text-orange-600', bgColor: 'bg-orange-50', score: 50 };
  }
  return { label: 'critical', color: 'text-red-600', bgColor: 'bg-red-50', score: 30 };
};

/**
 * 格式化价格显示
 */
const formatPrice = (price: number): string => {
  if (price === 0) return '-';
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
};

/**
 * 格式化偏差率
 */
const formatDeviation = (deviation: number): string => {
  const sign = deviation >= 0 ? '+' : '';
  return `${sign}${deviation.toFixed(3)}%`;
};

/**
 * 获取偏差率颜色
 */
const getDeviationColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'text-green-600';
  if (absDeviation < 0.5) return 'text-yellow-600';
  if (absDeviation < 1.0) return 'text-orange-600';
  return 'text-red-600';
};

/**
 * 获取偏差率背景色
 */
const getDeviationBgColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-green-50 border-green-200';
  if (absDeviation < 0.5) return 'bg-yellow-50 border-yellow-200';
  if (absDeviation < 1.0) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
};

/**
 * 获取状态图标
 */
const StatusIcon = ({ status, severity }: { status: string; severity: string | null }) => {
  if (status === 'normal') {
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  }
  if (severity === 'high') {
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  }
  if (severity === 'medium') {
    return <AlertTriangle className="w-4 h-4 text-orange-500" />;
  }
  return <Activity className="w-4 h-4 text-yellow-500" />;
};

// ============================================================================
// 子组件：中位数价格卡片
// ============================================================================

interface MedianPriceCardProps {
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const MedianPriceCard = memo(function MedianPriceCard({
  medianPrice,
  minPrice,
  maxPrice,
  t,
}: MedianPriceCardProps) {
  const priceRange = maxPrice - minPrice;
  const consistency = getConsistencyRating(priceRange, medianPrice);

  return (
    <div className="bg-gray-50/50 rounded-xl p-5 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* 中位数价格 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-500">
              {t('crossOracle.medianPrice') || 'Median Price'}
            </span>
          </div>
          <div className="text-4xl font-bold text-gray-900 tracking-tight">
            {formatPrice(medianPrice)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <span>{t('crossOracle.priceRange') || 'Range'}:</span>
            <span className="font-mono">{formatPrice(minPrice)}</span>
            <Minus className="w-3 h-3" />
            <span className="font-mono">{formatPrice(maxPrice)}</span>
          </div>
        </div>

        {/* 价格区间可视化 */}
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>{t('crossOracle.min') || 'Min'}</span>
            <span>{t('crossOracle.max') || 'Max'}</span>
          </div>
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            {medianPrice > 0 && (
              <div
                className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                style={{
                  left: `${((minPrice / medianPrice - 1) * 100 + 100) / 2}%`,
                  right: `${100 - ((maxPrice / medianPrice - 1) * 100 + 100) / 2}%`,
                }}
              />
            )}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-sm"
              style={{ left: '50%', transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <div className="flex justify-center mt-2">
            <span className="text-xs text-blue-600 font-medium">
              ±{((priceRange / 2 / medianPrice) * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 一致性评级 */}
        <div className="flex items-center gap-4">
          <div className={`px-4 py-3 rounded-lg ${consistency.bgColor}`}>
            <div className="text-xs text-gray-500 mb-1">
              {t('crossOracle.consistency') || 'Consistency'}
            </div>
            <div className={`text-lg font-bold ${consistency.color}`}>
              {t(`crossOracle.consistencyRating.${consistency.label}`) || consistency.label}
            </div>
            <div className="text-xs text-gray-400 mt-1">Score: {consistency.score}/100</div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// 子组件：价格趋势图 Tooltip
// ============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  medianPrice: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const ChartTooltipContent = memo(function ChartTooltipContent({
  active,
  payload,
  medianPrice,
  t,
}: TooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900">{item.name}</p>
        <p className="text-sm text-gray-600">
          {t('crossOracle.price')}: {formatPrice(item.price)}
        </p>
        <p className="text-sm text-gray-600">
          {t('crossOracle.deviation')}:{' '}
          {formatDeviation(((item.price - medianPrice) / medianPrice) * 100)}
        </p>
        {item.isAnomaly && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {t('crossOracle.anomaly') || 'Anomaly Detected'}
          </p>
        )}
      </div>
    );
  }
  return null;
});

// ============================================================================
// 子组件：价格趋势图
// ============================================================================

interface PriceTrendChartProps {
  data: ChartDataPoint[];
  medianPrice: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const PriceTrendChart = memo(function PriceTrendChart({
  data,
  medianPrice,
  t,
}: PriceTrendChartProps) {
  const renderTooltip = useCallback(
    (props: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) => (
      <ChartTooltipContent {...props} medianPrice={medianPrice} t={t} />
    ),
    [medianPrice, t]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-semibold text-gray-900">
          {t('crossOracle.priceTrend') || 'Price Trend'}
        </h4>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600">{t('crossOracle.price') || 'Price'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-gray-400" />
            <span className="text-gray-600">{t('crossOracle.median') || 'Median'}</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value: number) => `$${value.toLocaleString()}`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={renderTooltip as unknown as React.ReactElement} />
            <ReferenceLine y={medianPrice} stroke="#9ca3af" strokeDasharray="4 4" strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="price"
              stroke={chartColors.recharts.primary}
              strokeWidth={3}
              dot={(props: { cx?: number; cy?: number; payload?: ChartDataPoint }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined) return null;
                return (
                  <g>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={payload?.isAnomaly ? 6 : 4}
                      fill={payload?.isAnomaly ? '#ef4444' : chartColors.recharts.primary}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    {payload?.isAnomaly && (
                      <AlertTriangle
                        x={cx - 6}
                        y={cy - 14}
                        width={12}
                        height={12}
                        className="text-red-500"
                      />
                    )}
                  </g>
                );
              }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

// ============================================================================
// 主组件：简化版价格表格
// ============================================================================

function SimplePriceTableComponent({
  priceData,
  anomalies = [],
  medianPrice,
  minPrice = 0,
  maxPrice = 0,
  isLoading = false,
  validPrices = [],
  t,
}: SimplePriceTableProps) {
  // 处理表格数据
  const tableRows: TableRow[] = useMemo(() => {
    if (!priceData.length || medianPrice === 0) return [];

    return priceData
      .map((data) => {
        const deviation = data.price - medianPrice;
        const deviationPercent = (deviation / medianPrice) * 100;
        const absDeviation = Math.abs(deviationPercent);

        // 检查是否为异常
        const anomaly = anomalies.find((a) => a.provider === data.provider);
        const isAnomaly = anomaly !== undefined || absDeviation >= ANOMALY_THRESHOLD;
        const severity =
          anomaly?.severity ||
          (absDeviation >= 3
            ? 'high'
            : absDeviation >= 1
              ? 'medium'
              : absDeviation >= 0.5
                ? 'low'
                : null);

        // 确定状态
        let status: 'normal' | 'warning' | 'error' = 'normal';
        if (absDeviation >= 1) status = 'error';
        else if (absDeviation >= 0.5) status = 'warning';

        return {
          provider: data.provider,
          price: data.price,
          deviation,
          deviationPercent,
          status,
          isAnomaly,
          severity,
        };
      })
      .sort((a, b) => a.price - b.price);
  }, [priceData, medianPrice, anomalies]);

  // 处理图表数据
  const chartData: ChartDataPoint[] = useMemo(() => {
    return tableRows.map((row) => ({
      name: oracleNames[row.provider] || row.provider,
      price: row.price,
      median: medianPrice,
      isAnomaly: row.isAnomaly,
    }));
  }, [tableRows, medianPrice]);

  // 获取行样式
  const getRowClassName = (row: TableRow): string => {
    const baseClass = 'transition-colors duration-200 hover:bg-gray-50';
    if (row.severity === 'high') return `${baseClass} bg-red-50/70`;
    if (row.severity === 'medium') return `${baseClass} bg-orange-50/50`;
    if (row.severity === 'low') return `${baseClass} bg-yellow-50/30`;
    return baseClass;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-12 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!priceData.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('crossOracle.noData') || 'No Data Available'}
        </h3>
        <p className="text-gray-500">
          {t('crossOracle.noDataDescription') || 'Please try again later'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 中位数价格卡片 */}
      <MedianPriceCard medianPrice={medianPrice} minPrice={minPrice} maxPrice={maxPrice} t={t} />

      {/* 价格表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('crossOracle.priceComparison') || 'Price Comparison'}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>&lt;0.5%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>0.5-1%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>&gt;1%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.oracle') || 'Oracle'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.price') || 'Price'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.deviation') || 'Deviation'}
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('crossOracle.status') || 'Status'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tableRows.map((row) => (
                <tr key={row.provider} className={getRowClassName(row)}>
                  {/* 预言机名称 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: chartColors.recharts.primary }}
                      />
                      <span className="font-medium text-gray-900">
                        {oracleNames[row.provider] || row.provider}
                      </span>
                      {row.isAnomaly && row.severity === 'high' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-red-600 bg-red-100">
                          <AlertTriangle className="w-3 h-3" />
                          {t('crossOracle.highRisk') || 'High Risk'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 价格 */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`font-mono font-medium ${
                        row.severity === 'high'
                          ? 'text-red-700'
                          : row.severity === 'medium'
                            ? 'text-orange-700'
                            : 'text-gray-900'
                      }`}
                    >
                      {formatPrice(row.price)}
                    </span>
                  </td>

                  {/* 偏差率 */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getDeviationBgColor(
                        row.deviationPercent
                      )} ${getDeviationColor(row.deviationPercent)}`}
                    >
                      {row.deviationPercent > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : row.deviationPercent < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      {formatDeviation(row.deviationPercent)}
                    </span>
                  </td>

                  {/* 状态 */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <StatusIcon status={row.status} severity={row.severity} />
                      <span
                        className={`text-sm font-medium ${
                          row.status === 'normal'
                            ? 'text-green-600'
                            : row.status === 'warning'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {row.status === 'normal'
                          ? t('crossOracle.statusNormal') || 'Normal'
                          : row.status === 'warning'
                            ? t('crossOracle.statusWarning') || 'Warning'
                            : t('crossOracle.statusError') || 'Error'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 表格底部摘要 */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {t('crossOracle.totalOracles', { count: tableRows.length }) ||
                `Total: ${tableRows.length} oracles`}
            </span>
            <span>
              {t('crossOracle.anomaliesCount', { count: anomalies.length }) ||
                `${anomalies.length} anomalies detected`}
            </span>
          </div>
        </div>
      </div>

      {/* 价格趋势图 */}
      {chartData.length > 0 && (
        <div className="mt-4">
          <PriceTrendChart data={chartData} medianPrice={medianPrice} t={t} />
        </div>
      )}
    </div>
  );
}

// 导出记忆化组件
export const SimplePriceTable = memo(SimplePriceTableComponent);

export default SimplePriceTable;
