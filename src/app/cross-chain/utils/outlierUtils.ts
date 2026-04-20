import { calculatePercentile, calculateZScore } from './statisticsUtils';

export const isOutlier = (zScore: number | null, threshold: number = 2): boolean => {
  if (zScore === null) return false;
  return Math.abs(zScore) > threshold;
};
