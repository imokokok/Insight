/**
 * @fileoverview Price anomaly detection hook
 * @description Detect anomalies in price data, providing anomaly severity classification and cause analysis
 */

import { useMemo } from 'react';

import { safeMax } from '@/lib/utils';
import { type PriceData, type OracleProvider } from '@/types/oracle';

import {
  ANOMALY_DEVIATION_THRESHOLD,
  SEVERITY_THRESHOLDS,
  FRESHNESS_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
} from '../thresholds';

/** Anomaly severity */
export type AnomalySeverity = 'low' | 'medium' | 'high';

/** Price anomaly item */
export interface PriceAnomaly {
  /** Oracle provider */
  provider: OracleProvider;
  /** Anomalous price */
  price: number;
  /** Deviation percentage (relative to average) */
  deviationPercent: number;
  /** Anomaly severity */
  severity: AnomalySeverity;
  /** Readable text list of anomaly causes */
  reasonKeys: string[];
  /** Anomaly detection timestamp */
  timestamp: number;
  /** Data freshness (seconds) */
  freshnessSeconds: number;
}

/** Anomaly detection result */
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
    reasonKeys.push('Price deviation exceeds 5%');
  } else if (absDeviation > SEVERITY_THRESHOLDS.HIGH) {
    reasonKeys.push('High market volatility');
  } else if (absDeviation > ANOMALY_DEVIATION_THRESHOLD) {
    reasonKeys.push('Data source discrepancy');
  }

  if (freshnessSeconds > FRESHNESS_THRESHOLDS.SEVERELY_DELAYED) {
    reasonKeys.push('Severely delayed data update');
  } else if (freshnessSeconds > FRESHNESS_THRESHOLDS.DELAYED) {
    reasonKeys.push('Delayed data update');
  }

  if (confidence !== undefined && confidence !== null) {
    if (confidence < CONFIDENCE_THRESHOLDS.LOW) {
      reasonKeys.push('Low data confidence');
    } else if (confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
      reasonKeys.push('Medium data confidence');
    }
  }

  if (reasonKeys.length === 0) {
    if (absDeviation >= ANOMALY_DEVIATION_THRESHOLD) {
      reasonKeys.push('Deviation exceeds threshold');
    } else {
      reasonKeys.push('Minor deviation');
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
    // eslint-disable-next-line react-hooks/purity
    const now = currentTime ?? Date.now();
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

    const anomalies: PriceAnomaly[] = [];

    priceData.forEach((data) => {
      if (data.price <= 0) return;

      const deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;

      if (Math.abs(deviationPercent) >= ANOMALY_DEVIATION_THRESHOLD) {
        const freshnessSeconds = Math.max(0, Math.floor((now - data.timestamp) / 1000));
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
      anomalies.length > 0 ? safeMax(anomalies.map((a) => Math.abs(a.deviationPercent))) : 0;

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
