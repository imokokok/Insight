'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Blockchain } from '@/lib/types/oracle';
import { useI18n } from '@/lib/i18n/context';

type TimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

interface PriceChartProps {
  symbol: string;
  chain: Blockchain;
  initialTimeRange?: TimeRange;
  height?: number;
  showToolbar?: boolean;
}

interface ChartData {
  timestamp: number;
  price: number;
  date: string;
}

// 生成模拟价格数据
function generateMockPriceData(timeRange: TimeRange): ChartData[] {
  const data: ChartData[] = [];
  const now = Date.now();
  let points = 24;
  let interval = 60 * 60 * 1000; // 1 hour

  switch (timeRange) {
    case '1H':
      points = 12;
      interval = 5 * 60 * 1000; // 5 minutes
      break;
    case '24H':
      points = 24;
      interval = 60 * 60 * 1000; // 1 hour
      break;
    case '7D':
      points = 28;
      interval = 6 * 60 * 60 * 1000; // 6 hours
      break;
    case '30D':
      points = 30;
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
    case '90D':
      points = 30;
      interval = 3 * 24 * 60 * 60 * 1000; // 3 days
      break;
    case '1Y':
      points = 24;
      interval = 15 * 24 * 60 * 60 * 1000; // 15 days
      break;
    case 'ALL':
      points = 30;
      interval = 30 * 24 * 60 * 60 * 1000; // 30 days
      break;
  }

  let basePrice = 2.8;
  for (let i = points; i >= 0; i--) {
    const timestamp = now - i * interval;
    const randomChange = (Math.random() - 0.5) * 0.1;
    basePrice = basePrice * (1 + randomChange);

    const date = new Date(timestamp);
    let dateStr = '';

    if (timeRange === '1H' || timeRange === '24H') {
      dateStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    data.push({
      timestamp,
      price: Number(basePrice.toFixed(4)),
      date: dateStr,
    });
  }

  return data;
}

// 自定义提示框组件
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-gray-500 text-xs mb-1">{label}</p>
        <p className="text-gray-900 font-semibold">${payload[0].value.toFixed(4)}</p>
      </div>
    );
  }
  return null;
}

export function PriceChart({
  initialTimeRange = '24H',
  height = 320,
  showToolbar = true,
}: PriceChartProps) {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const timeRanges: TimeRange[] = useMemo(() => ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'], []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 使用模拟数据
      const data = generateMockPriceData(timeRange);
      setChartData(data);
    } catch (error) {
      console.error('Error fetching price data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 计算价格变化
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { value: 0, percent: 0 };
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    const change = last - first;
    const percent = (change / first) * 100;
    return { value: change, percent };
  }, [chartData]);

  const isPositive = priceChange.percent >= 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{t('api3.priceChart.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 工具栏 */}
      {showToolbar && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t(`api3.timeRange.${range}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{t('api3.marketData.24hChange')}:</span>
            <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
              {isPositive ? '+' : ''}
              {priceChange.percent.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* 图表 */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              dy={8}
              minTickGap={30}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#1E40AF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#1E40AF' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
