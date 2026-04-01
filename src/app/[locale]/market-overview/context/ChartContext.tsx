/**
 * 图表状态 Context
 * 用于管理图表相关的全局状态，减少 props drilling
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { useChartState, useComparisonState } from '../hooks';

import type {
  ChartType,
  ViewType,
  TrendChartType,
  ZoomRange,
  LinkedOracle,
  SelectedAnomaly,
  ComparisonMode,
  TVSTrendData,
} from '../types';

// ==================== Context 类型定义 ====================

interface ChartContextValue {
  // 图表容器引用
  chartContainerRef: React.RefObject<HTMLDivElement | null>;

  // 图表类型状态
  activeChart: ChartType;
  setActiveChart: (chart: ChartType) => void;

  // 视图类型状态
  viewType: ViewType;
  setViewType: (view: ViewType) => void;

  // 趋势图类型状态
  chartType: TrendChartType;
  setChartType: (type: TrendChartType) => void;

  // 选中/悬停状态
  selectedItem: string | null;
  setSelectedItem: (item: string | null) => void;
  hoveredItem: string | null;
  setHoveredItem: (item: string | null) => void;

  // 链接状态
  linkedOracle: LinkedOracle | null;
  setLinkedOracle: (link: LinkedOracle | null) => void;

  // 缩放状态
  zoomRange: ZoomRange | null;
  setZoomRange: (range: ZoomRange | null) => void;
  resetZoom: () => void;

  // 异常检测状态
  anomalyThreshold: number;
  setAnomalyThreshold: (threshold: number) => void;
  selectedAnomaly: SelectedAnomaly | null;
  setSelectedAnomaly: (anomaly: SelectedAnomaly | null) => void;

  // 置信区间状态
  showConfidenceInterval: boolean;
  setShowConfidenceInterval: (show: boolean) => void;
  toggleConfidenceInterval: () => void;

  // 对比模式状态
  comparisonMode: ComparisonMode;
  setComparisonMode: (mode: ComparisonMode) => void;
  trendComparisonData: TVSTrendData[];
  setTrendComparisonData: (data: TVSTrendData[]) => void;
  toggleComparisonMode: (mode: 'yoy' | 'mom') => void;
  clearComparison: () => void;
  generateComparisonData: (baseData: TVSTrendData[], mode: 'yoy' | 'mom') => TVSTrendData[];
}

// ==================== Context 创建 ====================

const ChartContext = createContext<ChartContextValue | null>(null);

// ==================== Provider 组件 ====================

interface ChartProviderProps {
  children: React.ReactNode;
}

export function ChartProvider({ children }: ChartProviderProps) {
  // 使用拆分后的 hooks
  const chartState = useChartState();
  const comparisonState = useComparisonState();

  // 合并所有状态
  const value = useMemo<ChartContextValue>(
    () => ({
      ...chartState,
      ...comparisonState,
    }),
    [chartState, comparisonState]
  );

  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>;
}

// ==================== Hook ====================

export function useChartContext(): ChartContextValue {
  const context = useContext(ChartContext);

  if (!context) {
    throw new Error('useChartContext must be used within a ChartProvider');
  }

  return context;
}

// ==================== 便捷 Hooks ====================

/**
 * 仅获取图表类型相关状态
 */
export function useChartType() {
  const { activeChart, setActiveChart, viewType, setViewType, chartType, setChartType } =
    useChartContext();

  return {
    activeChart,
    setActiveChart,
    viewType,
    setViewType,
    chartType,
    setChartType,
  };
}

/**
 * 仅获取选中/悬停状态
 */
export function useChartSelection() {
  const { selectedItem, setSelectedItem, hoveredItem, setHoveredItem } = useChartContext();

  return {
    selectedItem,
    setSelectedItem,
    hoveredItem,
    setHoveredItem,
  };
}

/**
 * 仅获取缩放和异常检测状态
 */
export function useChartInteraction() {
  const {
    zoomRange,
    setZoomRange,
    resetZoom,
    anomalyThreshold,
    setAnomalyThreshold,
    selectedAnomaly,
    setSelectedAnomaly,
  } = useChartContext();

  return {
    zoomRange,
    setZoomRange,
    resetZoom,
    anomalyThreshold,
    setAnomalyThreshold,
    selectedAnomaly,
    setSelectedAnomaly,
  };
}

/**
 * 仅获取对比模式状态
 */
export function useChartComparison() {
  const {
    comparisonMode,
    setComparisonMode,
    trendComparisonData,
    setTrendComparisonData,
    toggleComparisonMode,
    clearComparison,
    generateComparisonData,
  } = useChartContext();

  return {
    comparisonMode,
    setComparisonMode,
    trendComparisonData,
    setTrendComparisonData,
    toggleComparisonMode,
    clearComparison,
    generateComparisonData,
  };
}

export default ChartContext;
