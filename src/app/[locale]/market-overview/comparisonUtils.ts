import { type TVSTrendData } from './types';

const ORACLE_KEYS = [
  'chainlink',
  'pyth',
  'api3',
  'uma',
  'redstone',
  'dia',
  'winklink',
] as const;

export type OracleKey = (typeof ORACLE_KEYS)[number];

export interface ComparisonPreparedData extends TVSTrendData {
  [key: string]: string | number;
}

export function prepareComparisonData(
  currentData: TVSTrendData[],
  compareData: TVSTrendData[]
): ComparisonPreparedData[] {
  return currentData.map((item, index) => {
    const compareItem = compareData[index];
    const result: ComparisonPreparedData = { ...item };

    ORACLE_KEYS.forEach((key) => {
      const currentValue = item[key] as number;
      const compareValue = compareItem?.[key] as number;
      result[`${key}Compare`] = compareValue || 0;
      result[`${key}Diff`] = currentValue - (compareValue || 0);
      result[`${key}DiffPercent`] = compareValue
        ? ((currentValue - compareValue) / compareValue) * 100
        : 0;
    });

    return result;
  });
}

export { ORACLE_KEYS };
