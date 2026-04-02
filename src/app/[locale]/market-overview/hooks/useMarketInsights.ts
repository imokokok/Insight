/**
 * 市场洞察数据计算 Hook
 * 封装 MarketSidebar 中的计算逻辑
 */

import { useMemo, useCallback } from 'react';

import type { OracleMarketData, MarketConcentrationResult, MarketInsights } from '../types';

interface UseMarketInsightsOptions {
  /** 国际化翻译函数 */
  t: (key: string) => string;
}

interface UseMarketInsightsReturn {
  /** 市场洞察数据 */
  insights: MarketInsights;
  /** 计算市场集中度 */
  calculateConcentration: (cr4: number) => MarketConcentrationResult;
}

/**
 * 计算市场集中度 (CR4 - 前4名市场份额之和)
 */
function calculateMarketConcentration(
  oracleData: OracleMarketData[],
  topN: number = MARKET_INSIGHTS_CONFIG.TOP_N_FOR_CONCENTRATION
): number {
  return oracleData.slice(0, topN).reduce((sum, oracle) => sum + oracle.share, 0);
}

/**
 * 获取增长最快的预言机
 */
function getTopGainers(
  oracleData: OracleMarketData[],
  count: number = MARKET_INSIGHTS_CONFIG.TOP_GAINERS_COUNT
): OracleMarketData[] {
  return [...oracleData].sort((a, b) => b.change24h - a.change24h).slice(0, count);
}

/**
 * 获取链支持最多的预言机
 */
function getTopChainSupporters(
  oracleData: OracleMarketData[],
  count: number = MARKET_INSIGHTS_CONFIG.TOP_CHAIN_SUPPORTERS_COUNT
): OracleMarketData[] {
  return [...oracleData].sort((a, b) => b.chains - a.chains).slice(0, count);
}

/**
 * 计算统计数据
 */
function calculateStats(oracleData: OracleMarketData[]) {
  const totalChains = oracleData.reduce((sum, o) => sum + o.chains, 0);
  const avgChainsPerOracle = oracleData.length > 0 ? totalChains / oracleData.length : 0;

  return {
    totalChains,
    avgChainsPerOracle,
  };
}

/**
 * 市场洞察数据 Hook
 */
export function useMarketInsights(
  oracleData: OracleMarketData[],
  options: UseMarketInsightsOptions
): UseMarketInsightsReturn {
  const { t } = options;

  /**
   * 判断市场集中度等级
   */
  const calculateConcentration = useCallback((cr4: number): MarketConcentrationResult => {
    if (cr4 >= CONCENTRATION_THRESHOLDS.HIGH) {
      return {
        value: cr4,
        level: 'high',
        labelKey: CONCENTRATION_LEVELS.HIGH.key,
        colorClass: CONCENTRATION_LEVELS.HIGH.color,
        bgColorClass: CONCENTRATION_LEVELS.HIGH.bgColor,
      };
    }

    if (cr4 >= CONCENTRATION_THRESHOLDS.MEDIUM) {
      return {
        value: cr4,
        level: 'medium',
        labelKey: CONCENTRATION_LEVELS.MEDIUM.key,
        colorClass: CONCENTRATION_LEVELS.MEDIUM.color,
        bgColorClass: CONCENTRATION_LEVELS.MEDIUM.bgColor,
      };
    }

    return {
      value: cr4,
      level: 'low',
      labelKey: CONCENTRATION_LEVELS.LOW.key,
      colorClass: CONCENTRATION_LEVELS.LOW.color,
      bgColorClass: CONCENTRATION_LEVELS.LOW.bgColor,
    };
  }, []);

  /**
   * 计算所有市场洞察数据
   */
  const insights = useMemo<MarketInsights>(() => {
    // 计算市场集中度
    const concentrationValue = calculateMarketConcentration(oracleData);
    const concentration = calculateConcentration(concentrationValue);

    // 获取增长最快的预言机
    const topGainers = getTopGainers(oracleData);

    // 获取链支持最多的预言机
    const topChainSupporters = getTopChainSupporters(oracleData);

    // 计算统计数据
    const { totalChains, avgChainsPerOracle } = calculateStats(oracleData);

    return {
      concentration,
      topGainers,
      topChainSupporters,
      totalChains,
      avgChainsPerOracle,
    };
  }, [oracleData, calculateConcentration]);

  return {
    insights,
    calculateConcentration,
  };
}

export default useMarketInsights;
