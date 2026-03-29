'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useShortcutHelp } from '@/components/shortcuts';
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks';

export type ChartType = 'pie' | 'trend' | 'bar';
export type ViewType = 'chart' | 'table';

export interface UseMarketOverviewKeyboardOptions {
  activeChart: ChartType;
  setActiveChart: (chart: ChartType) => void;
  viewType: ViewType;
  setViewType: (view: ViewType) => void;
  selectedRange: string;
  setSelectedRange: (range: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  disabled?: boolean;
}

export interface UseMarketOverviewKeyboardReturn {
  chartTypeButtonRefs: React.MutableRefObject<Record<ChartType, HTMLButtonElement | null>>;
  timeRangeButtonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  viewTypeButtonRefs: React.MutableRefObject<Record<ViewType, HTMLButtonElement | null>>;
}

const chartTypeMap: Record<string, ChartType> = {
  '1': 'pie',
  '2': 'trend',
  '3': 'bar',
};

const timeRanges = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'] as const;

export function useMarketOverviewKeyboard({
  activeChart,
  setActiveChart,
  viewType,
  setViewType,
  selectedRange,
  setSelectedRange,
  onRefresh,
  onExport,
  disabled = false,
}: UseMarketOverviewKeyboardOptions): UseMarketOverviewKeyboardReturn {
  const { toggle: toggleHelp } = useShortcutHelp();

  const chartTypeButtonRefs = useRef<Record<ChartType, HTMLButtonElement | null>>({
    pie: null,
    trend: null,
    bar: null,
  });

  const timeRangeButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const viewTypeButtonRefs = useRef<Record<ViewType, HTMLButtonElement | null>>({
    chart: null,
    table: null,
  });

  const handleChartTypeChange = useCallback(
    (chart: ChartType) => {
      setActiveChart(chart);
      setTimeout(() => {
        chartTypeButtonRefs.current[chart]?.focus();
      }, 0);
    },
    [setActiveChart]
  );

  const handleViewTypeToggle = useCallback(() => {
    const newViewType = viewType === 'chart' ? 'table' : 'chart';
    setViewType(newViewType);
    setTimeout(() => {
      viewTypeButtonRefs.current[newViewType]?.focus();
    }, 0);
  }, [viewType, setViewType]);

  const handleTimeRangeCycle = useCallback(
    (direction: 'next' | 'prev') => {
      const currentIndex = timeRanges.indexOf(selectedRange as (typeof timeRanges)[number]);
      let newIndex: number;

      if (direction === 'next') {
        newIndex = currentIndex >= timeRanges.length - 1 ? 0 : currentIndex + 1;
      } else {
        newIndex = currentIndex <= 0 ? timeRanges.length - 1 : currentIndex - 1;
      }

      const newRange = timeRanges[newIndex];
      setSelectedRange(newRange);
      setTimeout(() => {
        timeRangeButtonRefs.current[newRange]?.focus();
      }, 0);
    },
    [selectedRange, setSelectedRange]
  );

  const shortcuts: KeyboardShortcut[] = [
    {
      key: '1',
      handler: () => handleChartTypeChange('pie'),
      description: '切换到市场份额图',
      scope: 'market-overview',
    },
    {
      key: '2',
      handler: () => handleChartTypeChange('trend'),
      description: '切换到 TVS 趋势图',
      scope: 'market-overview',
    },
    {
      key: '3',
      handler: () => handleChartTypeChange('bar'),
      description: '切换到链支持图',
      scope: 'market-overview',
    },
    {
      key: 't',
      handler: handleViewTypeToggle,
      description: '切换表格/图表视图',
      scope: 'market-overview',
    },
    ...(onRefresh
      ? [
          {
            key: 'r',
            handler: onRefresh,
            description: '刷新数据',
            scope: 'market-overview',
          } as KeyboardShortcut,
        ]
      : []),
    ...(onExport
      ? [
          {
            key: 'e',
            handler: onExport,
            description: '导出数据',
            scope: 'market-overview',
          } as KeyboardShortcut,
        ]
      : []),
    {
      key: '?',
      handler: toggleHelp,
      description: '显示快捷键帮助',
      scope: 'market-overview',
    },
    {
      key: 'ArrowRight',
      handler: () => handleTimeRangeCycle('next'),
      description: '下一个时间范围',
      scope: 'market-overview',
    },
    {
      key: 'ArrowLeft',
      handler: () => handleTimeRangeCycle('prev'),
      description: '上一个时间范围',
      scope: 'market-overview',
    },
  ];

  useKeyboardShortcuts(disabled ? [] : shortcuts);

  useEffect(() => {
    if (!disabled) {
      return () => {};
    }
    return () => {};
  }, [disabled]);

  return {
    chartTypeButtonRefs,
    timeRangeButtonRefs,
    viewTypeButtonRefs,
  };
}

export default useMarketOverviewKeyboard;
