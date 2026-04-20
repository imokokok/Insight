import { approximatePValue } from './statisticsUtils';

interface TimestampedPrice {
  timestamp: number;
  price: number;
}

interface CorrelationResult {
  correlation: number;
  pValue: number;
  sampleSize: number;
  isSignificant: boolean;
  significanceLevel: '***' | '**' | '*' | '';
}

const DEFAULT_TIMESTAMP_TOLERANCE_MS = 60000;

const findClosestPrice = (
  timestamp: number,
  data: TimestampedPrice[],
  toleranceMs: number = DEFAULT_TIMESTAMP_TOLERANCE_MS
): number | null => {
  let closestItem: TimestampedPrice | null = null;
  let minDiff = Infinity;

  for (const item of data) {
    const diff = Math.abs(item.timestamp - timestamp);
    if (diff <= toleranceMs && diff < minDiff) {
      minDiff = diff;
      closestItem = item;
    }
  }

  return closestItem?.price ?? null;
};

const matchTimestamps = (
  dataX: TimestampedPrice[],
  dataY: TimestampedPrice[],
  toleranceMs: number = DEFAULT_TIMESTAMP_TOLERANCE_MS
): { x: number; y: number }[] => {
  const mapY = new Map<number, number>();
  dataY.forEach((item) => mapY.set(item.timestamp, item.price));

  const matchedPairs: { x: number; y: number }[] = [];
  dataX.forEach((itemX) => {
    const priceY = mapY.get(itemX.timestamp);
    if (priceY !== undefined) {
      matchedPairs.push({ x: itemX.price, y: priceY });
    } else {
      const closestPrice = findClosestPrice(itemX.timestamp, dataY, toleranceMs);
      if (closestPrice !== null) {
        matchedPairs.push({ x: itemX.price, y: closestPrice });
      }
    }
  });

  return matchedPairs;
};

export const calculatePearsonCorrelationWithSignificanceByTimestamp = (
  dataX: TimestampedPrice[],
  dataY: TimestampedPrice[],
  toleranceMs: number = DEFAULT_TIMESTAMP_TOLERANCE_MS
): CorrelationResult => {
  if (dataX.length < 3 || dataY.length < 3) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: 0,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const matchedPairs = matchTimestamps(dataX, dataY, toleranceMs);

  const n = matchedPairs.length;
  if (n < 3) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: n,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const xMean = matchedPairs.reduce((sum, pair) => sum + pair.x, 0) / n;
  const yMean = matchedPairs.reduce((sum, pair) => sum + pair.y, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = matchedPairs[i].x - xMean;
    const yDiff = matchedPairs[i].y - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  if (denominator === 0) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: n,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const correlation = numerator / denominator;

  const correlationDenominator = 1 - correlation * correlation;
  if (correlationDenominator <= 0) {
    return {
      correlation,
      pValue: 0,
      sampleSize: n,
      isSignificant: true,
      significanceLevel: '***',
    };
  }

  const tStatistic = correlation * Math.sqrt((n - 2) / correlationDenominator);

  const df = n - 2;
  const pValue = approximatePValue(Math.abs(tStatistic), df);

  let significanceLevel: '***' | '**' | '*' | '' = '';
  if (pValue < 0.001) {
    significanceLevel = '***';
  } else if (pValue < 0.01) {
    significanceLevel = '**';
  } else if (pValue < 0.05) {
    significanceLevel = '*';
  }

  return {
    correlation,
    pValue,
    sampleSize: n,
    isSignificant: pValue < 0.05,
    significanceLevel,
  };
};
