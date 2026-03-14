import { OracleProvider } from '@/types/oracle';
import { chartColors, accessibleColors } from '@/lib/config/colors';

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
      [OracleProvider.BAND_PROTOCOL]: accessibleColors.chart.sequence[1],
      [OracleProvider.UMA]: accessibleColors.chart.sequence[2],
      [OracleProvider.PYTH]: accessibleColors.chart.sequence[3],
      [OracleProvider.API3]: accessibleColors.chart.sequence[4],
    } as Record<OracleProvider, string>;
  }
  return {
    [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
    [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
    [OracleProvider.UMA]: chartColors.oracle.uma,
    [OracleProvider.PYTH]: chartColors.oracle.pyth,
    [OracleProvider.API3]: chartColors.oracle.api3,
  } as Record<OracleProvider, string>;
};

export const getLineStrokeDasharray = (
  oracle: OracleProvider,
  useAccessibleColors: boolean
): string => {
  if (!useAccessibleColors) return '0';
  const patternMap: Record<OracleProvider, string> = {
    [OracleProvider.CHAINLINK]: accessibleColors.linePatterns.solid,
    [OracleProvider.BAND_PROTOCOL]: accessibleColors.linePatterns.dashed,
    [OracleProvider.UMA]: accessibleColors.linePatterns.dotted,
    [OracleProvider.PYTH]: accessibleColors.linePatterns.dashDot,
    [OracleProvider.API3]: accessibleColors.linePatterns.longDash,
    [OracleProvider.REDSTONE]: '5 5',
  };
  return patternMap[oracle] || '0';
};
