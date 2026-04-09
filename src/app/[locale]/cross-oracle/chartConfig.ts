import { chartColors, accessibleColors } from '@/lib/config/colors';
import { OracleProvider } from '@/types/oracle';

export const getMaxPointsForTimeRange = (timeRange: string): number => {
  switch (timeRange) {
    case '1H':
      return 60;
    case '24H':
      return 200;
    case '7D':
      return 300;
    case '30D':
      return 400;
    case '90D':
      return 500;
    case '1Y':
      return 500;
    case 'ALL':
      return 500;
    default:
      return 200;
  }
};

export const getOracleChartColors = (
  useAccessibleColors: boolean
): Record<OracleProvider, string> => {
  if (useAccessibleColors) {
    return {
      [OracleProvider.CHAINLINK]: accessibleColors.chart.sequence[0],
      [OracleProvider.UMA]: accessibleColors.chart.sequence[1],
      [OracleProvider.PYTH]: accessibleColors.chart.sequence[2],
      [OracleProvider.API3]: accessibleColors.chart.sequence[3],
      [OracleProvider.REDSTONE]: accessibleColors.chart.sequence[4],
      [OracleProvider.DIA]: accessibleColors.chart.sequence[5],
      [OracleProvider.WINKLINK]: accessibleColors.chart.sequence[6],
    } as Record<OracleProvider, string>;
  }
  return {
    [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
    [OracleProvider.UMA]: chartColors.oracle.uma,
    [OracleProvider.PYTH]: chartColors.oracle.pyth,
    [OracleProvider.API3]: chartColors.oracle.api3,
    [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
    [OracleProvider.DIA]: chartColors.oracle.dia,
    [OracleProvider.WINKLINK]: chartColors.oracle.winklink,
  } as Record<OracleProvider, string>;
};

export const getLineStrokeDasharray = (
  oracle: OracleProvider,
  useAccessibleColors: boolean
): string => {
  if (!useAccessibleColors) return '0';
  const patternMap: Record<OracleProvider, string> = {
    [OracleProvider.CHAINLINK]: accessibleColors.linePatterns.solid,
    [OracleProvider.UMA]: accessibleColors.linePatterns.dotted,
    [OracleProvider.PYTH]: accessibleColors.linePatterns.dashDot,
    [OracleProvider.API3]: accessibleColors.linePatterns.longDash,
    [OracleProvider.REDSTONE]: '5 5',
    [OracleProvider.DIA]: '10 2',
    [OracleProvider.WINKLINK]: '8 3 2 3',
  };
  return patternMap[oracle] || '0';
};
