'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from 'recharts';
import { Icons } from './Icons';
import { CustomTooltip } from './CustomTooltip';
import { CustomLegend } from './CustomLegend';
import { QueryResult, oracleColors, oracleI18nKeys } from '../constants';
import { createLogger } from '@/lib/utils/logger';
import { useAPI3Price } from '@/hooks/useAPI3WebSocket';
import { API3PriceData } from '@/lib/services/api3WebSocket';
import { format } from 'date-fns';
import { chartColors, semanticColors, baseColors } from '@/lib/config/colors';

const logger = createLogger('price-query-PriceChartRealtime');

export interface RealtimeChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: unknown;
}

interface PriceChartRealtimeProps {
  initialChartData: RealtimeChartDataPoint[];
  queryResults: QueryResult[];
  hiddenSeries: Set<string>;
  onToggleSeries: (seriesName: string) => void;
  selectedTimeRange: number;
  selectedRow: string | null;
  symbol?: string; // API3 币种符号
  enableRealtime?: boolean;
  updateInterval?: number; // 更新频率控制（毫秒）
  maxDataPoints?: number; // 最大数据点数量
}

// 价格闪烁动画组件
function PriceFlashIndicator({
  direction,
  isActive,
}: {
  direction: 'up' | 'down' | null;
  isActive: boolean;
}) {
  if (!isActive || !direction) return null;

  return (
    <div
      className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold animate-pulse ${
        direction === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
      }`}
    >
      {direction === 'up' ? '↑' : '↓'} 实时更新
    </div>
  );
}

// 连接状态指示器
function ConnectionStatusIndicator({
  status,
  lastUpdate,
}: {
  status: string;
  lastUpdate: Date | null;
}) {
  const statusConfig = {
    connected: { color: 'bg-green-500', text: '已连接', animate: '' },
    connecting: { color: 'bg-yellow-500', text: '连接中...', animate: 'animate-pulse' },
    reconnecting: { color: 'bg-orange-500', text: '重连中...', animate: 'animate-pulse' },
    disconnected: { color: 'bg-gray-400', text: '已断开', animate: '' },
    error: { color: 'bg-red-500', text: '连接错误', animate: '' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className={`w-2 h-2 ${config.color} ${config.animate}`} />
      <span>{config.text}</span>
      {lastUpdate && (
        <span className="text-gray-400">· 最后更新: {lastUpdate.toLocaleTimeString()}</span>
      )}
    </div>
  );
}

export function PriceChartRealtime({
  initialChartData,
  queryResults,
  hiddenSeries,
  onToggleSeries,
  selectedTimeRange: _selectedTimeRange,
  selectedRow,
  symbol = 'API3',
  enableRealtime = true,
  updateInterval = 1000, // 默认1秒更新一次
  maxDataPoints = 100, // 默认保留100个数据点
}: PriceChartRealtimeProps) {
  const t = useTranslations();
  const [chartData, setChartData] = useState<RealtimeChartDataPoint[]>(initialChartData);
  const [flashDirection, setFlashDirection] = useState<'up' | 'down' | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPriceRef = useRef<number | null>(null);

  // API3 WebSocket 实时价格
  const { priceData, status, lastUpdate } = useAPI3Price({
    symbol,
    enabled: enableRealtime,
    updateInterval,
    onPriceUpdate: (data: API3PriceData) => {
      handleRealtimeUpdate(data);
    },
  });

  // 处理实时更新
  const handleRealtimeUpdate = useCallback(
    (data: API3PriceData) => {
      // 检测价格变化方向
      if (lastPriceRef.current !== null) {
        const direction = data.price > lastPriceRef.current ? 'up' : 'down';
        setFlashDirection(direction);
        setIsFlashing(true);

        // 清除之前的闪烁定时器
        if (flashTimeoutRef.current) {
          clearTimeout(flashTimeoutRef.current);
        }

        // 500ms后停止闪烁
        flashTimeoutRef.current = setTimeout(() => {
          setIsFlashing(false);
          setFlashDirection(null);
        }, 500);
      }

      lastPriceRef.current = data.price;

      // 添加新数据点
      setChartData((prevData) => {
        const newDataPoint: RealtimeChartDataPoint = {
          timestamp: data.timestamp,
          time: format(data.timestamp, 'HH:mm:ss'),
          [`${symbol}_API3`]: data.price,
        };

        // 合并新数据并限制数据点数量
        const newData = [...prevData, newDataPoint];
        if (newData.length > maxDataPoints) {
          return newData.slice(newData.length - maxDataPoints);
        }
        return newData;
      });
    },
    [symbol, maxDataPoints]
  );

  // 清理定时器
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  // 同步初始数据
  useEffect(() => {
    setChartData(initialChartData);
  }, [initialChartData]);

  const generateFilename = useCallback((extension: string): string => {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    return `price-query-${timestamp}.${extension}`;
  }, []);

  const handleExportChart = useCallback(async () => {
    const chartContainer = document.querySelector('.recharts-wrapper');
    if (!chartContainer) return;

    try {
      const svgElement = chartContainer.querySelector('svg');
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.fillStyle = chartColors.recharts.white;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = generateFilename('png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (error) {
      logger.error(
        'Failed to export chart',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, [generateFilename]);

  const legendPayload = useMemo(() => {
    const payload = queryResults.map(({ provider, chain }) => {
      const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
      return { value: label, color: oracleColors[provider] };
    });

    // 添加 API3 实时数据到图例
    if (enableRealtime) {
      payload.push({
        value: `${symbol} (API3 WebSocket)`,
        color: semanticColors.success.main,
      });
    }

    return payload;
  }, [queryResults, t, enableRealtime, symbol]);

  // 计算价格范围
  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0 };

    const prices = chartData
      .map((d) => d[`${symbol}_API3`] as number)
      .filter((p) => typeof p === 'number' && !isNaN(p));

    if (prices.length === 0) return { min: 0, max: 0 };

    return {
      min: Math.min(...prices) * 0.99,
      max: Math.max(...prices) * 1.01,
    };
  }, [chartData, symbol]);

  // 获取线条透明度
  const getLineOpacity = useCallback(
    (provider: string, chain: string): number => {
      if (!selectedRow) return 1;
      const rowKey = `${provider}-${chain}`;
      return selectedRow === rowKey ? 1 : 0.2;
    },
    [selectedRow]
  );

  // 获取线条粗细
  const getLineStrokeWidth = useCallback(
    (provider: string, chain: string): number => {
      if (!selectedRow) return 2;
      const rowKey = `${provider}-${chain}`;
      return selectedRow === rowKey ? 3 : 1;
    },
    [selectedRow]
  );

  if (chartData.length === 0) return null;

  const api3Label = `${symbol}_API3`;
  const isApi3Hidden = hiddenSeries.has(api3Label);

  return (
    <div className="mb-8 pb-8 border-b border-gray-200 relative">
      <PriceFlashIndicator direction={flashDirection} isActive={isFlashing} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icons.chart />
            {t('priceQuery.chart.title')}
            {enableRealtime && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200">
                实时
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatusIndicator status={status} lastUpdate={lastUpdate} />
          <button
            onClick={handleExportChart}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            title={t('priceQuery.chart.exportImage')}
          >
            <Icons.image />
            {t('priceQuery.chart.exportImage')}
          </button>
        </div>
      </div>

      {/* 实时价格显示 */}
      {enableRealtime && priceData && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-600 font-medium">{symbol} 实时价格</p>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-bold transition-all duration-300 ${
                    flashDirection === 'up'
                      ? 'text-green-600 scale-105'
                      : flashDirection === 'down'
                        ? 'text-red-600 scale-105'
                        : 'text-gray-900'
                  }`}
                >
                  ${priceData.price.toFixed(6)}
                </span>
                {priceData.change24h !== undefined && (
                  <span
                    className={`text-sm font-medium ${
                      priceData.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {priceData.change24h >= 0 ? '+' : ''}
                    {priceData.change24h.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>24h 最高: ${priceData.high24h?.toFixed(6) || '-'}</p>
              <p>24h 最低: ${priceData.low24h?.toFixed(6) || '-'}</p>
              <p>24h 成交量: ${priceData.volume24h?.toFixed(2) || '-'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
              <defs>
                <linearGradient id="colorApi3Realtime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={semanticColors.success.main} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={semanticColors.success.main} stopOpacity={0} />
                </linearGradient>

                {queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}`;
                  const color = oracleColors[provider];
                  return (
                    <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.recharts.grid}
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.secondaryAxis }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                domain={[priceRange.min || 'auto', priceRange.max || 'auto']}
                tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.secondaryAxis }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={
                  <CustomLegend
                    payload={legendPayload}
                    onToggleSeries={onToggleSeries}
                    hiddenSeries={hiddenSeries}
                  />
                }
              />

              {/* API3 实时价格区域填充 */}
              {enableRealtime && !isApi3Hidden && (
                <Area
                  type="monotone"
                  dataKey={api3Label}
                  stroke="none"
                  fill="url(#colorApi3Realtime)"
                  fillOpacity={isFlashing ? 0.5 : 0.3}
                  yAxisId="left"
                  baseLine={undefined}
                />
              )}

              {/* 原始查询结果价格线 */}
              {queryResults.map(({ provider, chain }) => {
                const key = `${provider}-${chain}`;
                const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                const color = oracleColors[provider];
                const isHidden = hiddenSeries.has(label);
                const opacity = getLineOpacity(provider, chain);
                const strokeWidth = getLineStrokeWidth(provider, chain);

                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={label}
                    name={label}
                    stroke={isHidden ? 'transparent' : color}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    dot={false}
                    activeDot={
                      isHidden
                        ? false
                        : { r: selectedRow === `${provider}-${chain}` ? 6 : 5, strokeWidth: 0 }
                    }
                    yAxisId="left"
                  />
                );
              })}

              {/* API3 实时价格线 */}
              {enableRealtime && (
                <Line
                  type="monotone"
                  dataKey={api3Label}
                  name={`${symbol} (API3 WebSocket)`}
                  stroke={isApi3Hidden ? 'transparent' : semanticColors.success.main}
                  strokeWidth={isFlashing ? 4 : 3}
                  strokeOpacity={isApi3Hidden ? 0 : isFlashing ? 1 : 0.9}
                  dot={false}
                  activeDot={
                    isApi3Hidden
                      ? false
                      : {
                          r: 6,
                          strokeWidth: 2,
                          stroke: chartColors.recharts.white,
                          fill:
                            flashDirection === 'up'
                              ? semanticColors.success.main
                              : flashDirection === 'down'
                                ? semanticColors.danger.main
                                : semanticColors.success.main,
                        }
                  }
                  yAxisId="left"
                  animationDuration={300}
                />
              )}

              <Brush
                dataKey="time"
                height={30}
                stroke={chartColors.recharts.secondaryAxis}
                fill={chartColors.recharts.grid}
                travellerWidth={8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default PriceChartRealtime;
