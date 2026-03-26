/**
 * @fileoverview 图表组件类型定义
 * @description 定义所有图表相关的类型，包括 Recharts 扩展和通用图表类型
 */

import { type ReactNode } from 'react';

import { type OracleProvider } from '../oracle';

// ============================================================================
// 基础图表数据类型
// ============================================================================

/**
 * 基础图表数据点
 */
export interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
  color?: string;
}

/**
 * 时间序列数据点
 */
export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * 多维度图表数据点
 */
export interface MultiDimensionDataPoint {
  name: string;
  [key: string]: string | number | Date | undefined;
}

// ============================================================================
// 图表 Props 类型
// ============================================================================

/**
 * 基础图表 Props
 */
export interface BaseChartProps {
  data: ChartDataPoint[] | TimeSeriesDataPoint[];
  width?: number | string;
  height?: number;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyText?: string;
}

/**
 * 折线图 Props
 */
export interface LineChartProps extends BaseChartProps {
  lines: Array<{
    key: string;
    name: string;
    color: string;
    strokeWidth?: number;
    dashed?: boolean;
    dot?: boolean;
  }>;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  xAxisType?: 'number' | 'category' | 'time';
  yAxisDomain?: [number, number] | 'auto';
  onPointClick?: (data: ChartDataPoint, index: number) => void;
}

/**
 * 柱状图 Props
 */
export interface BarChartProps extends BaseChartProps {
  bars: Array<{
    key: string;
    name: string;
    color: string;
    stackId?: string;
  }>;
  layout?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  onBarClick?: (data: ChartDataPoint, index: number) => void;
}

/**
 * 面积图 Props
 */
export interface AreaChartProps extends BaseChartProps {
  areas: Array<{
    key: string;
    name: string;
    color: string;
    fillOpacity?: number;
    strokeWidth?: number;
    stackId?: string;
  }>;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

/**
 * 饼图 Props
 */
export interface PieChartProps extends BaseChartProps {
  nameKey: string;
  valueKey: string;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  showLabels?: boolean;
  onSliceClick?: (data: ChartDataPoint, index: number) => void;
}

/**
 * 散点图 Props
 */
export interface ScatterChartProps extends BaseChartProps {
  xKey: string;
  yKey: string;
  color?: string;
  pointSize?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  onPointClick?: (data: ChartDataPoint, index: number) => void;
}

/**
 * 热力图 Props
 */
export interface HeatmapProps extends BaseChartProps {
  xLabels: string[];
  yLabels: string[];
  colorScale?: string[];
  minValue?: number;
  maxValue?: number;
  showTooltip?: boolean;
  onCellClick?: (x: string, y: string, value: number) => void;
}

/**
 * 热力图单元格
 */
export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  color?: string;
}

// ============================================================================
// 图表工具类型
// ============================================================================

/**
 * 图表工具栏操作类型
 */
export type ChartToolbarAction = 'zoomIn' | 'zoomOut' | 'reset' | 'download' | 'fullscreen';

/**
 * 图表工具栏 Props
 */
export interface ChartToolbarProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  disabledActions?: ChartToolbarAction[];
  title?: string;
}

/**
 * 图表图例 Props
 */
export interface ChartLegendProps {
  items: Array<{
    key: string;
    name: string;
    color: string;
    disabled?: boolean;
  }>;
  onToggle?: (key: string) => void;
  layout?: 'horizontal' | 'vertical';
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

/**
 * 图表提示框 Props
 */
export interface ChartTooltipProps<T = Record<string, unknown>> {
  active?: boolean;
  payload?: TooltipPayload<T>[];
  label?: string;
  formatter?: (value: number, name: string, props: T) => ReactNode;
  labelFormatter?: (label: string) => string;
}

// ============================================================================
// Recharts 特定类型
// ============================================================================

/**
 * Tooltip Payload 类型
 */
export interface TooltipPayload<T = Record<string, unknown>> {
  name: string;
  value: number | string;
  color: string;
  dataKey: string;
  payload: T;
}

/**
 * 自定义点 Props
 */
export interface CustomDotProps<T = Record<string, unknown>> {
  cx?: number;
  cy?: number;
  payload?: T;
  value?: number;
  index?: number;
}

/**
 * 自定义标签 Props
 */
export interface CustomLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  index?: number;
  value?: number;
  name?: string;
}

/**
 * 图例点击事件
 */
export interface LegendClickEvent {
  dataKey: string;
  color: string;
  type: string;
  value: string;
}

/**
 * 散点形状 Props
 */
export interface ScatterShapeProps {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  payload?: Record<string, unknown>;
}

// ============================================================================
// 统计摘要类型
// ============================================================================

/**
 * 统计摘要
 */
export interface StatsSummary {
  label: string;
  value: number | string;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'neutral';
}

// ============================================================================
// 价格图表特定类型
// ============================================================================

/**
 * 价格图表数据点
 */
export interface PriceChartDataPoint {
  timestamp: number;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  provider?: OracleProvider;
}

/**
 * 价格图表 Props
 */
export interface PriceChartProps extends BaseChartProps {
  symbol: string;
  provider?: OracleProvider;
  showVolume?: boolean;
  showMA?: boolean;
  maPeriods?: number[];
  showBollingerBands?: boolean;
  timeRange?: '1H' | '24H' | '7D' | '30D' | '90D' | '1Y';
  onTimeRangeChange?: (range: string) => void;
}

/**
 * 价格偏差数据点
 */
export interface PriceDeviationDataPoint {
  timestamp: string;
  rawTimestamp: number;
  fullTimestamp?: Date;
  avgPrice?: number;
  stdDev?: number;
  upperBound1?: number;
  lowerBound1?: number;
  upperBound2?: number;
  lowerBound2?: number;
  oracleCount?: number;
  [key: string]: string | number | Date | undefined;
}

/**
 * 箱线图数据
 */
export interface BoxPlotData {
  name: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
}

/**
 * 波动性数据
 */
export interface VolatilityData {
  timestamp: number;
  volatility: number;
  price: number;
}

/**
 * 相关性数据
 */
export interface CorrelationData {
  oracle1: OracleProvider;
  oracle2: OracleProvider;
  correlation: number;
  sampleSize: number;
}

// ============================================================================
// 技术指标类型
// ============================================================================

/**
 * 移动平均线数据
 */
export interface MovingAverageData {
  timestamp: number;
  value: number;
  ma5?: number;
  ma10?: number;
  ma20?: number;
  ma50?: number;
  ma200?: number;
}

/**
 * 布林带数据
 */
export interface BollingerBandsData {
  timestamp: number;
  middle: number;
  upper: number;
  lower: number;
  bandwidth: number;
}

/**
 * RSI 数据
 */
export interface RSIData {
  timestamp: number;
  rsi: number;
  overbought: boolean;
  oversold: boolean;
}

/**
 * MACD 数据
 */
export interface MACDData {
  timestamp: number;
  macd: number;
  signal: number;
  histogram: number;
}

// ============================================================================
// 图表配置类型
// ============================================================================

/**
 * 图表主题配置
 */
export interface ChartTheme {
  colors: string[];
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  tooltipBackground: string;
  tooltipTextColor: string;
}

/**
 * 图表动画配置
 */
export interface ChartAnimationConfig {
  duration: number;
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay?: number;
}

/**
 * 图表配置
 */
export interface ChartConfig {
  theme: ChartTheme;
  animation?: ChartAnimationConfig;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

// ============================================================================
// 图表事件类型
// ============================================================================

/**
 * 图表点击事件
 */
export interface ChartClickEvent<T = Record<string, unknown>> {
  data: T;
  index: number;
  x: number;
  y: number;
}

/**
 * 图表悬停事件
 */
export interface ChartHoverEvent<T = Record<string, unknown>> {
  data: T;
  index: number;
  x: number;
  y: number;
}

/**
 * 图表缩放事件
 */
export interface ChartZoomEvent {
  scale: number;
  x: number;
  y: number;
}
