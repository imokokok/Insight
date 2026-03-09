'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Cell,
} from 'recharts';
import { BandProtocolClient, HistoricalPricePoint } from '@/lib/oracles/bandProtocol';
import { Blockchain } from '@/lib/types/oracle';

// 时间周期类型
type TimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y';

// 图表类型
type ChartType = 'line' | 'area';

// 图表数据点类型
interface ChartDataPoint {
  time: string;
  timestamp: number;
  price: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// 时间周期配置
const TIME_RANGE_CONFIG: Record<
  TimeRange,
  { period: '1d' | '7d' | '30d' | '90d' | '1y'; label: string }
> = {
  '1H': { period: '1d', label: '1小时' },
  '24H': { period: '1d', label: '24小时' },
  '7D': { period: '7d', label: '7天' },
  '30D': { period: '30d', label: '30天' },
  '90D': { period: '90d', label: '90天' },
  '1Y': { period: '1y', label: '1年' },
};

// Band Protocol 品牌色
const BAND_COLORS = {
  primary: '#4520E6',
  primaryLight: '#6B4DE8',
  primaryDark: '#3415B8',
  gradientStart: 'rgba(69, 32, 230, 0.4)',
  gradientEnd: 'rgba(69, 32, 230, 0.05)',
  volumeUp: 'rgba(69, 32, 230, 0.5)',
  volumeDown: 'rgba(69, 32, 230, 0.2)',
};

// 自定义 Tooltip 组件
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload: ChartDataPoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const isUp = data.close >= data.open;

  return (
    <div className="bg-white border border-purple-200 rounded-lg p-3 shadow-xl">
      <p className="text-gray-600 text-xs mb-2 font-medium">{label}</p>

      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">开盘:</span>
          <span className="text-gray-900 font-mono">${data.open.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">最高:</span>
          <span className="text-green-600 font-mono">${data.high.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">最低:</span>
          <span className="text-red-600 font-mono">${data.low.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">收盘:</span>
          <span className={`font-mono ${isUp ? 'text-green-600' : 'text-red-600'}`}>
            ${data.close.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="flex justify-between gap-4 text-xs mt-2 pt-2 border-t border-gray-200">
        <span className="text-gray-500">成交量:</span>
        <span className="text-purple-600 font-mono">{(data.volume / 1000000).toFixed(2)}M</span>
      </div>
    </div>
  );
}

// 主图表组件
interface PriceChartProps {
  symbol?: string;
  chain?: Blockchain;
  timeRange?: TimeRange;
  height?: number;
  showToolbar?: boolean;
}

export function PriceChart({
  symbol = 'BAND',
  chain = Blockchain.ETHEREUM,
  timeRange = '24H',
  height = 320,
  showToolbar = true,
}: PriceChartProps) {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  const bandClient = useMemo(() => new BandProtocolClient(), []);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 转换历史数据为图表数据
  const convertHistoricalData = useCallback(
    (historicalData: HistoricalPricePoint[], range: TimeRange): ChartDataPoint[] => {
      const config = TIME_RANGE_CONFIG[range];

      return historicalData.map((point) => {
        const date = new Date(point.timestamp);
        let timeLabel: string;

        if (config.period === '1d') {
          timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } else if (config.period === '7d') {
          timeLabel = date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
          });
        } else {
          timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        }

        return {
          time: timeLabel,
          timestamp: point.timestamp,
          price: point.close,
          volume: point.volume,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
        };
      });
    },
    []
  );

  // 获取数据
  const fetchData = useCallback(async () => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    try {
      // 获取当前价格
      const priceData = await bandClient.getPrice(symbol, chain);

      // 检查是否已取消
      if (abortController.signal.aborted) return;

      setCurrentPrice(priceData.price);

      // 获取历史价格数据
      const config = TIME_RANGE_CONFIG[timeRange];
      const historicalData = await bandClient.getHistoricalBandPrices(config.period);

      // 检查是否已取消
      if (abortController.signal.aborted) return;

      const chartData = convertHistoricalData(historicalData, timeRange);
      setData(chartData);
    } catch (error) {
      // 检查是否是取消错误
      if (error instanceof Error && error.name === 'AbortError') return;

      console.error('Error fetching price data:', error);
      // 使用默认数据
      const defaultPrice = symbol === 'BAND' ? 2.5 : 100;
      setCurrentPrice(defaultPrice);
      setData([]);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [chain, bandClient, symbol, timeRange, convertHistoricalData]);

  useEffect(() => {
    fetchData();

    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // 计算价格范围
  const priceRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100 };
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return { min: Math.max(0, min - padding), max: max + padding };
  }, [data]);

  // 计算交易量范围
  const volumeRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 1000000 };
    const volumes = data.map((d) => d.volume);
    const max = Math.max(...volumes);
    return { min: 0, max: max * 4 };
  }, [data]);

  // 价格变化
  const priceChange = useMemo(() => {
    if (data.length < 2) return { value: 0, percent: 0 };
    const first = data[0].price;
    const last = data[data.length - 1].price;
    const change = last - first;
    const percent = (change / first) * 100;
    return { value: change, percent };
  }, [data]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ height }}>
        <div className="flex items-center gap-3 text-purple-400">
          <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
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
          <span className="text-sm">加载图表数据...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 价格信息和工具栏 */}
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          {/* 左侧：价格信息 */}
          <div className="flex items-center gap-4">
            <div>
              <span className="text-2xl font-bold text-gray-900">${currentPrice.toFixed(4)}</span>
              <span
                className={`ml-2 text-sm font-medium ${
                  priceChange.percent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {priceChange.percent >= 0 ? '+' : ''}
                {priceChange.percent.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* 右侧：图表类型切换 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartType === 'line'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              折线
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartType === 'area'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              面积
            </button>
          </div>
        </div>
      )}

      {/* 图表区域 */}
      <div className="flex-1 min-h-0 bg-gray-50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={height - (showToolbar ? 80 : 0)}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {/* 渐变填充定义 */}
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BAND_COLORS.gradientStart} />
                <stop offset="100%" stopColor={BAND_COLORS.gradientEnd} />
              </linearGradient>
            </defs>

            {/* 网格线 */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeOpacity={0.5}
              vertical={false}
            />

            {/* X轴 */}
            <XAxis
              dataKey="time"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb', strokeOpacity: 0.5 }}
              minTickGap={30}
            />

            {/* 价格 Y轴（左侧） */}
            <YAxis
              yAxisId="price"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb', strokeOpacity: 0.5 }}
              domain={[priceRange.min, priceRange.max]}
              tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
              width={60}
            />

            {/* 交易量 Y轴（右侧，隐藏） */}
            <YAxis
              yAxisId="volume"
              orientation="right"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              domain={[volumeRange.min, volumeRange.max]}
              hide
            />

            {/* 自定义 Tooltip */}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: '#d1d5db',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {/* 交易量柱状图 */}
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill={BAND_COLORS.primary}
              fillOpacity={0.2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.close >= entry.open ? BAND_COLORS.volumeUp : BAND_COLORS.volumeDown}
                />
              ))}
            </Bar>

            {/* 面积图 */}
            {chartType === 'area' && (
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke={BAND_COLORS.primary}
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: BAND_COLORS.primaryDark }}
              />
            )}

            {/* 折线图 */}
            {chartType === 'line' && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke={BAND_COLORS.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: BAND_COLORS.primaryDark }}
              />
            )}

            {/* 缩放刷 */}
            <Brush
              dataKey="time"
              height={30}
              stroke={BAND_COLORS.primary}
              fill="#f3f4f6"
              tickFormatter={() => ''}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-0.5 rounded-full"
            style={{ backgroundColor: BAND_COLORS.primary }}
          />
          <span className="text-xs text-gray-500">价格</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: BAND_COLORS.volumeUp }} />
          <span className="text-xs text-gray-500">成交量</span>
        </div>
      </div>
    </div>
  );
}

export default PriceChart;
