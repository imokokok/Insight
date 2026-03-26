/**
 * @fileoverview useChartInteractions Hook
 * @description 管理图表交互状态（zoom、hover等）
 */

import { useState, useCallback, useRef, RefObject } from 'react';

import { type OracleProvider } from '@/types/oracle';

export function useChartInteractions() {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [hoveredOracle, setHoveredOracle] = useState<OracleProvider | null>(null);
  const [selectedPerformanceOracle, setSelectedPerformanceOracle] = useState<OracleProvider | null>(
    null
  );
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev / 1.2, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  return {
    zoomLevel,
    setZoomLevel,
    isChartFullscreen,
    setIsChartFullscreen,
    hoveredOracle,
    setHoveredOracle,
    selectedPerformanceOracle,
    setSelectedPerformanceOracle,
    chartContainerRef,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  };
}
