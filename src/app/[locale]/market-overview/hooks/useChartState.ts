/**
 * 图表状态管理 Hook
 * 管理图表相关的所有状态
 */

import { useState, useCallback, useRef } from 'react';

import type {
  ChartType,
  ViewType,
  TrendChartType,
  ZoomRange,
  LinkedOracle,
  SelectedAnomaly,
} from '../types';

export interface UseChartStateReturn {
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
}

/**
 * 图表状态 Hook
 */
export function useChartState(): UseChartStateReturn {
  // 图表容器引用
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // 图表类型状态
  const [activeChart, setActiveChart] = useState<ChartType>('pie');

  // 视图类型状态
  const [viewType, setViewType] = useState<ViewType>('chart');

  // 趋势图类型状态
  const [chartType, setChartType] = useState<TrendChartType>('line');

  // 选中/悬停状态
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // 链接状态
  const [linkedOracle, setLinkedOracle] = useState<LinkedOracle | null>(null);

  // 缩放状态
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);

  // 异常检测状态
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(0.1);
  const [selectedAnomaly, setSelectedAnomaly] = useState<SelectedAnomaly | null>(null);

  // 置信区间状态
  const [showConfidenceInterval, setShowConfidenceInterval] = useState<boolean>(false);

  // 重置缩放
  const resetZoom = useCallback(() => {
    setZoomRange(null);
  }, []);

  // 切换置信区间显示
  const toggleConfidenceInterval = useCallback(() => {
    setShowConfidenceInterval((prev) => !prev);
  }, []);

  return {
    chartContainerRef,
    activeChart,
    setActiveChart,
    viewType,
    setViewType,
    chartType,
    setChartType,
    selectedItem,
    setSelectedItem,
    hoveredItem,
    setHoveredItem,
    linkedOracle,
    setLinkedOracle,
    zoomRange,
    setZoomRange,
    resetZoom,
    anomalyThreshold,
    setAnomalyThreshold,
    selectedAnomaly,
    setSelectedAnomaly,
    showConfidenceInterval,
    setShowConfidenceInterval,
    toggleConfidenceInterval,
  };
}

export default useChartState;
