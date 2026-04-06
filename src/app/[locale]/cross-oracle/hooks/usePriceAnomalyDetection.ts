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
  /** 可能的原因分析翻译键列表 */
  reasonKeys: string[];
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
): string[] {
  const reasonKeys: string[] = [];

  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation > 5) {
    reasonKeys.push('anomalyDetection.reasons.severeDeviation');
  } else if (absDeviation > SEVERITY_THRESHOLDS.HIGH) {
    reasonKeys.push('anomalyDetection.reasons.highVolatility');
  } else if (absDeviation > ANOMALY_THRESHOLD) {
    reasonKeys.push('anomalyDetection.reasons.dataSourceDifference');
  }

  if (freshnessSeconds > FRESHNESS_THRESHOLDS.SEVERELY_DELAYED) {
    reasonKeys.push('anomalyDetection.reasons.severelyDelayed');
  } else if (freshnessSeconds > FRESHNESS_THRESHOLDS.DELAYED) {
    reasonKeys.push('anomalyDetection.reasons.delayed');
  }

  if (confidence !== undefined && confidence !== null) {
    if (confidence < CONFIDENCE_THRESHOLDS.LOW) {
      reasonKeys.push('anomalyDetection.reasons.lowConfidence');
    } else if (confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
      reasonKeys.push('anomalyDetection.reasons.mediumConfidence');
    }
  }

  if (reasonKeys.length === 0) {
    if (absDeviation >= ANOMALY_THRESHOLD) {
      reasonKeys.push('anomalyDetection.reasons.overThreshold');
    } else {
      reasonKeys.push('anomalyDetection.reasons.minorDeviation');
    }
  }

  return reasonKeys;
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

    const now = currentTime ?? Date.now();
    const anomalies: PriceAnomaly[] = [];

    priceData.forEach((data) => {
      if (data.price <= 0) return;

      const deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;

      if (Math.abs(deviationPercent) >= ANOMALY_THRESHOLD) {
        const freshnessSeconds = Math.floor((now - data.timestamp) / 1000);
        const severity = getSeverity(deviationPercent);
        const reasonKeys = analyzeReason(deviationPercent, freshnessSeconds, data.confidence);

        anomalies.push({
          provider: data.provider,
          price: data.price,
          deviationPercent,
          severity,
          reasonKeys,
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
