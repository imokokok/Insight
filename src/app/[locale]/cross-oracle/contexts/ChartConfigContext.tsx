'use client';

import React, { createContext, useContext, type ReactNode } from 'react';

import type { OraclePriceSeries } from '@/components/oracle/charts/PriceCorrelationMatrix';
import type { PriceDeviationDataPoint } from '@/components/oracle/charts/PriceDeviationHeatmap';
import type { OraclePriceData } from '@/components/oracle/charts/PriceDistributionBoxPlot';
import type { OraclePriceHistory } from '@/components/oracle/charts/PriceVolatilityChart';
import type { OraclePerformanceData } from '@/components/oracle/data-display/OraclePerformanceRanking';
import { type OracleProvider } from '@/types/oracle';

import { type TimeRange, type QualityTrendData } from '../constants';

interface ChartConfigContextValue {
  // 选中的预言机
  selectedOracles: OracleProvider[];
  selectedSymbol: string;

  // 图表配置
  timeRange: TimeRange;
  zoomLevel: number;
  oracleChartColors: Record<OracleProvider, string>;
  useAccessibleColors: boolean;

  // 图表数据获取函数
  getChartData: () => {
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
  }[];

  // 图表数据
  heatmapData: PriceDeviationDataPoint[];
  boxPlotData: OraclePriceData[];
  volatilityData: OraclePriceHistory[];
  correlationData: OraclePriceSeries[];
  performanceData: OraclePerformanceData[];
  maData: { oracle: OracleProvider; prices: { timestamp: number; price: number }[] }[];
  qualityTrendData: QualityTrendData[];

  // 操作方法
  setTimeRange: (range: TimeRange) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  getLineStrokeDasharray: (oracle: OracleProvider) => string;
  toggleOracle: (oracle: OracleProvider) => void;
  setUseAccessibleColors: (value: boolean) => void;
  getOracleLatencyData: (oracle: OracleProvider | null) => number[];
}

const ChartConfigContext = createContext<ChartConfigContextValue | null>(null);

interface ChartConfigProviderProps {
  children: ReactNode;
  value: ChartConfigContextValue;
}

export function ChartConfigProvider({ children, value }: ChartConfigProviderProps) {
  return <ChartConfigContext.Provider value={value}>{children}</ChartConfigContext.Provider>;
}

export function useChartConfig() {
  const context = useContext(ChartConfigContext);
  if (!context) {
    throw new Error('useChartConfig must be used within ChartConfigProvider');
  }
  return context;
}
