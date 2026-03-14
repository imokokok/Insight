import {
  calculateSMAWithNull as calculateSMA,
  calculateEMAWithNull as calculateEMA,
  calculateBollingerBandsWithNull as calculateBollingerBands,
  calculateVolatility,
  calculateROC,
  calculateCurrentVolatility,
  addTechnicalIndicators,
} from '@/lib/indicators';
import type { BollingerBandsResult, NullableNumber } from '@/lib/indicators';

export {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateVolatility,
  calculateROC,
  calculateCurrentVolatility,
  addTechnicalIndicators,
};

export type { BollingerBandsResult, NullableNumber };

export function calculateConfidenceIntervals(
  data: number[],
  period: number = 20
): {
  upper1: NullableNumber[];
  lower1: NullableNumber[];
  upper2: NullableNumber[];
  lower2: NullableNumber[];
} {
  const upper1: NullableNumber[] = [];
  const lower1: NullableNumber[] = [];
  const upper2: NullableNumber[] = [];
  const lower2: NullableNumber[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper1.push(null);
      lower1.push(null);
      upper2.push(null);
      lower2.push(null);
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    const mean = sum / period;

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(data[i - j] - mean, 2);
    }
    const currentStdDev = Math.sqrt(varianceSum / period);

    upper1.push(mean + currentStdDev);
    lower1.push(mean - currentStdDev);
    upper2.push(mean + 2 * currentStdDev);
    lower2.push(mean - 2 * currentStdDev);
  }

  return { upper1, lower1, upper2, lower2 };
}
