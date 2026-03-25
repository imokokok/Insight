'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { OracleProvider, PriceData, SnapshotStats } from '@/types/oracle';

interface OracleDataContextValue {
  // 价格数据
  priceData: PriceData[];
  filteredPriceData: PriceData[];
  historicalData: Partial<Record<OracleProvider, PriceData[]>>;
  
  // 统计指标
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  validPrices: number[];
  
  // 历史统计
  lastStats: SnapshotStats | null;
  historyMinMax: {
    avgPrice: { min: number; max: number };
    weightedAvgPrice: { min: number; max: number };
    maxPrice: { min: number; max: number };
    minPrice: { min: number; max: number };
    priceRange: { min: number; max: number };
    variance: { min: number; max: number };
    standardDeviationPercent: { min: number; max: number };
  };
  
  // 异常统计
  outlierStats: {
    count: number;
    avgDeviation: number;
    outliers: { index: number; provider: OracleProvider; zScore: number; deviation: number }[];
    oracleNames: string[];
  };
  
  // 数据质量
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
  
  // 状态
  isLoading: boolean;
  lastUpdated: Date | null;
}

const OracleDataContext = createContext<OracleDataContextValue | null>(null);

interface OracleDataProviderProps {
  children: ReactNode;
  value: OracleDataContextValue;
}

export function OracleDataProvider({ children, value }: OracleDataProviderProps) {
  return (
    <OracleDataContext.Provider value={value}>
      {children}
    </OracleDataContext.Provider>
  );
}

export function useOracleData() {
  const context = useContext(OracleDataContext);
  if (!context) {
    throw new Error('useOracleData must be used within OracleDataProvider');
  }
  return context;
}
