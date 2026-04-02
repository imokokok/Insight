/**
 * @fileoverview 价格异常检测 Hook
 * @description 检测价格数据中的异常值，提供异常分级和原因分析
 */

import { useMemo } from 'react';

import { type PriceData, type OracleProvider } from '@/types/oracle';

import { ANOMALY_THRESHOLD } from '../constants';

/** 异常严重程度 */
export type AnomalySeverity = 'low' | 'medium' | 'high';

/** 价格异常项 */
export interface PriceAnomaly {
  /** 预言机提供商 */
  provider: OracleProvider;
  /** 异常价格 */
  price: number;
  /** 偏差百分比（相对于平均值） */
  deviationPercent: number;
  /** 异常严重程度 */
  severity: AnomalySeverity;
  /** 可能的原因分析 */
  reason: string;
  /** 异常检测时间戳 */
  timestamp: number;
  /** 数据新鲜度（秒） */
  freshnessSeconds: number;
}

/** 异常检测结果 */
export interface AnomalyDetectionResult {
  /** 异常列表 */
  anomalies: PriceAnomaly[];
  /** 异常数量 */
  count: number;
  /** 高风险异常数量 */
  highRiskCount: number;
  /** 中风险异常数量 */
  mediumRiskCount: number;
  /** 低风险异常数量 */
  lowRiskCount: number;
  /** 是否存在异常 */
  hasAnomalies: boolean;
  /** 最高偏差值 */
  maxDeviation: number;
  /** 异常预言机名称列表 */
  anomalyOracleNames: string[];
}

/** 严重程度阈值（百分比） */
const SEVERITY_THRESHOLDS = {
  /** 高风险阈值：>3% */
  HIGH: 3.0,
  /** 中风险阈值：1-3% */
  MEDIUM: 1.0,
};

/**
 * 根据偏差百分比确定严重程度
 * @param deviationPercent - 偏差百分比
 * @returns 严重程度等级
 */
function getSeverity(deviationPercent: number): AnomalySeverity {
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation > SEVERITY_THRESHOLDS.HIGH) {
    return 'high';
  }
  if (absDeviation >= SEVERITY_THRESHOLDS.MEDIUM) {
    return 'medium';
  }
  return 'low';
}

/**
 * 分析异常可能的原因
 * @param deviationPercent - 偏差百分比
 * @param freshnessSeconds - 数据新鲜度（秒）
 * @param confidence - 置信度
 * @returns 原因分析文本
 */
function analyzeReason(
  deviationPercent: number,
  freshnessSeconds: number,
  confidence?: number | null
): string {
  const reasons: string[] = [];

  // 根据偏差程度分析
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation > 5) {
    reasons.push('价格严重偏离市场均值');
  } else if (absDeviation > 3) {
    reasons.push('市场波动较大');
  } else if (absDeviation > 1) {
    reasons.push('数据源存在差异');
  }

  // 根据数据新鲜度分析
  if (freshnessSeconds > 300) {
    reasons.push('数据源延迟超过5分钟');
  } else if (freshnessSeconds > 60) {
    reasons.push('数据源延迟');
  }

  // 根据置信度分析
  if (confidence !== undefined && confidence !== null) {
    if (confidence < 0.5) {
      reasons.push('数据源置信度较低');
    } else if (confidence < 0.8) {
      reasons.push('数据源置信度一般');
    }
  }

  // 如果没有检测到特定原因，提供默认分析
  if (reasons.length === 0) {
    if (absDeviation >= ANOMALY_THRESHOLD) {
      reasons.push('价格偏差超过阈值');
    } else {
      reasons.push('轻微价格偏差');
    }
  }

  return reasons.join('，');
}

/**
 * 检测价格异常
 * @param priceData - 价格数据数组
 * @param avgPrice - 平均价格
 * @returns 异常检测结果
 */
export function usePriceAnomalyDetection(
  priceData: PriceData[],
  avgPrice: number
): AnomalyDetectionResult {
  return useMemo(() => {
    // 如果没有数据或平均价格为0，返回空结果
    if (!priceData.length || avgPrice <= 0) {
      return {
        anomalies: [],
        count: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        hasAnomalies: false,
        maxDeviation: 0,
        anomalyOracleNames: [],
      };
    }

    const now = Date.now();
    const anomalies: PriceAnomaly[] = [];

    priceData.forEach((data) => {
      // 跳过无效价格
      if (data.price <= 0) return;

      // 计算偏差百分比
      const deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;

      // 只记录超过阈值的异常
      if (Math.abs(deviationPercent) >= ANOMALY_THRESHOLD) {
        const freshnessSeconds = Math.floor((now - data.timestamp) / 1000);
        const severity = getSeverity(deviationPercent);
        const reason = analyzeReason(deviationPercent, freshnessSeconds, data.confidence);

        anomalies.push({
          provider: data.provider,
          price: data.price,
          deviationPercent,
          severity,
          reason,
          timestamp: data.timestamp,
          freshnessSeconds,
        });
      }
    });

    // 按偏差绝对值降序排序
    anomalies.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent));

    // 统计各等级异常数量
    const highRiskCount = anomalies.filter((a) => a.severity === 'high').length;
    const mediumRiskCount = anomalies.filter((a) => a.severity === 'medium').length;
    const lowRiskCount = anomalies.filter((a) => a.severity === 'low').length;

    // 获取最大偏差值
    const maxDeviation =
      anomalies.length > 0 ? Math.max(...anomalies.map((a) => Math.abs(a.deviationPercent))) : 0;

    // 获取异常预言机名称
    const anomalyOracleNames = anomalies.map((a) => a.provider);

    return {
      anomalies,
      count: anomalies.length,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      hasAnomalies: anomalies.length > 0,
      maxDeviation,
      anomalyOracleNames,
    };
  }, [priceData, avgPrice]);
}

export default usePriceAnomalyDetection;
