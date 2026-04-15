import { type Blockchain, type PriceData } from '@/lib/oracles';

import { type ThresholdConfig } from '../utils';

import { useChartData, type UseChartDataParams, type UseChartDataReturn } from './useChartData';

export interface UseCrossChainChartParams extends UseChartDataParams {
  thresholdConfig?: ThresholdConfig;
}

export type UseCrossChainChartReturn = UseChartDataReturn;

export function useCrossChainChart(params: UseCrossChainChartParams): UseCrossChainChartReturn {
  const { thresholdConfig: _thresholdConfig, ...chartParams } = params;
  return useChartData(chartParams);
}
