/**
 * @fileoverview 价格异常检测 Hook
 * @description 检测价格数据中的异常值，提供异常分级和原因分析
 */

import { useMemo } from 'react';

import { type PriceData, type OracleProvider } from '@/types/oracle';

import {
  ANOMALY_THRESHOLD,
  SEVERITY_THRESHOLDS,
  FRESHNESS_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
} from '../thresholds';

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
  anomalies: PriceAnomaly[];
  count: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  hasAnomalies: boolean;
  maxDeviation: number;
  anomalyOracleNames: string[];
}

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

function analyzeReason(
  deviationPercent: number,
  freshnessSeconds: number,
  confidence?: number | null
): string {
  const reasons: string[] = [];

  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation > 5) {
    reasons.push('价格严重偏离市场均值');
  } else if (absDeviation > SEVERITY_THRESHOLDS.HIGH) {
    reasons.push('市场波动较大');
  } else if (absDeviation > ANOMALY_THRESHOLD) {
    reasons.push('数据源存在差异');
  }

  if (freshnessSeconds > FRESHNESS_THRESHOLDS.SEVERELY_DELAYED) {
    reasons.push('数据源延迟超过5分钟');
  } else if (freshnessSeconds > FRESHNESS_THRESHOLDS.DELAYED) {
    reasons.push('数据源延迟');
  }

  if (confidence !== undefined && confidence !== null) {
    if (confidence < CONFIDENCE_THRESHOLDS.LOW) {
      reasons.push('数据源置信度较低');
    } else if (confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
      reasons.push('数据源置信度一般');
    }
  }

  if (reasons.length === 0) {
    if (absDeviation >= ANOMALY_THRESHOLD) {
      reasons.push('价格偏差超过阈值');
    } else {
      reasons.push('轻微价格偏差');
    }
  }

  return reasons.join('，');
}

export function usePriceAnomalyDetection(
  priceData: PriceData[],
  avgPrice: number,
  currentTime?: number
): AnomalyDetectionResult {
  return useMemo(() => {
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

    const now = currentTime ?? 0;
    const anomalies: PriceAnomaly[] = [];

    priceData.forEach((data) => {
      if (data.price <= 0) return;

      const deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;

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

    anomalies.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent));

    const highRiskCount = anomalies.filter((a) => a.severity === 'high').length;
    const mediumRiskCount = anomalies.filter((a) => a.severity === 'medium').length;
    const lowRiskCount = anomalies.filter((a) => a.severity === 'low').length;

    const maxDeviation =
      anomalies.length > 0 ? Math.max(...anomalies.map((a) => Math.abs(a.deviationPercent))) : 0;

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
  }, [priceData, avgPrice, currentTime]);
}

export default usePriceAnomalyDetection;
