/**
 * 对比模式状态管理 Hook
 * 管理趋势对比相关的状态
 */

import { useState, useCallback } from 'react';

import type { TVSTrendData } from '../types';

type ComparisonMode = 'none' | 'yoy' | 'mom';

export interface UseComparisonStateReturn {
  // 对比模式状态
  comparisonMode: ComparisonMode;
  setComparisonMode: (mode: ComparisonMode) => void;

  // 对比数据状态
  trendComparisonData: TVSTrendData[];
  setTrendComparisonData: (data: TVSTrendData[]) => void;

  // 操作方法
  toggleComparisonMode: (mode: 'yoy' | 'mom') => void;
  clearComparison: () => void;
  generateComparisonData: (baseData: TVSTrendData[], mode: 'yoy' | 'mom') => TVSTrendData[];
}

/**
 * 生成对比数据
 * 基于基础数据生成带有随机波动的对比数据
 */
function generateComparisonData(baseData: TVSTrendData[], mode: 'yoy' | 'mom'): TVSTrendData[] {
  const variance = mode === 'yoy' ? 0.15 : 0.08;

  return baseData.map((item) => ({
    ...item,
    chainlink: item.chainlink * (1 + (Math.random() - 0.5) * variance),
    pyth: item.pyth * (1 + (Math.random() - 0.5) * variance),
    band: item.band * (1 + (Math.random() - 0.5) * variance),
    api3: item.api3 * (1 + (Math.random() - 0.5) * variance),
    uma: item.uma * (1 + (Math.random() - 0.5) * variance),
    redstone: item.redstone * (1 + (Math.random() - 0.5) * variance),
    dia: item.dia * (1 + (Math.random() - 0.5) * variance),
    tellor: item.tellor * (1 + (Math.random() - 0.5) * variance),

    winklink: item.winklink * (1 + (Math.random() - 0.5) * variance),
  }));
}

/**
 * 对比模式状态 Hook
 */
export function useComparisonState(): UseComparisonStateReturn {
  // 对比模式状态
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('none');

  // 对比数据状态
  const [trendComparisonData, setTrendComparisonData] = useState<TVSTrendData[]>([]);

  // 切换对比模式
  const toggleComparisonMode = useCallback(
    (mode: 'yoy' | 'mom') => {
      if (comparisonMode === mode) {
        // 如果当前已经是该模式，则关闭对比
        setComparisonMode('none');
        setTrendComparisonData([]);
      } else {
        // 切换到新模式
        setComparisonMode(mode);
      }
    },
    [comparisonMode]
  );

  // 清除对比
  const clearComparison = useCallback(() => {
    setComparisonMode('none');
    setTrendComparisonData([]);
  }, []);

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

export default useComparisonState;
