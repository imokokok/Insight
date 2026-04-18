import { type BaseOracleClient } from '@/lib/oracles';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { useStatistics, type UseStatisticsReturn } from './useStatistics';

interface UseCrossChainStatisticsParams {
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  filteredChains: Blockchain[];
  selectedTimeRange: number;
  currentClient: BaseOracleClient;
  selectedBaseChain: Blockchain | null;
}

type UseCrossChainStatisticsReturn = UseStatisticsReturn;

export function useCrossChainStatistics(
  params: UseCrossChainStatisticsParams
): UseCrossChainStatisticsReturn {
  return useStatistics(params);
}
