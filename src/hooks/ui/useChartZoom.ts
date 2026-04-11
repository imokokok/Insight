/* eslint-disable max-lines-per-function */
'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useChartZoom');

// 缩放状态
export interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

// 缩放历史记录
export interface ZoomHistoryEntry {
  scale: number;
  translateX: number;
  translateY: number;
  timestamp: number;
}

// 缩放配置
export interface ZoomConfig {
  minScale?: number;
  maxScale?: number;
  scaleStep?: number;
  enablePan?: boolean;
  enableWheel?: boolean;
  enablePinch?: boolean;
  enableDoubleClick?: boolean;
  preserveAspectRatio?: boolean;
  bounds?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
}

// 默认配置
const DEFAULT_CONFIG: Required<ZoomConfig> = {
  minScale: 0.1,
  maxScale: 10,
  scaleStep: 0.1,
  enablePan: true,
  enableWheel: true,
  enablePinch: true,
  enableDoubleClick: true,
  preserveAspectRatio: true,
  bounds: {
    minX: -Infinity,
    maxX: Infinity,
    minY: -Infinity,
    maxY: Infinity,
  },
};

export interface UseChartZoomOptions {
  config?: ZoomConfig;
  initialScale?: number;
  initialTranslateX?: number;
  initialTranslateY?: number;
  maxHistorySize?: number;
  onZoomChange?: (state: ZoomState) => void;
  onPanChange?: (state: ZoomState) => void;
}

export interface UseChartZoomReturn {
  // 当前状态
  scale: number;
  translateX: number;
  translateY: number;
  isZooming: boolean;
  isPanning: boolean;

  // 历史记录
  canUndo: boolean;
  canRedo: boolean;
  history: ZoomHistoryEntry[];
  currentHistoryIndex: number;

  // 操作方法
  zoomIn: (centerX?: number, centerY?: number) => void;
  zoomOut: (centerX?: number, centerY?: number) => void;
  zoomTo: (scale: number, centerX?: number, centerY?: number) => void;
  resetZoom: () => void;
  pan: (deltaX: number, deltaY: number) => void;
  panTo: (x: number, y: number) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // 事件处理器
  handleWheel: (event: React.WheelEvent) => void;
  handleMouseDown: (event: React.MouseEvent) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleDoubleClick: (event: React.MouseEvent) => void;
  handleTouchStart: (event: React.TouchEvent) => void;
  handleTouchMove: (event: React.TouchEvent) => void;
  handleTouchEnd: () => void;

  // 变换样式
  transformStyle: React.CSSProperties;
}

/**
 * 图表缩放 Hook
 * - 封装缩放和平移逻辑
 * - 支持缩放级别限制
 * - 缩放历史记录
 */
export function useChartZoom(options: UseChartZoomOptions = {}): UseChartZoomReturn {
  const {
    config: userConfig,
    initialScale = 1,
    initialTranslateX = 0,
    initialTranslateY = 0,
    maxHistorySize = 50,
    onZoomChange,
    onPanChange,
  } = options;

  // 合并配置
  const config = useMemo(() => {
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      bounds: { ...DEFAULT_CONFIG.bounds, ...userConfig?.bounds },
    };
  }, [userConfig]);

  // 当前缩放状态
  const [scale, setScale] = useState(initialScale);
  const [translateX, setTranslateX] = useState(initialTranslateX);
  const [translateY, setTranslateY] = useState(initialTranslateY);
  const [isZooming, setIsZooming] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // 历史记录
  const [history, setHistory] = useState<ZoomHistoryEntry[]>(() => [
    {
      scale: initialScale,
      translateX: initialTranslateX,
      translateY: initialTranslateY,
      timestamp: 0,
    },
  ]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

  // 拖拽状态
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialTranslateX: 0,
    initialTranslateY: 0,
  });

  // 触摸状态（用于捏合缩放）
  const touchRef = useRef({
    isTouching: false,
    startDistance: 0,
    startScale: 1,
    startTranslateX: 0,
    startTranslateY: 0,
    lastTouchX: 0,
    lastTouchY: 0,
  });

  // 缩放防抖
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 计算是否可以撤销/重做
  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < history.length - 1;

  // 限制缩放值
  const clampScale = useCallback(
    (value: number) => {
      return Math.max(config.minScale, Math.min(config.maxScale, value));
    },
    [config.minScale, config.maxScale]
  );

  // 限制平移值
  const clampTranslate = useCallback(
    (x: number, y: number) => {
      const { bounds } = config;
      return {
        x: Math.max(bounds.minX ?? -Infinity, Math.min(bounds.maxX ?? Infinity, x)),
        y: Math.max(bounds.minY ?? -Infinity, Math.min(bounds.maxY ?? Infinity, y)),
      };
    },

    [config]
  );

  // 添加到历史记录
  const addToHistory = useCallback(
    (newState: ZoomState) => {
      setHistory((prev) => {
        // 移除当前索引之后的历史记录
        const newHistory = prev.slice(0, currentHistoryIndex + 1);

        // 添加新记录
        const entry: ZoomHistoryEntry = {
          ...newState,
          timestamp: Date.now(),
        };

        newHistory.push(entry);

        // 限制历史记录大小
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }

        return newHistory;
      });

      setCurrentHistoryIndex((prev) => Math.min(prev + 1, maxHistorySize - 1));
    },
    [currentHistoryIndex, maxHistorySize]
  );

  // 更新状态并触发回调
  const updateState = useCallback(
    (newScale: number, newTranslateX: number, newTranslateY: number, addHistory = true) => {
      const clampedScale = clampScale(newScale);
      const clampedTranslate = clampTranslate(newTranslateX, newTranslateY);

      setScale(clampedScale);
      setTranslateX(clampedTranslate.x);
      setTranslateY(clampedTranslate.y);

      if (addHistory) {
        addToHistory({
          scale: clampedScale,
          translateX: clampedTranslate.x,
          translateY: clampedTranslate.y,
        });
      }

      onZoomChange?.({
        scale: clampedScale,
        translateX: clampedTranslate.x,
        translateY: clampedTranslate.y,
      });
    },
    [clampScale, clampTranslate, addToHistory, onZoomChange]
  );

  // 放大
  const zoomIn = useCallback(
    (centerX?: number, centerY?: number) => {
      const newScale = clampScale(scale * (1 + config.scaleStep));

      if (centerX !== undefined && centerY !== undefined) {
        // 以指定点为中心缩放
        const scaleRatio = newScale / scale;
        const newTranslateX = centerX - (centerX - translateX) * scaleRatio;
        const newTranslateY = centerY - (centerY - translateY) * scaleRatio;
        updateState(newScale, newTranslateX, newTranslateY);
      } else {
        updateState(newScale, translateX, translateY);
      }

      logger.debug('Zoom in', { newScale, centerX, centerY });
    },
    [scale, translateX, translateY, config.scaleStep, clampScale, updateState]
  );

  // 缩小
  const zoomOut = useCallback(
    (centerX?: number, centerY?: number) => {
      const newScale = clampScale(scale / (1 + config.scaleStep));

      if (centerX !== undefined && centerY !== undefined) {
        // 以指定点为中心缩放
        const scaleRatio = newScale / scale;
        const newTranslateX = centerX - (centerX - translateX) * scaleRatio;
        const newTranslateY = centerY - (centerY - translateY) * scaleRatio;
        updateState(newScale, newTranslateX, newTranslateY);
      } else {
        updateState(newScale, translateX, translateY);
      }

      logger.debug('Zoom out', { newScale, centerX, centerY });
    },
    [scale, translateX, translateY, config.scaleStep, clampScale, updateState]
  );

  // 缩放到指定级别
  const zoomTo = useCallback(
    (targetScale: number, centerX?: number, centerY?: number) => {
      const newScale = clampScale(targetScale);

      if (centerX !== undefined && centerY !== undefined) {
        const scaleRatio = newScale / scale;
        const newTranslateX = centerX - (centerX - translateX) * scaleRatio;
        const newTranslateY = centerY - (centerY - translateY) * scaleRatio;
        updateState(newScale, newTranslateX, newTranslateY);
      } else {
        updateState(newScale, translateX, translateY);
      }

      logger.debug('Zoom to', { targetScale, centerX, centerY });
    },
    [scale, translateX, translateY, clampScale, updateState]
  );

  // 重置缩放
  const resetZoom = useCallback(() => {
    updateState(initialScale, initialTranslateX, initialTranslateY);
    logger.debug('Zoom reset');
  }, [initialScale, initialTranslateX, initialTranslateY, updateState]);

  // 平移
  const pan = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!config.enablePan) return;

      const newTranslateX = translateX + deltaX;
      const newTranslateY = translateY + deltaY;
      const clampedTranslate = clampTranslate(newTranslateX, newTranslateY);

      setTranslateX(clampedTranslate.x);
      setTranslateY(clampedTranslate.y);

      onPanChange?.({
        scale,
        translateX: clampedTranslate.x,
        translateY: clampedTranslate.y,
      });
    },
    [config.enablePan, translateX, translateY, scale, clampTranslate, onPanChange]
  );

  // 平移到指定位置
  const panTo = useCallback(
    (x: number, y: number) => {
      if (!config.enablePan) return;

      const clampedTranslate = clampTranslate(x, y);
      updateState(scale, clampedTranslate.x, clampedTranslate.y);
    },
    [config.enablePan, scale, clampTranslate, updateState]
  );

  // 撤销
  const undo = useCallback(() => {
    if (!canUndo) return;

    const newIndex = currentHistoryIndex - 1;
    const entry = history[newIndex];

    setCurrentHistoryIndex(newIndex);
    setScale(entry.scale);
    setTranslateX(entry.translateX);
    setTranslateY(entry.translateY);

    onZoomChange?.({
      scale: entry.scale,
      translateX: entry.translateX,
      translateY: entry.translateY,
    });

    logger.debug('Undo zoom', { newIndex });
  }, [canUndo, currentHistoryIndex, history, onZoomChange]);

  // 重做
  const redo = useCallback(() => {
    if (!canRedo) return;

    const newIndex = currentHistoryIndex + 1;
    const entry = history[newIndex];

    setCurrentHistoryIndex(newIndex);
    setScale(entry.scale);
    setTranslateX(entry.translateX);
    setTranslateY(entry.translateY);

    onZoomChange?.({
      scale: entry.scale,
      translateX: entry.translateX,
      translateY: entry.translateY,
    });

    logger.debug('Redo zoom', { newIndex });
  }, [canRedo, currentHistoryIndex, history, onZoomChange]);

  // 清空历史
  const clearHistory = useCallback(() => {
    setHistory([
      {
        scale,
        translateX,
        translateY,
        timestamp: Date.now(),
      },
    ]);
    setCurrentHistoryIndex(0);
    logger.debug('History cleared');
  }, [scale, translateX, translateY]);

  // 处理滚轮事件
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!config.enableWheel) return;

      event.preventDefault();

      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const centerX = event.clientX - rect.left;
      const centerY = event.clientY - rect.top;

      const delta = event.deltaY > 0 ? -1 : 1;
      const _newScale = clampScale(scale * (1 + delta * config.scaleStep));

      setIsZooming(true);

      // 防抖清除缩放状态
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      zoomTimeoutRef.current = setTimeout(() => {
        setIsZooming(false);
      }, 150);

      if (delta > 0) {
        zoomIn(centerX, centerY);
      } else {
        zoomOut(centerX, centerY);
      }
    },
    [config.enableWheel, config.scaleStep, scale, clampScale, zoomIn, zoomOut]
  );

  // 处理鼠标按下
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!config.enablePan) return;

      dragRef.current = {
        isDragging: true,
        startX: event.clientX,
        startY: event.clientY,
        initialTranslateX: translateX,
        initialTranslateY: translateY,
      };

      setIsPanning(true);
    },
    [config.enablePan, translateX, translateY]
  );

  // 处理鼠标移动
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!dragRef.current.isDragging || !config.enablePan) return;

      const deltaX = event.clientX - dragRef.current.startX;
      const deltaY = event.clientY - dragRef.current.startY;

      const newTranslateX = dragRef.current.initialTranslateX + deltaX;
      const newTranslateY = dragRef.current.initialTranslateY + deltaY;

      const clampedTranslate = clampTranslate(newTranslateX, newTranslateY);

      setTranslateX(clampedTranslate.x);
      setTranslateY(clampedTranslate.y);
    },
    [config.enablePan, clampTranslate]
  );

  // 处理鼠标释放
  const handleMouseUp = useCallback(() => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      setIsPanning(false);

      // 添加到历史记录
      addToHistory({ scale, translateX, translateY });
      onPanChange?.({ scale, translateX, translateY });
    }
  }, [scale, translateX, translateY, addToHistory, onPanChange]);

  // 处理双击
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!config.enableDoubleClick) return;

      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const centerX = event.clientX - rect.left;
      const centerY = event.clientY - rect.top;

      // 双击放大或重置
      if (scale >= config.maxScale * 0.9) {
        resetZoom();
      } else {
        zoomIn(centerX, centerY);
      }
    },
    [config.enableDoubleClick, config.maxScale, scale, zoomIn, resetZoom]
  );

  // 处理触摸开始
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!config.enablePinch || event.touches.length < 2) return;

      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

      touchRef.current = {
        isTouching: true,
        startDistance: distance,
        startScale: scale,
        startTranslateX: translateX,
        startTranslateY: translateY,
        lastTouchX: (touch1.clientX + touch2.clientX) / 2,
        lastTouchY: (touch1.clientY + touch2.clientY) / 2,
      };

      setIsZooming(true);
    },
    [config.enablePinch, scale, translateX, translateY]
  );

  // 处理触摸移动
  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!touchRef.current.isTouching || event.touches.length < 2) return;

      event.preventDefault();

      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

      // 计算缩放
      const scaleRatio = distance / touchRef.current.startDistance;
      const newScale = clampScale(touchRef.current.startScale * scaleRatio);

      // 计算中心点
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;

      // 计算平移
      const deltaX = centerX - touchRef.current.lastTouchX;
      const deltaY = centerY - touchRef.current.lastTouchY;

      const newTranslateX = touchRef.current.startTranslateX + deltaX;
      const newTranslateY = touchRef.current.startTranslateY + deltaY;

      setScale(newScale);
      setTranslateX(newTranslateX);
      setTranslateY(newTranslateY);
    },
    [clampScale]
  );

  // 处理触摸结束
  const handleTouchEnd = useCallback(() => {
    if (touchRef.current.isTouching) {
      touchRef.current.isTouching = false;
      setIsZooming(false);

      // 添加到历史记录
      addToHistory({ scale, translateX, translateY });
    }
  }, [scale, translateX, translateY, addToHistory]);

  // 清理
  useEffect(() => {
    return () => {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, []);

  // 变换样式
  const transformStyle: React.CSSProperties = useMemo(
    () => ({
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      transformOrigin: 'center center',
      transition: isZooming || isPanning ? 'none' : 'transform 0.3s ease-out',
    }),
    [translateX, translateY, scale, isZooming, isPanning]
  );

  return {
    scale,
    translateX,
    translateY,
    isZooming,
    isPanning,
    canUndo,
    canRedo,
    history,
    currentHistoryIndex,
    zoomIn,
    zoomOut,
    zoomTo,
    resetZoom,
    pan,
    panTo,
    undo,
    redo,
    clearHistory,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    transformStyle,
  };
}

// 用于 Recharts Brush 组件的缩放 Hook
export interface UseBrushZoomOptions {
  dataLength: number;
  defaultRange?: number; // 默认显示的数据比例 (0-1)
  minVisiblePoints?: number;
  maxVisiblePoints?: number;
  onRangeChange?: (startIndex: number, endIndex: number) => void;
}

export interface UseBrushZoomReturn {
  startIndex: number;
  endIndex: number;
  visibleDataCount: number;
  totalDataCount: number;
  zoomIn: () => void;
  zoomOut: () => void;
  panLeft: () => void;
  panRight: () => void;
  reset: () => void;
  setRange: (start: number, end: number) => void;
  handleBrushChange: (range: { startIndex?: number; endIndex?: number }) => void;
}

/**
 * 用于 Recharts Brush 组件的缩放 Hook
 */
export function useBrushZoom(options: UseBrushZoomOptions): UseBrushZoomReturn {
  const {
    dataLength,
    defaultRange = 0.3,
    minVisiblePoints = 10,
    maxVisiblePoints = Infinity,
    onRangeChange,
  } = options;

  const [startIndex, setStartIndex] = useState(() =>
    Math.max(0, Math.floor(dataLength * (1 - defaultRange)))
  );
  const [endIndex, setEndIndex] = useState(() => dataLength - 1);

  const prevDataLengthRef = useRef(dataLength);

  useEffect(() => {
    if (prevDataLengthRef.current !== dataLength) {
      prevDataLengthRef.current = dataLength;
      const newStartIndex = Math.max(0, Math.floor(dataLength * (1 - defaultRange)));
      const newEndIndex = dataLength - 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartIndex(newStartIndex);
      setEndIndex(newEndIndex);
    }
  }, [dataLength, defaultRange]);

  const visibleDataCount = endIndex - startIndex + 1;
  const totalDataCount = dataLength;

  const setRange = useCallback(
    (start: number, end: number) => {
      const clampedStart = Math.max(0, Math.min(start, dataLength - 1));
      const clampedEnd = Math.max(clampedStart, Math.min(end, dataLength - 1));

      // 检查最小/最大可见点数限制
      const visibleCount = clampedEnd - clampedStart + 1;
      if (visibleCount < minVisiblePoints) {
        // 调整范围以满足最小可见点数
        if (clampedEnd < dataLength - 1) {
          setEndIndex(Math.min(dataLength - 1, clampedStart + minVisiblePoints - 1));
        } else {
          setStartIndex(Math.max(0, clampedEnd - minVisiblePoints + 1));
        }
        return;
      }

      if (visibleCount > maxVisiblePoints) {
        // 调整范围以满足最大可见点数
        setEndIndex(clampedStart + maxVisiblePoints - 1);
        return;
      }

      setStartIndex(clampedStart);
      setEndIndex(clampedEnd);
      onRangeChange?.(clampedStart, clampedEnd);
    },
    [dataLength, minVisiblePoints, maxVisiblePoints, onRangeChange]
  );

  const zoomIn = useCallback(() => {
    const currentRange = endIndex - startIndex;
    const newRange = Math.max(minVisiblePoints, Math.floor(currentRange * 0.8));
    const center = Math.floor((startIndex + endIndex) / 2);
    const halfRange = Math.floor(newRange / 2);

    setRange(center - halfRange, center + halfRange);
  }, [startIndex, endIndex, minVisiblePoints, setRange]);

  const zoomOut = useCallback(() => {
    const currentRange = endIndex - startIndex;
    const newRange = Math.min(
      maxVisiblePoints === Infinity ? dataLength : maxVisiblePoints,
      Math.floor(currentRange * 1.25)
    );
    const center = Math.floor((startIndex + endIndex) / 2);
    const halfRange = Math.floor(newRange / 2);

    setRange(center - halfRange, center + halfRange);
  }, [startIndex, endIndex, maxVisiblePoints, dataLength, setRange]);

  const panLeft = useCallback(() => {
    const currentRange = endIndex - startIndex;
    const step = Math.max(1, Math.floor(currentRange * 0.1));
    setRange(startIndex - step, endIndex - step);
  }, [startIndex, endIndex, setRange]);

  const panRight = useCallback(() => {
    const currentRange = endIndex - startIndex;
    const step = Math.max(1, Math.floor(currentRange * 0.1));
    setRange(startIndex + step, endIndex + step);
  }, [startIndex, endIndex, setRange]);

  const reset = useCallback(() => {
    const newStartIndex = Math.max(0, Math.floor(dataLength * (1 - defaultRange)));
    const newEndIndex = dataLength - 1;
    setStartIndex(newStartIndex);
    setEndIndex(newEndIndex);
    onRangeChange?.(newStartIndex, newEndIndex);
  }, [dataLength, defaultRange, onRangeChange]);

  const handleBrushChange = useCallback(
    (range: { startIndex?: number; endIndex?: number }) => {
      if (typeof range.startIndex === 'number' && typeof range.endIndex === 'number') {
        setRange(range.startIndex, range.endIndex);
      }
    },
    [setRange]
  );

  return {
    startIndex,
    endIndex,
    visibleDataCount,
    totalDataCount,
    zoomIn,
    zoomOut,
    panLeft,
    panRight,
    reset,
    setRange,
    handleBrushChange,
  };
}
