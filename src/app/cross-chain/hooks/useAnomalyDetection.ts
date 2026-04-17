import { type Blockchain, type PriceData } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';

import { detectAnomalousPrices, type AnomalousPricePoint } from '../utils/anomalyDetection';

const logger = createLogger('useAnomalyDetection');

export function detectAnomalies(
  prices: PriceData[],
  filteredChains: Blockchain[]
): AnomalousPricePoint[] {
  const anomalies = detectAnomalousPrices(prices, filteredChains);
  if (anomalies.length > 0) {
    logger.info(`检测到 ${anomalies.length} 个异常价格点`, {
      anomalies: anomalies.map((a) => ({
        chain: a.chain,
        price: a.price,
        reason: a.reason,
        deviation: a.deviation.toFixed(2),
      })),
    });
  }
  return anomalies;
}

export interface UseAnomalyDetectionReturn {
  detectAnomalies: (prices: PriceData[], filteredChains: Blockchain[]) => AnomalousPricePoint[];
}

export function useAnomalyDetection(): UseAnomalyDetectionReturn {
  return {
    detectAnomalies,
  };
}

export type { AnomalousPricePoint };
