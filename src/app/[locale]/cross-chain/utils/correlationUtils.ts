import { approximatePValue } from './statisticsUtils';

export interface TimestampedPrice {
  timestamp: number;
  price: number;
}

export interface CorrelationResult {
  correlation: number;
  pValue: number;
  sampleSize: number;
  isSignificant: boolean;
  significanceLevel: '***' | '**' | '*' | '';
}

export interface RollingCorrelationPoint {
  timestamp: number;
  correlation: number;
}

export const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  if (denominator === 0) return 0;

  return numerator / denominator;
};

export const calculatePearsonCorrelationByTimestamp = (
  dataX: TimestampedPrice[],
  dataY: TimestampedPrice[]
): number => {
  if (dataX.length < 2 || dataY.length < 2) return 0;

  const mapY = new Map<number, number>();
  dataY.forEach((item) => mapY.set(item.timestamp, item.price));

  const matchedPairs: { x: number; y: number }[] = [];
  dataX.forEach((itemX) => {
    const priceY = mapY.get(itemX.timestamp);
    if (priceY !== undefined) {
      matchedPairs.push({ x: itemX.price, y: priceY });
    }
  });

  if (matchedPairs.length < 2) return 0;

  const n = matchedPairs.length;
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
  if (denominator === 0) return 0;

  return numerator / denominator;
};

export const calculatePearsonCorrelationWithSignificance = (
  x: number[],
  y: number[]
): CorrelationResult => {
  const n = Math.min(x.length, y.length);
  if (n < 3) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: n,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
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

  const tStatistic = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));

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

export const calculatePearsonCorrelationWithSignificanceByTimestamp = (
  dataX: TimestampedPrice[],
  dataY: TimestampedPrice[]
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

  const mapY = new Map<number, number>();
  dataY.forEach((item) => mapY.set(item.timestamp, item.price));

  const matchedPairs: { x: number; y: number }[] = [];
  dataX.forEach((itemX) => {
    const priceY = mapY.get(itemX.timestamp);
    if (priceY !== undefined) {
      matchedPairs.push({ x: itemX.price, y: priceY });
    }
  });

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

  const tStatistic = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));

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

export const calculateRollingCorrelation = (
  pricesX: number[],
  pricesY: number[],
  windowSize: number,
  timestamps?: number[]
): RollingCorrelationPoint[] => {
  const n = Math.min(pricesX.length, pricesY.length);
  if (n < windowSize || windowSize < 2) {
    return [];
  }

  if (!timestamps && process.env.NODE_ENV === 'development') {
    console.warn(
      'calculateRollingCorrelation: timestamps parameter is recommended for accurate chart X-axis values'
    );
  }

  const result: RollingCorrelationPoint[] = [];

  for (let i = windowSize - 1; i < n; i++) {
    const xSlice = pricesX.slice(i - windowSize + 1, i + 1);
    const ySlice = pricesY.slice(i - windowSize + 1, i + 1);

    const xMean = xSlice.reduce((a, b) => a + b, 0) / windowSize;
    const yMean = ySlice.reduce((a, b) => a + b, 0) / windowSize;

    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;

    for (let j = 0; j < windowSize; j++) {
      const xDiff = xSlice[j] - xMean;
      const yDiff = ySlice[j] - yMean;
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xDenominator * yDenominator);
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    result.push({
      timestamp: timestamps ? timestamps[i] : i,
      correlation: isNaN(correlation) ? 0 : correlation,
    });
  }

  return result;
};
