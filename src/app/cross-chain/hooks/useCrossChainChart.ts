import { useChartData, type UseChartDataParams, type UseChartDataReturn } from './useChartData';

type UseCrossChainChartParams = UseChartDataParams;

type UseCrossChainChartReturn = UseChartDataReturn;

export function useCrossChainChart(params: UseCrossChainChartParams): UseCrossChainChartReturn {
  return useChartData(params);
}
