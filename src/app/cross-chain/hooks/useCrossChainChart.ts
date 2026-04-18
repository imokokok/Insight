import { type ThresholdConfig } from '../utils';

import { useChartData, type UseChartDataParams, type UseChartDataReturn } from './useChartData';

interface UseCrossChainChartParams extends UseChartDataParams {
  thresholdConfig?: ThresholdConfig;
}

type UseCrossChainChartReturn = UseChartDataReturn;

export function useCrossChainChart(params: UseCrossChainChartParams): UseCrossChainChartReturn {
  const { thresholdConfig: _thresholdConfig, ...chartParams } = params;
  return useChartData(chartParams);
}
