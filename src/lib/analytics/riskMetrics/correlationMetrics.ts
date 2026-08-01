import { riskMetricsLogger as logger, type CorrelationRiskResult, type RiskLevel } from './types';

/**
 * Pearson correlation over the first `n` elements of `x` and `y`.
 * Extracted so callers that already know `n` can avoid re-slicing.
 */
function calculatePearsonFromSlices(x: readonly number[], y: readonly number[], n: number): number {
  const meanX = sumSlice(x, n) / n;
  const meanY = sumSlice(y, n) / n;

  let sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denominator = Math.sqrt(sumX2 * sumY2);
  if (denominator === 0) return 0;
  return sumXY / denominator;
}

function sumSlice(arr: readonly number[], n: number): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += arr[i];
  return s;
}

/**
 * Compute ranks for a numeric series, handling ties by averaging ranks.
 * This is the O(M log M) step of Spearman correlation; extracting it lets
 * callers precompute ranks once per series and reuse across many pairs.
 */
function computeRanks(data: readonly number[]): number[] {
  const indexed = data.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);

  const ranks = new Array(data.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (
      j < indexed.length - 1 &&
      Math.abs(indexed[j + 1].value - indexed[i].value) <=
        Number.EPSILON * Math.max(Math.abs(indexed[j + 1].value), Math.abs(indexed[i].value), 1)
    ) {
      j++;
    }

    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].index] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

/**
 * Spearman correlation from pre-computed ranks. Allows the caller to compute
 * each series' ranks once and reuse across all pairs that involve it.
 */
function calculateSpearmanFromRanks(
  xRanks: readonly number[],
  yRanks: readonly number[],
  n: number
): number {
  const meanXRank = sumSlice(xRanks, n) / n;
  const meanYRank = sumSlice(yRanks, n) / n;

  let sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xRanks[i] - meanXRank;
    const dy = yRanks[i] - meanYRank;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denominator = Math.sqrt(sumX2 * sumY2);
  if (denominator === 0) return 0;
  return sumXY / denominator;
}

/**
 * Combine Pearson + Spearman into the robust correlation score using the
 * same rule as `calculateRobustCorrelation`. Extracted so matrix builders
 * that precompute ranks can reuse it.
 */
function combineRobustCorrelation(pearson: number, spearman: number): number {
  const diff = Math.abs(pearson - spearman);
  if (diff > 0.3) {
    return spearman * 0.7 + pearson * 0.3;
  }
  return (pearson + spearman) / 2;
}

export function calculateCorrelationRisk(
  correlationMatrix: number[][],
  oracleNames: string[]
): CorrelationRiskResult {
  try {
    if (!correlationMatrix.length || correlationMatrix.length !== oracleNames.length) {
      throw new Error('Invalid correlation matrix or oracle names');
    }

    const n = correlationMatrix.length;
    let totalCorrelation = 0;
    let pairCount = 0;
    const highCorrelationPairs: string[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const corr = Math.abs(correlationMatrix[i][j]);
        totalCorrelation += corr;
        pairCount++;

        if (corr > 0.8) {
          highCorrelationPairs.push(
            `${oracleNames[i]} - ${oracleNames[j]} (${(corr * 100).toFixed(1)}%)`
          );
        }
      }
    }

    const avgCorrelation = pairCount > 0 ? totalCorrelation / pairCount : 0;

    const score = Math.round(avgCorrelation * 100);

    let level: RiskLevel;
    let description: string;

    if (score < 40) {
      level = 'low';
      description = 'correlation_risk_low';
    } else if (score < 60) {
      level = 'medium';
      description = 'correlation_risk_moderate';
    } else if (score < 80) {
      level = 'high';
      description = 'correlation_risk_high';
    } else {
      level = 'critical';
      description = 'correlation_risk_critical';
    }

    logger.debug(`Correlation risk score: ${score}, Avg correlation: ${avgCorrelation.toFixed(4)}`);

    return {
      score,
      level,
      description,
      avgCorrelation: Number(avgCorrelation.toFixed(4)),
      highCorrelationPairs: highCorrelationPairs.slice(0, 5),
      correlationMatrix,
      oracleNames,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate correlation risk',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      score: 0,
      level: 'critical',
      description: 'calculation_error',
      avgCorrelation: 0,
      highCorrelationPairs: [],
      correlationMatrix: [],
      oracleNames: [],
    };
  }
}

export function buildRobustCorrelationMatrix(priceHistories: Map<string, number[]>): {
  matrix: number[][];
  names: string[];
} {
  const names = Array.from(priceHistories.keys());
  const n = names.length;
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
  }

  if (n < 2) {
    return { matrix, names };
  }

  // Pre-compute each series' ranks at its FULL length and reuse across all
  // pairs that involve it. Previously each pair re-sorted both series
  // (O(M log M)), giving 2 * C(N,2) = N*(N-1) sorts; this drops it to N
  // sorts in the common equal-length case.
  //
  // IMPORTANT: ranks depend on the FULL set being ranked, so a series' pre-
  // computed ranks are only valid for a pair when pairN === series.length.
  // When lengths differ we fall back to recomputing ranks on the sliced
  // prefix, preserving identical outputs to the original implementation.
  // Pure optimization — produces identical correlation values.
  const seriesData: number[][] = [];
  const seriesRanks: number[][] = [];
  for (let i = 0; i < n; i++) {
    const x = priceHistories.get(names[i]) ?? [];
    seriesData.push(x);
    seriesRanks.push(computeRanks(x));
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const x = seriesData[i];
      const y = seriesData[j];
      const pairN = Math.min(x.length, y.length);
      if (pairN < 2) {
        matrix[i][j] = 0;
        matrix[j][i] = 0;
        continue;
      }

      // Use precomputed ranks only when the full series was ranked at the
      // pair length; otherwise recompute on the slice to match original
      // behavior exactly.
      const xRanks = pairN === x.length ? seriesRanks[i] : computeRanks(x.slice(0, pairN));
      const yRanks = pairN === y.length ? seriesRanks[j] : computeRanks(y.slice(0, pairN));

      const pearson = calculatePearsonFromSlices(x, y, pairN);
      const spearman = calculateSpearmanFromRanks(xRanks, yRanks, pairN);
      const correlation = combineRobustCorrelation(pearson, spearman);
      matrix[i][j] = correlation;
      matrix[j][i] = correlation;
    }
  }

  return { matrix, names };
}
