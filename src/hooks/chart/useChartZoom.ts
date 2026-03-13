/**
 * 图表缩放控制 Hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ZoomState {
  startIndex: number;
  endIndex: number;
  scale: number;
}

export interface UseChartZoomOptions {
  dataLength: number;
  minZoomRange?: number; // 最小缩放范围（数据点数量）
  maxZoomRange?: number; // 最大缩放范围（数据点数量）
  defaultZoom?: number; // 默认缩放比例 (0-1)
}

export function useChartZoom(options: UseChartZoomOptions) {
  const { 
    dataLength, 
    minZoomRange = 10, 
    maxZoomRange,
    defaultZoom = 1 
  } = options;

  const maxRange = maxZoomRange || dataLength;
  const defaultRange = Math.max(minZoomRange, Math.floor(dataLength * defaultZoom));
  
  const [zoomState, setZoomState] = useState<ZoomState>({
    startIndex: Math.max(0, dataLength - defaultRange),
    endIndex: dataLength - 1,
    scale: defaultZoom,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startRange = useRef({ start: 0, end: 0 });

  // 重置缩放
  const resetZoom = useCallback(() => {
    setZoomState({
      startIndex: 0,
      endIndex: dataLength - 1,
      scale: 1,
    });
  }, [dataLength]);

  // 缩放操作
  const zoom = useCallback((factor: number, centerIndex?: number) => {
    setZoomState(prev => {
      const currentRange = prev.endIndex - prev.startIndex;
      const newRange = Math.max(
        minZoomRange,
        Math.min(maxRange, Math.floor(currentRange / factor))
      );
      
      const center = centerIndex ?? Math.floor((prev.startIndex + prev.endIndex) / 2);
      let newStart = Math.max(0, center - Math.floor(newRange / 2));
      let newEnd = Math.min(dataLength - 1, newStart + newRange);
      
      // 调整起始位置以确保范围正确
      if (newEnd - newStart < newRange) {
        newStart = Math.max(0, newEnd - newRange);
      }
      
      return {
        startIndex: newStart,
        endIndex: newEnd,
        scale: newRange / dataLength,
      };
    });
  }, [dataLength, minZoomRange, maxRange]);

  // 平移操作
  const pan = useCallback((delta: number) => {
    setZoomState(prev => {
      const range = prev.endIndex - prev.startIndex;
      let newStart = prev.startIndex + delta;
      let newEnd = prev.endIndex + delta;
      
      // 边界检查
      if (newStart < 0) {
        newStart = 0;
        newEnd = range;
      }
      if (newEnd >= dataLength) {
        newEnd = dataLength - 1;
        newStart = newEnd - range;
      }
      
      return {
        startIndex: newStart,
        endIndex: newEnd,
        scale: prev.scale,
      };
    });
  }, [dataLength]);

  // 设置特定范围
  const setRange = useCallback((startIndex: number, endIndex: number) => {
    const clampedStart = Math.max(0, Math.min(startIndex, dataLength - 1));
    const clampedEnd = Math.max(clampedStart + minZoomRange - 1, Math.min(endIndex, dataLength - 1));
    
    setZoomState({
      startIndex: clampedStart,
      endIndex: clampedEnd,
      scale: (clampedEnd - clampedStart + 1) / dataLength,
    });
  }, [dataLength, minZoomRange]);

  // 鼠标滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoom(factor);
  }, [zoom]);

  // 鼠标拖拽平移
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startRange.current = { start: zoomState.startIndex, end: zoomState.endIndex };
  }, [zoomState]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const deltaX = e.clientX - startX.current;
    const containerWidth = container.clientWidth;
    const dataRange = startRange.current.end - startRange.current.start;
    const deltaIndex = Math.round((deltaX / containerWidth) * dataRange);
    
    pan(-deltaIndex);
  }, [pan]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // 触摸手势支持
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    lastTouch.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !lastTouch.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastTouch.current.x;
    
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const dataRange = zoomState.endIndex - zoomState.startIndex;
    const deltaIndex = Math.round((deltaX / containerWidth) * dataRange);
    
    if (Math.abs(deltaIndex) >= 1) {
      pan(-deltaIndex);
      lastTouch.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [pan, zoomState]);

  const handleTouchEnd = useCallback(() => {
    touchStart.current = null;
    lastTouch.current = null;
  }, []);

  // 清理
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return {
    zoomState,
    containerRef,
    zoom,
    pan,
    resetZoom,
    setRange,
    handlers: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    visibleDataCount: zoomState.endIndex - zoomState.startIndex + 1,
  };
}
