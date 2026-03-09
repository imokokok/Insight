'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Cell,
} from 'recharts';
import { UMAClient } from '@/lib/oracles/uma';
import { Blockchain } from '@/lib/types/oracle';

// 时间周期类型
type TimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

// 图表类型
type ChartType = 'line' | 'candlestick';

// 图表数据点类型
interface ChartDataPoint {
  time: string;
  timestamp: number;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  ma7?: number;
}

// 时间周期配置
const TIME_RANGE_CONFIG: Record<TimeRange, { hours: number; interval: number; label: string }> = {
  '1H': { hours: 1, interval: 2, label: '1小时' },
  '24H': { hours: 24, interval: 30, label: '24小时' },
  '7D': { hours: 24 * 7, interval: 4, label: '7天' },
  '30D': { hours: 24 * 30, interval: 24, label: '30天' },
  '90D': { hours: 24 * 90, interval: 72, label: '90天' },
  '1Y': { hours: 24 * 365, interval: 168, label: '1年' },
  ALL: { hours: 24 * 365 * 2, interval: 336, label: '全部' },
};

// 生成模拟历史数据
function generateHistoricalData(basePrice: number, timeRange: TimeRange): ChartDataPoint[] {
  const config = TIME_RANGE_CONFIG[timeRange];
  const now = Date.now();
  const dataPoints: ChartDataPoint[] = [];

  // 根据时间范围计算数据点数量
  const totalMinutes = config.hours * 60;
  const dataCount = Math.min(Math.floor(totalMinutes / config.interval), 500);

  let currentPrice = basePrice;
  const volatility = 0.015; // 1.5% 波动率

  for (let i = dataCount; i >= 0; i--) {
    const timestamp = now - i * config.interval * 60 * 1000;
    const date = new Date(timestamp);

    // 生成价格变动
    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = currentPrice;
    const close = currentPrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    // 生成交易量（与价格波动相关）
    const volumeBase = 1000000 + Math.random() * 2000000;
    const volume = Math.floor(volumeBase * (1 + Math.abs(change) * 10));

    // 格式化时间标签
    let timeLabel: string;
    if (config.hours <= 24) {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (config.hours <= 24 * 7) {
      timeLabel = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    dataPoints.push({
      time: timeLabel,
      timestamp,
      price: close,
      volume,
      open,
      high,
      low,
      close,
    });

    currentPrice = close;
  }

  // 计算 MA7
  const dataWithMA = dataPoints.map((point, index) => {
    if (index < 6) {
      return { ...point, ma7: point.price };
    }
    const sum = dataPoints.slice(index - 6, index + 1).reduce((acc, p) => acc + p.price, 0);
    return { ...point, ma7: sum / 7 };
  });

  return dataWithMA;
}

// 自定义 Tooltip 组件
function CustomTooltip({
  active,
  payload,
  label,
  chartType,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload: ChartDataPoint }>;
  label?: string;
  chartType: ChartType;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const isUp = data.close !== undefined && data.open !== undefined ? data.close >= data.open : true;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
      <p className="text-gray-600 text-xs mb-2 font-medium">{label}</p>

      {chartType === 'candlestick' && data.open !== undefined ? (
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">开盘:</span>
            <span className="text-gray-900 font-mono">${data.open.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">最高:</span>
            <span className="text-green-600 font-mono">${data.high?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">最低:</span>
            <span className="text-red-600 font-mono">${data.low?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">收盘:</span>
            <span className={`font-mono ${isUp ? 'text-green-600' : 'text-red-600'}`}>
              ${data.close?.toFixed(4)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">价格:</span>
          <span className="text-blue-600 font-mono">${data.price.toFixed(4)}</span>
        </div>
      )}

      {data.ma7 !== undefined && chartType === 'line' && (
        <div className="flex justify-between gap-4 text-xs mt-1">
          <span className="text-gray-500">MA7:</span>
          <span className="text-amber-600 font-mono">${data.ma7.toFixed(4)}</span>
        </div>
      )}

      <div className="flex justify-between gap-4 text-xs mt-2 pt-2 border-t border-gray-200">
        <span className="text-gray-500">成交量:</span>
        <span className="text-gray-700 font-mono">{(data.volume / 1000000).toFixed(2)}M</span>
      </div>
    </div>
  );
}

// 蜡烛图自定义形状
function CandlestickShape(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: ChartDataPoint;
}) {
  const { x = 0, y = 0, width = 0, payload } = props;
  if (!payload) return null;

  const { open, high, low, close } = payload;
  if (open === undefined || high === undefined || low === undefined || close === undefined) {
    return null;
  }

  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#f43f5e'; // emerald-500 : rose-500
  const bodyHeight = Math.abs(close - open);

  // 计算 Y 坐标（这里简化处理，实际应该根据 YAxis 的 scale 计算）
  const centerX = x + width / 2;

  return (
    <g>
      {/* 影线 */}
      <line
        x1={centerX}
        y1={y}
        x2={centerX}
        y2={y + (props.height || 0)}
        stroke={color}
        strokeWidth={1}
      />
      {/* 实体 */}
      <rect
        x={x + width * 0.2}
        y={y + (isUp ? 0 : (props.height || 0) * 0.5)}
        width={width * 0.6}
        height={Math.max(bodyHeight, 2)}
        fill={color}
        rx={1}
      />
    </g>
  );
}

// 主图表组件
interface PriceChartProps {
  symbol?: string;
  chain?: Blockchain;
  initialTimeRange?: TimeRange;
  timeRange?: TimeRange;
  height?: number;
  showToolbar?: boolean;
}

export function PriceChart({
  symbol = 'UMA',
  chain = Blockchain.ETHEREUM,
  initialTimeRange = '24H',
  height = 320,
  showToolbar = true,
}: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  const umaClient = useMemo(() => new UMAClient(), []);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      const priceData = await umaClient.getPrice(symbol, chain);

      // 检查是否已取消
      if (abortController.signal.aborted) return;

      setCurrentPrice(priceData.price);

      // 生成历史数据
      const historicalData = generateHistoricalData(priceData.price, timeRange);
      setData(historicalData);
    } catch (error) {
      // 检查是否是取消错误
      if (error instanceof Error && error.name === 'AbortError') return;

      console.error('Error fetching price data:', error);
      // 使用默认价格生成数据
      const defaultPrice = symbol === 'UMA' ? 8.5 : 100;
      setCurrentPrice(defaultPrice);
      setData(generateHistoricalData(defaultPrice, timeRange));
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [chain, umaClient, symbol, timeRange]);

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
    return { min: min - padding, max: max + padding };
  }, [data]);

  // 计算交易量范围
  const volumeRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 1000000 };
    const volumes = data.map((d) => d.volume);
    const max = Math.max(...volumes);
    return { min: 0, max: max * 3 }; // 放大3倍让柱状图更矮
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
        <div className="flex items-center gap-3 text-gray-400">
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
      {/* 工具栏 */}
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

          {/* 右侧：控制按钮 */}
          <div className="flex items-center gap-2">
            {/* 图表类型切换 */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  chartType === 'line'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                折线
              </button>
              <button
                onClick={() => setChartType('candlestick')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  chartType === 'candlestick'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                蜡烛
              </button>
            </div>

            {/* 时间周期切换 */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(Object.keys(TIME_RANGE_CONFIG) as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timeRange === range
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 图表区域 */}
      <div className="flex-1 min-h-0 bg-gray-50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={height - (showToolbar ? 80 : 0)}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              content={<CustomTooltip chartType={chartType} />}
              cursor={{
                stroke: '#d1d5db',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {/* 交易量柱状图 */}
            <Bar yAxisId="volume" dataKey="volume" fill="#3b82f6" fillOpacity={0.2} stroke="none">
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.close !== undefined &&
                    entry.open !== undefined &&
                    entry.close >= entry.open
                      ? '#10b981'
                      : '#f43f5e'
                  }
                  fillOpacity={0.3}
                />
              ))}
            </Bar>

            {/* 折线图 */}
            {chartType === 'line' && (
              <>
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#2563eb' }}
                />
                {/* MA7 移动平均线 */}
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ma7"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                />
              </>
            )}

            {/* 蜡烛图 */}
            {chartType === 'candlestick' && (
              <Bar yAxisId="price" dataKey="high" shape={<CandlestickShape />} fill="transparent" />
            )}

            {/* 缩放刷 */}
            <Brush
              dataKey="time"
              height={30}
              stroke="#3b82f6"
              fill="#f3f4f6"
              tickFormatter={() => ''}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      {chartType === 'line' && (
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-blue-500 rounded-full" />
            <span className="text-xs text-gray-500">价格</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-0.5 bg-amber-500 rounded-full border-dashed"
              style={{ borderTop: '2px dashed #f59e0b' }}
            />
            <span className="text-xs text-gray-500">MA7</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500/30 rounded" />
            <span className="text-xs text-gray-500">成交量</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceChart;
