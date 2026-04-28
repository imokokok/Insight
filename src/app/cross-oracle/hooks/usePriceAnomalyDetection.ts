import { useMemo } from 'react';

import { safeMax } from '@/lib/utils';
import { type PriceData, type OracleProvider } from '@/types/oracle';

import {
  getDeviationThresholds,
  SEVERITY_THRESHOLDS,
  FRESHNESS_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
} from '../thresholds';

export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface PriceAnomaly {
  provider: OracleProvider;
  price: number;
  deviationPercent: number;
  severity: AnomalySeverity;
  reasonKeys: string[];
  timestamp: number;
  freshnessSeconds: number;
}

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

function getSeverity(deviationPercent: number, symbol: string): AnomalySeverity {
  const thresholds = getDeviationThresholds(symbol);
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation > thresholds.DANGER) {
    return 'high';
  }
  if (absDeviation >= thresholds.WARNING) {
    return 'medium';
  }
  return 'low';
}

function analyzeReason(
  deviationPercent: number,
  freshnessSeconds: number,
  confidence?: number | null,
  symbol?: string
): string[] {
  const reasonKeys: string[] = [];
  const thresholds = symbol ? getDeviationThresholds(symbol) : null;

  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation > 5) {
    reasonKeys.push('Price deviation exceeds 5%');
  }
  if (thresholds && absDeviation > thresholds.DANGER) {
    reasonKeys.push('High market volatility');
  } else if (absDeviation > SEVERITY_THRESHOLDS.HIGH) {
    reasonKeys.push('High market volatility');
  }
  if (thresholds && absDeviation > thresholds.WARNING && absDeviation <= thresholds.DANGER) {
    reasonKeys.push('Data source discrepancy');
  } else if (
    absDeviation > SEVERITY_THRESHOLDS.MEDIUM &&
    absDeviation <= SEVERITY_THRESHOLDS.HIGH
  ) {
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
    const warningThreshold = thresholds ? thresholds.WARNING : SEVERITY_THRESHOLDS.MEDIUM;
    if (absDeviation >= warningThreshold) {
      reasonKeys.push('Deviation exceeds threshold');
    } else {
      reasonKeys.push('Minor deviation');
    }
  }

  return reasonKeys;
}

export function usePriceAnomalyDetection(
  priceData: PriceData[],
  medianPrice: number,
  currentTime?: number,
  selectedSymbol?: string
): AnomalyDetectionResult {
  return useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = currentTime ?? Date.now();
    if (!priceData.length || medianPrice <= 0) {
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

    const symbol = selectedSymbol ?? '';
    const thresholds = getDeviationThresholds(symbol);
    const anomalyThreshold = thresholds.WARNING;

    const anomalies: PriceAnomaly[] = [];

    priceData.forEach((data) => {
      if (data.price <= 0) return;

      const deviationPercent = ((data.price - medianPrice) / medianPrice) * 100;

      if (Math.abs(deviationPercent) >= anomalyThreshold) {
        const freshnessSeconds = Math.max(0, Math.floor((now - data.timestamp) / 1000));
        const severity = getSeverity(deviationPercent, symbol);
        const reasonKeys = analyzeReason(
          deviationPercent,
          freshnessSeconds,
          data.confidence,
          symbol
        );

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
  }, [priceData, medianPrice, currentTime, selectedSymbol]);
}
