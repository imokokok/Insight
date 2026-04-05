import { useMemo, useRef } from 'react';

import { type OracleProvider, type PriceData } from '@/types/oracle';

import { type TechnicalIndicatorsResult, type QualityTrendDataPoint } from './types/index';

// Fixed base timestamp for deterministic mock data
const BASE_TIMESTAMP = 1704067200000; // 2024-01-01 00:00:00 UTC

export function useTechnicalIndicators(
  historicalData: Partial<Record<OracleProvider, PriceData[]>>,
  selectedOracles: OracleProvider[],
  priceData: PriceData[],
  performanceData: import('@/components/oracle/data-display/OraclePerformanceRanking').OraclePerformanceData[]
): TechnicalIndicatorsResult {
  const maData = useMemo(() => {
    return selectedOracles.map((oracle) => ({
      oracle,
      prices: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const gasFeeData = useMemo(() => {
    return selectedOracles.map((oracle, index) => ({
      oracle,
      chain: 'Ethereum',
      // Deterministic mock values based on index
      updateCost: 45000 + ((index * 123) % 20000),
      updateFrequency: 300 + ((index * 456) % 600),
      avgGasPrice: 20 + ((index * 789) % 30),
      lastUpdate: BASE_TIMESTAMP - ((index * 111) % 3600000),
    }));
  }, [selectedOracles]);

  const atrData = useMemo(() => {
    return selectedOracles.map((oracle) => ({
      oracle,
      prices: (historicalData[oracle] || []).map((d, idx) => ({
        timestamp: d.timestamp,
        price: d.price,
        // Deterministic mock values based on index
        high: d.price * (1 + ((idx * 13) % 100) * 0.00002),
        low: d.price * (1 - ((idx * 17) % 100) * 0.00002),
        close: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const bollingerData = useMemo(() => {
    return selectedOracles.map((oracle) => ({
      oracle,
      prices: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
        high: d.price * (1 + Math.random() * 0.003),
        low: d.price * (1 - Math.random() * 0.003),
        close: d.price,
      })),
    }));
  }, [historicalData, selectedOracles]);

  const qualityTrendData = useMemo(() => {
    return selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      const data: QualityTrendDataPoint[] = [];

      for (let i = 0; i < history.length; i++) {
        const point = history[i];
        const pricesAtTime = selectedOracles
          .map((o) => historicalData[o]?.find((d) => d.timestamp === point.timestamp)?.price)
          .filter((p): p is number => p !== undefined);

        const median =
          pricesAtTime.length > 0
            ? pricesAtTime.sort((a, b) => a - b)[Math.floor(pricesAtTime.length / 2)]
            : point.price;

        data.push({
          timestamp: point.timestamp,
          // Deterministic mock values based on index
          updateLatency: ((i * 73) % 500) + 100,
          deviationFromMedian: Math.abs((point.price - median) / median),
          isOutlier: Math.abs((point.price - median) / median) > 0.005,
          // Deterministic mock values based on index
          isStale: (i * 31) % 100 > 95,
          heartbeatCompliance: 0.95 + ((i * 17) % 100) * 0.0005,
        });
      }

      return {
        oracle,
        data,
      };
    });
  }, [historicalData, selectedOracles]);

  const qualityScoreData = useMemo(() => {
    const successCount = priceData.filter((d) => d.price > 0).length;
    const totalCount = selectedOracles.length;
    const latestTimestamp =
      priceData.length > 0 ? Math.max(...priceData.map((d) => d.timestamp)) : BASE_TIMESTAMP;
    const avgAccuracy =
      performanceData.length > 0
        ? performanceData.reduce((sum, d) => sum + d.accuracy, 0) / performanceData.length
        : 95;

    return {
      freshness: { lastUpdated: new Date(latestTimestamp) },
      completeness: { successCount, totalCount },
      reliability: {
        historicalAccuracy: avgAccuracy,
        responseSuccessRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
      },
    };
  }, [priceData, selectedOracles, performanceData]);

  return {
    maData,
    gasFeeData,
    atrData,
    bollingerData,
    qualityTrendData,
    qualityScoreData,
  };
}
