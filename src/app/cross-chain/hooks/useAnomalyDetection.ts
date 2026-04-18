import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { detectAnomalousPrices, type AnomalousPricePoint } from '../utils/anomalyDetection';

const logger = createLogger('useAnomalyDetection');

function detectAnomalies(prices: PriceData[], filteredChains: Blockchain[]): AnomalousPricePoint[] {
  const anomalies = detectAnomalousPrices(prices, filteredChains);
  if (anomalies.length > 0) {
    logger.info(`Detected ${anomalies.length} anomalous price points`, {
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
