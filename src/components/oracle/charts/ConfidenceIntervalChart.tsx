'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts';
import { DashboardCard } from '../common/DashboardCard';
import { getPythHermesClient } from '@/lib/oracles/pythHermesClient';
import { createLogger } from '@/lib/utils/logger';
import { NotImplementedError } from '@/lib/errors';
import { chartColors, semanticColors } from '@/lib/config/colors';

const logger = createLogger('ConfidenceIntervalChart');

type TimeRange = '24H' | '7D' | '30D';

interface ConfidenceDataPoint {
  timestamp: string;
  width: number;
  isAboveThreshold: boolean;
  fullTimestamp: Date;
  price?: number;
  confidenceUpper?: number;
  confidenceLower?: number;
}

interface ConfidenceIntervalChartProps {
  symbol?: string;
  data?: ConfidenceDataPoint[];
  threshold?: number;
  className?: string;
}

const TIME_RANGE_CONFIG: Record<TimeRange, { label: string; hours: number; format: string }> = {
  '24H': { label: '24小时', hours: 24, format: 'hour' },
  '7D': { label: '7天', hours: 168, format: 'day' },
  '30D': { label: '30天', hours: 720, format: 'day' },
};

// Fallback mock data generator when API fails
function generateMockData(timeRange: TimeRange): ConfidenceDataPoint[] {
  const config = TIME_RANGE_CONFIG[timeRange];
  const now = new Date();
  const data: ConfidenceDataPoint[] = [];

  const baseWidth = 0.15;
  const threshold = 0.25;
  const points = config.hours;

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(now);
    timestamp.setHours(timestamp.getHours() - i);

    const hourOfDay = timestamp.getHours();
    const marketActivityFactor = hourOfDay >= 8 && hourOfDay <= 16 ? 1.3 : 0.8;
    const randomVariance = (Math.random() - 0.5) * 0.1;
    const width = Math.max(
      0.05,
      baseWidth * marketActivityFactor + randomVariance + (Math.random() > 0.9 ? 0.15 : 0)
    );

    const isAboveThreshold = width > threshold;

    let label: string;
    if (timeRange === '24H') {
      label = `${hourOfDay.toString().padStart(2, '0')}:00`;
    } else if (timeRange === '7D') {
      const day = Math.floor((points - 1 - i) / 24);
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      label = `${dayNames[(now.getDay() - day + 7) % 7]} ${hourOfDay.toString().padStart(2, '0')}:00`;
    } else {
      const date = new Date(now);
      date.setDate(date.getDate() - Math.floor((points - 1 - i) / 24));
      label = `${date.getMonth() + 1}/${date.getDate()}`;
    }

    data.push({
      timestamp: label,
      width: Number(width.toFixed(4)),
      isAboveThreshold,
      fullTimestamp: timestamp,
    });
  }

  return data;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ConfidenceDataPoint;
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (!payload || cx === undefined || cy === undefined) return null;
  if (payload.isAboveThreshold) {
    return <Dot cx={cx} cy={cy} r={4} fill={semanticColors.danger.DEFAULT} stroke="#FFF" strokeWidth={2} />;
  }
  return <Dot cx={cx} cy={cy} r={3} fill={chartColors.recharts.pink} stroke="#FFF" strokeWidth={2} />;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ConfidenceDataPoint }>;
  label?: string;
  threshold: number;
}

function CustomTooltip({ active, payload, label, threshold }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0].payload;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
      <p className="text-xs font-medium text-gray-900 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">置信区间宽度</span>
          <span
            className={`text-sm font-bold ${
              dataPoint.isAboveThreshold ? 'text-red-600' : 'text-pink-600'
            }`}
          >
            {(dataPoint.width * 100).toFixed(2)}%
          </span>
        </div>
        {dataPoint.price && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">价格</span>
            <span className="text-sm font-mono text-gray-900">
              ${dataPoint.price.toFixed(4)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">阈值</span>
          <span className="text-xs text-gray-700">{(threshold * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">状态</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              dataPoint.isAboveThreshold ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {dataPoint.isAboveThreshold ? '超出阈值' : '正常'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ConfidenceIntervalChart({
  symbol = 'ETH',
  data: propData,
  threshold = 0.25,
  className,
}: ConfidenceIntervalChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [data, setData] = useState<ConfidenceDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    if (propData) {
      setData(propData);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const client = getPythHermesClient();
        const hours = TIME_RANGE_CONFIG[timeRange].hours;
        const prices = await client.getHistoricalPrices(symbol, hours);

        if (prices.length === 0) {
          throw new Error('No price data available');
        }

        const processedData: ConfidenceDataPoint[] = prices.map((price, index) => {
          const width = price.confidenceInterval?.widthPercentage 
            ? price.confidenceInterval.widthPercentage / 100 
            : 0.15;
          const isAboveThreshold = width > threshold;

          const timestamp = new Date(price.timestamp);
          let label: string;

          if (timeRange === '24H') {
            label = `${timestamp.getHours().toString().padStart(2, '0')}:00`;
          } else if (timeRange === '7D') {
            const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            label = `${dayNames[timestamp.getDay()]} ${timestamp.getHours().toString().padStart(2, '0')}:00`;
          } else {
            label = `${timestamp.getMonth() + 1}/${timestamp.getDate()}`;
          }

          return {
            timestamp: label,
            width: Number(width.toFixed(4)),
            isAboveThreshold,
            fullTimestamp: timestamp,
            price: price.price,
            confidenceUpper: price.confidenceInterval?.ask,
            confidenceLower: price.confidenceInterval?.bid,
          };
        });

        setData(processedData);
        setUseMockData(false);
      } catch (err) {
        logger.error('Failed to fetch confidence interval data:', err instanceof Error ? err : new Error(String(err)));
        
        if (err instanceof NotImplementedError) {
          setError('Pyth API 不支持历史价格查询，使用模拟数据');
        } else {
          setError('无法获取数据，使用模拟数据');
        }
        
        setData(generateMockData(timeRange));
        setUseMockData(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeRange, propData, threshold]);

  const stats = useMemo(() => {
    if (data.length === 0) {
      return {
        avg: 0,
        max: 0,
        min: 0,
        aboveThresholdCount: 0,
        aboveThresholdPercent: 0,
      };
    }

    const widths = data.map((d) => d.width);
    const avg = widths.reduce((sum, w) => sum + w, 0) / widths.length;
    const max = Math.max(...widths);
    const min = Math.min(...widths);
    const aboveThresholdCount = data.filter((d) => d.isAboveThreshold).length;

    return {
      avg: Number(avg.toFixed(4)),
      max: Number(max.toFixed(4)),
      min: Number(min.toFixed(4)),
      aboveThresholdCount,
      aboveThresholdPercent: Number(((aboveThresholdCount / data.length) * 100).toFixed(1)),
    };
  }, [data]);

  if (isLoading) {
    return (
      <DashboardCard title="置信区间宽度趋势" className={className}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          <span className="ml-3 text-gray-600">正在加载数据...</span>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="置信区间宽度趋势"
      headerAction={
        <div className="flex items-center gap-2">
          {useMockData && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              模拟数据
            </span>
          )}
          <div className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-500">超出阈值</span>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['24H', '7D', '30D'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      }
      className={className}
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-amber-800">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-pink-50 rounded-lg p-3 text-center">
            <p className="text-xs text-pink-600 mb-1">平均宽度</p>
            <p className="text-xl font-bold text-pink-700">{(stats.avg * 100).toFixed(2)}%</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 mb-1">最小宽度</p>
            <p className="text-xl font-bold text-green-700">{(stats.min * 100).toFixed(2)}%</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-600 mb-1">最大宽度</p>
            <p className="text-xl font-bold text-orange-700">{(stats.max * 100).toFixed(2)}%</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600 mb-1">超出阈值</p>
            <p className="text-xl font-bold text-red-700">
              {stats.aboveThresholdCount}
              <span className="text-sm font-normal text-red-500 ml-1">
                ({stats.aboveThresholdPercent}%)
              </span>
            </p>
          </div>
        </div>

        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="timestamp"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                minTickGap={timeRange === '24H' ? 20 : 40}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                domain={[0, 'auto']}
                width={50}
              />
              <Tooltip content={<CustomTooltip threshold={threshold} />} />
              <ReferenceLine
                y={threshold}
                stroke={semanticColors.danger.DEFAULT}
                strokeDasharray="5 5"
                label={{
                  value: '阈值',
                  position: 'right',
                  fill: semanticColors.danger.DEFAULT,
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="width"
                stroke={chartColors.recharts.pink}
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 5, fill: chartColors.recharts.pink, stroke: '#FFF', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {stats.aboveThresholdCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-1">检测到置信区间异常</h4>
                <p className="text-xs text-red-700">
                  在过去 {TIME_RANGE_CONFIG[timeRange].label} 内，有 {stats.aboveThresholdCount}{' '}
                  个数据点（{stats.aboveThresholdPercent}%）的置信区间宽度超过了阈值 {(threshold * 100).toFixed(1)}%
                  ，表明价格不确定性较高。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-1">关于置信区间宽度</h4>
          <p className="text-xs text-blue-800">
            置信区间宽度反映了 Pyth Network
            价格预言机的不确定性程度。宽度越大，表示价格波动性越高或数据源之间的分歧越大。当宽度超过阈值时，建议谨慎使用该价格数据。
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}
