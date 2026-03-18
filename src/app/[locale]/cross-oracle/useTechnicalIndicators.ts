import { useMemo } from 'react';
import { OracleProvider, PriceData } from '@/types/oracle';
import { TechnicalIndicatorsResult } from './types';

export function useTechnicalIndicators(
  historicalData: Partial<Record<OracleProvider, PriceData[]>>,
  selectedOracles: OracleProvider[],
  priceData: PriceData[],
  performanceData: import('@/components/oracle/common/OraclePerformanceRanking').OraclePerformanceData[]
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
    return selectedOracles.map((oracle) => ({
      oracle,
      chain: 'Ethereum',
      updateCost: 45000 + Math.random() * 20000,
      updateFrequency: 300 + Math.random() * 600,
      avgGasPrice: 20 + Math.random() * 30,
      lastUpdate: Date.now() - Math.random() * 3600000,
    }));
  }, [selectedOracles]);

  const atrData = useMemo(() => {
    return selectedOracles.map((oracle) => ({
      oracle,
      prices: (historicalData[oracle] || []).map((d) => ({
        timestamp: d.timestamp,
        price: d.price,
        high: d.price * (1 + Math.random() * 0.002),
        low: d.price * (1 - Math.random() * 0.002),
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
      const data: any[] = [];

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
          updateLatency: Math.random() * 500 + 100,
          deviationFromMedian: Math.abs((point.price - median) / median),
          isOutlier: Math.abs((point.price - median) / median) > 0.005,
          isStale: Math.random() > 0.95,
          heartbeatCompliance: 0.95 + Math.random() * 0.05,
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
      priceData.length > 0 ? Math.max(...priceData.map((d) => d.timestamp)) : Date.now();
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
