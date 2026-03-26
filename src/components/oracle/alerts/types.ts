'use client';

import { OracleProvider, Blockchain } from '@/lib/oracles';

export type AnomalyType = 'price_spike' | 'price_deviation' | 'data_delay' | 'price_drop';
export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface AnomalyEvent {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  provider: OracleProvider;
  symbol: string;
  chain: Blockchain;
  timestamp: number;
  details: {
    currentValue: number;
    expectedValue?: number;
    deviationPercent?: number;
    delay?: number;
    threshold?: number;
  };
  message: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface AnomalyStats {
  totalAnomalies: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  priceSpikeCount: number;
  priceDeviationCount: number;
  dataDelayCount: number;
  priceDropCount: number;
  avgResolutionTime: number;
}

export interface AnomalyDetectionConfig {
  priceSpikeThreshold: number;
  priceDropThreshold: number;
  priceDeviationThreshold: number;
  dataDelayThreshold: number;
  checkInterval: number;
}

export interface AnomalyFilter {
  type: AnomalyType | 'all';
  severity: AnomalySeverity | 'all';
  acknowledged: 'all' | boolean;
}
