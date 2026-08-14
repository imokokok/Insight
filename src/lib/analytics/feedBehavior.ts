import { ORACLE_EXPECTED_INTERVALS } from '@/lib/constants';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('feedBehavior');

export type FeedHealthLevel = 'healthy' | 'fair' | 'degraded' | 'critical';
export type RhythmAnomalyType = 'irregular' | 'sudden_slowdown' | 'sudden_speedup' | 'gap_detected';
type HeartbeatSeverity = 'none' | 'minor' | 'moderate' | 'severe' | 'critical';

export interface UpdateRhythmMetrics {
  provider: string;
  expectedIntervalSeconds: number;
  actualAvgIntervalSeconds: number;
  intervalStdDev: number;
  intervalCV: number;
  isAnomalous: boolean;
  anomalyType: RhythmAnomalyType | null;
  intervals: number[];
  recentCV?: number;
  sampleConfidence?: number;
}

export interface ConfidenceIntervalMetrics {
  provider: string;
  currentWidth: number;
  avgWidth: number;
  widthChangeRate: number;
  isSurge: boolean;
  surgeMagnitude: number;
  trend: 'expanding' | 'contracting' | 'stable';
  widths: number[];
  ewmaChangeRate?: number;
  absoluteWidthScore?: number;
}

export interface HeartbeatMetrics {
  provider: string;
  expectedUpdateCount: number;
  actualUpdateCount: number;
  reliability: number;
  missedBeats: number;
  maxGapSeconds: number;
  isHeartbeatLost: boolean;
  lastUpdateTimestamp: number;
  heartbeatSeverity?: HeartbeatSeverity;
  recentReliability?: number;
}

export interface FeedHealthScore {
  provider: string;
  score: number;
  level: FeedHealthLevel;
  rhythmStability: number;
  confidenceStability: number;
  heartbeatReliability: number;
  freshness: number;
  penaltyAmplification?: number;
  weightProfile?: string;
}

export interface FeedBehaviorResult {
  rhythmMetrics: UpdateRhythmMetrics[];
  confidenceMetrics: ConfidenceIntervalMetrics[];
  heartbeatMetrics: HeartbeatMetrics[];
  healthScores: FeedHealthScore[];
  overallHealthAvg: number;
  overallHealthLevel: FeedHealthLevel;
  anomalyCount: number;
  heartbeatLostCount: number;
  confidenceSurgeCount: number;
}

function calculateUpdateRhythm(
  provider: string,
  timestamps: number[],
  expectedIntervalSeconds: number
): UpdateRhythmMetrics {
  try {
    if (!timestamps || timestamps.length < 2) {
      return {
        provider,
        expectedIntervalSeconds,
        actualAvgIntervalSeconds: 0,
        intervalStdDev: 0,
        intervalCV: 0,
        isAnomalous: false,
        anomalyType: null,
        intervals: [],
        recentCV: 0,
        sampleConfidence: 0,
      };
    }

    const sorted = [...timestamps].sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((sorted[i] - sorted[i - 1]) / 1000);
    }

    if (intervals.length === 0) {
      return {
        provider,
        expectedIntervalSeconds,
        actualAvgIntervalSeconds: 0,
        intervalStdDev: 0,
        intervalCV: 0,
        isAnomalous: false,
        anomalyType: null,
        intervals: [],
        recentCV: 0,
        sampleConfidence: 0,
      };
    }

    const mean = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    const sampleVariance =
      intervals.length > 1
        ? intervals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (intervals.length - 1)
        : 0;
    const stdDev = Math.sqrt(sampleVariance);
    const cv = mean > 0 ? stdDev / mean : 0;

    const recentCount = Math.min(5, intervals.length);
    const recentIntervals = intervals.slice(-recentCount);
    const recentMean = recentIntervals.reduce((sum, v) => sum + v, 0) / recentIntervals.length;
    const recentVariance =
      recentIntervals.length > 1
        ? recentIntervals.reduce((sum, v) => sum + Math.pow(v - recentMean, 2), 0) /
          (recentIntervals.length - 1)
        : 0;
    const recentCV = recentMean > 0 ? Math.sqrt(recentVariance) / recentMean : 0;

    const sampleConfidence = Math.min(1, intervals.length / 10);

    let isAnomalous = false;
    let anomalyType: RhythmAnomalyType | null = null;

    if (cv > 0.5) {
      isAnomalous = true;
      anomalyType = 'irregular';
    }

    if (mean > 1.5 * expectedIntervalSeconds) {
      isAnomalous = true;
      anomalyType = 'sudden_slowdown';
    }

    if (mean < 0.5 * expectedIntervalSeconds) {
      isAnomalous = true;
      anomalyType = 'sudden_speedup';
    }

    let runningSum = intervals.length > 0 ? intervals[0] : 0;
    for (let i = 1; i < intervals.length; i++) {
      const rollingAvg = runningSum / i;
      if (rollingAvg > 0 && intervals[i] > 3 * rollingAvg) {
        isAnomalous = true;
        anomalyType = 'gap_detected';
        break;
      }
      runningSum += intervals[i];
    }

    logger.debug(
      `Update rhythm for ${provider}: avg=${mean.toFixed(2)}s, cv=${cv.toFixed(4)}, recentCV=${recentCV.toFixed(4)}, anomalous=${isAnomalous}`
    );

    return {
      provider,
      expectedIntervalSeconds,
      actualAvgIntervalSeconds: Number(mean.toFixed(4)),
      intervalStdDev: Number(stdDev.toFixed(4)),
      intervalCV: Number(cv.toFixed(4)),
      isAnomalous,
      anomalyType,
      intervals,
      recentCV: Number(recentCV.toFixed(4)),
      sampleConfidence: Number(sampleConfidence.toFixed(4)),
    };
  } catch (error) {
    logger.error('Failed to calculate update rhythm', normalizeError(error));
    return {
      provider,
      expectedIntervalSeconds,
      actualAvgIntervalSeconds: 0,
      intervalStdDev: 0,
      intervalCV: 0,
      isAnomalous: false,
      anomalyType: null,
      intervals: [],
      recentCV: 0,
      sampleConfidence: 0,
    };
  }
}

function calculateAbsoluteWidthScore(widthPercentage: number): number {
  const absWidth = Math.abs(widthPercentage);
  if (absWidth <= 0.1) return 100;
  if (absWidth <= 0.3) return 100 - ((absWidth - 0.1) / 0.2) * 15;
  if (absWidth <= 0.5) return 85 - ((absWidth - 0.3) / 0.2) * 20;
  if (absWidth <= 1.0) return 65 - ((absWidth - 0.5) / 0.5) * 30;
  if (absWidth <= 3.0) return 35 - ((absWidth - 1.0) / 2.0) * 25;
  return Math.max(0, 10 - (absWidth - 3.0) * 2);
}

function calculateConfidenceIntervalMetrics(
  provider: string,
  confidenceData: Array<{ widthPercentage: number }>
): ConfidenceIntervalMetrics {
  try {
    if (!confidenceData || confidenceData.length === 0) {
      return {
        provider,
        currentWidth: 0,
        avgWidth: 0,
        widthChangeRate: 0,
        isSurge: false,
        surgeMagnitude: 0,
        trend: 'stable',
        widths: [],
        ewmaChangeRate: 0,
        absoluteWidthScore: 70,
      };
    }

    const widths = confidenceData.map((d) => d.widthPercentage);
    const currentWidth = widths[widths.length - 1];
    const avgWidth = widths.reduce((sum, w) => sum + w, 0) / widths.length;

    let widthChangeRate = 0;
    if (widths.length >= 2) {
      const prevWidth = widths[widths.length - 2];
      widthChangeRate = prevWidth > 0 ? (currentWidth - prevWidth) / prevWidth : 0;
    }

    let ewmaChangeRate = 0;
    if (widths.length >= 3) {
      const n = widths.length;
      const xMean = (n - 1) / 2;
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (widths[i] - avgWidth);
        denominator += (i - xMean) ** 2;
      }
      const slope = denominator > 0 ? numerator / denominator : 0;
      ewmaChangeRate = avgWidth > 0 ? slope / avgWidth : 0;
    } else if (widths.length === 2) {
      ewmaChangeRate = widthChangeRate;
    }

    const absoluteWidthScore = calculateAbsoluteWidthScore(currentWidth);

    let isSurge = false;
    let surgeMagnitude = 0;
    if (widths.length >= 2) {
      const prevWidth = widths[widths.length - 2];
      if (prevWidth > 0) {
        const changeRatio = currentWidth / prevWidth;
        if (changeRatio > 2) {
          isSurge = true;
          surgeMagnitude = Number((changeRatio - 1).toFixed(4));
        }
      }
    }

    let trend: 'expanding' | 'contracting' | 'stable' = 'stable';
    const effectiveChangeRate = widths.length >= 3 ? ewmaChangeRate : widthChangeRate;
    if (effectiveChangeRate > 0.1) {
      trend = 'expanding';
    } else if (effectiveChangeRate < -0.1) {
      trend = 'contracting';
    }

    logger.debug(
      `Confidence interval for ${provider}: current=${currentWidth.toFixed(4)}, trend=${trend}, surge=${isSurge}, ewmaRate=${ewmaChangeRate.toFixed(4)}`
    );

    return {
      provider,
      currentWidth: Number(currentWidth.toFixed(4)),
      avgWidth: Number(avgWidth.toFixed(4)),
      widthChangeRate: Number(widthChangeRate.toFixed(4)),
      isSurge,
      surgeMagnitude,
      trend,
      widths,
      ewmaChangeRate: Number(ewmaChangeRate.toFixed(4)),
      absoluteWidthScore,
    };
  } catch (error) {
    logger.error('Failed to calculate confidence interval metrics', normalizeError(error));
    return {
      provider,
      currentWidth: 0,
      avgWidth: 0,
      widthChangeRate: 0,
      isSurge: false,
      surgeMagnitude: 0,
      trend: 'stable',
      widths: [],
      ewmaChangeRate: 0,
      absoluteWidthScore: 70,
    };
  }
}

function calculateHeartbeatSeverity(
  isHeartbeatLost: boolean,
  maxGapSeconds: number,
  expectedIntervalSeconds: number,
  reliability: number
): HeartbeatSeverity {
  if (!isHeartbeatLost && reliability >= 0.9) return 'none';
  if (!isHeartbeatLost && reliability >= 0.7) return 'minor';
  if (isHeartbeatLost && maxGapSeconds <= 3 * expectedIntervalSeconds) return 'moderate';
  if (isHeartbeatLost && maxGapSeconds <= 5 * expectedIntervalSeconds) return 'severe';
  return 'critical';
}

function calculateHeartbeat(
  provider: string,
  timestamps: number[],
  expectedIntervalSeconds: number,
  currentTime: number
): HeartbeatMetrics {
  try {
    if (!timestamps || timestamps.length === 0) {
      return {
        provider,
        expectedUpdateCount: 0,
        actualUpdateCount: 0,
        reliability: 0,
        missedBeats: 0,
        maxGapSeconds: 0,
        isHeartbeatLost: true,
        lastUpdateTimestamp: 0,
        heartbeatSeverity: 'critical',
        recentReliability: 0,
      };
    }

    const sorted = [...timestamps].sort((a, b) => a - b);
    const firstTimestamp = sorted[0];
    const lastTimestamp = sorted[sorted.length - 1];
    const actualUpdateCount = sorted.length;

    const durationSeconds = (currentTime - firstTimestamp) / 1000;
    const expectedUpdateCount = Math.max(Math.floor(durationSeconds / expectedIntervalSeconds), 1);

    const reliability = Math.min(actualUpdateCount / expectedUpdateCount, 1);
    const missedBeats = Math.max(expectedUpdateCount - actualUpdateCount, 0);

    let maxGapSeconds = 0;
    let isHeartbeatLost = false;
    for (let i = 1; i < sorted.length; i++) {
      const gap = (sorted[i] - sorted[i - 1]) / 1000;
      maxGapSeconds = Math.max(maxGapSeconds, gap);
      if (gap > 2 * expectedIntervalSeconds) {
        isHeartbeatLost = true;
      }
    }

    const timeSinceLastUpdate = (currentTime - lastTimestamp) / 1000;
    if (timeSinceLastUpdate > 2 * expectedIntervalSeconds) {
      isHeartbeatLost = true;
    }

    const heartbeatSeverity = calculateHeartbeatSeverity(
      isHeartbeatLost,
      maxGapSeconds,
      expectedIntervalSeconds,
      reliability
    );

    let recentReliability = reliability;
    if (durationSeconds > 0) {
      const recentWindowStart = currentTime - durationSeconds * 0.25;
      const recentUpdates = sorted.filter((t) => t >= recentWindowStart);
      if (recentUpdates.length > 0) {
        const recentDuration = (currentTime - recentWindowStart) / 1000;
        const recentExpected = Math.max(Math.floor(recentDuration / expectedIntervalSeconds), 1);
        recentReliability = Math.min(recentUpdates.length / recentExpected, 1);
      }
    }

    logger.debug(
      `Heartbeat for ${provider}: reliability=${reliability.toFixed(4)}, recentReliability=${recentReliability.toFixed(4)}, missed=${missedBeats}, severity=${heartbeatSeverity}`
    );

    return {
      provider,
      expectedUpdateCount,
      actualUpdateCount,
      reliability: Number(reliability.toFixed(4)),
      missedBeats,
      maxGapSeconds: Number(maxGapSeconds.toFixed(4)),
      isHeartbeatLost,
      lastUpdateTimestamp: lastTimestamp,
      heartbeatSeverity,
      recentReliability: Number(recentReliability.toFixed(4)),
    };
  } catch (error) {
    logger.error('Failed to calculate heartbeat', normalizeError(error));
    return {
      provider,
      expectedUpdateCount: 0,
      actualUpdateCount: 0,
      reliability: 0,
      missedBeats: 0,
      maxGapSeconds: 0,
      isHeartbeatLost: true,
      lastUpdateTimestamp: 0,
      heartbeatSeverity: 'critical',
      recentReliability: 0,
    };
  }
}

function calculateFeedHealthScore(params: {
  rhythm: UpdateRhythmMetrics;
  confidence: ConfidenceIntervalMetrics;
  heartbeat: HeartbeatMetrics;
  freshnessSeconds: number;
  expectedIntervalSeconds: number;
}): FeedHealthScore {
  try {
    const { rhythm, confidence, heartbeat, freshnessSeconds, expectedIntervalSeconds } = params;

    const cvForScoring = rhythm.recentCV ?? rhythm.intervalCV;
    const sampleConfidence = rhythm.sampleConfidence ?? 1;
    const rawRhythmStability = 100 / (1 + Math.exp(8 * (cvForScoring - 0.5)));
    const rhythmStability = rawRhythmStability * (0.7 + 0.3 * sampleConfidence);

    const changeRateForScoring = confidence.ewmaChangeRate ?? confidence.widthChangeRate;
    const asymmetricChangeRate =
      changeRateForScoring > 0 ? changeRateForScoring * 1.5 : changeRateForScoring * 0.5;
    const changeStability = 100 / (1 + Math.exp(5 * (Math.abs(asymmetricChangeRate) - 0.3)));
    const absoluteScore = confidence.absoluteWidthScore ?? 70;
    const confidenceStability = changeStability * 0.6 + absoluteScore * 0.4;

    const recentReliability = heartbeat.recentReliability ?? heartbeat.reliability;
    const combinedHeartbeatReliability = heartbeat.reliability * 0.6 + recentReliability * 0.4;
    const heartbeatScore = combinedHeartbeatReliability * 100;

    const ratio = freshnessSeconds / expectedIntervalSeconds;
    const isRealtime = expectedIntervalSeconds <= 1;
    const isFast = expectedIntervalSeconds <= 60;
    const decayRate = isRealtime
      ? 0.15
      : isFast
        ? 0.25
        : expectedIntervalSeconds <= 600
          ? 0.35
          : 0.5;

    let freshness: number;
    if (ratio <= 1) {
      freshness = 100 - 3 * ratio;
    } else {
      const baseScore = 97;
      const excessRatio = ratio - 1;
      freshness = baseScore * Math.exp(-decayRate * excessRatio);
    }

    let weights: { rhythm: number; confidence: number; heartbeat: number; freshness: number };
    let weightProfile: string;

    if (isRealtime) {
      weights = { rhythm: 0.2, confidence: 0.2, heartbeat: 0.3, freshness: 0.3 };
      weightProfile = 'realtime';
    } else if (isFast) {
      weights = { rhythm: 0.25, confidence: 0.25, heartbeat: 0.25, freshness: 0.25 };
      weightProfile = 'fast';
    } else if (expectedIntervalSeconds <= 600) {
      weights = { rhythm: 0.3, confidence: 0.25, heartbeat: 0.25, freshness: 0.2 };
      weightProfile = 'medium';
    } else {
      weights = { rhythm: 0.35, confidence: 0.25, heartbeat: 0.25, freshness: 0.15 };
      weightProfile = 'slow';
    }

    let score = Math.round(
      rhythmStability * weights.rhythm +
        confidenceStability * weights.confidence +
        heartbeatScore * weights.heartbeat +
        freshness * weights.freshness
    );

    const subScores = [rhythmStability, confidenceStability, heartbeatScore, freshness];
    const poorMetrics = subScores.filter((s) => s < 50).length;
    let penaltyAmplification = 1.0;
    if (poorMetrics >= 3) {
      penaltyAmplification = 0.6;
    } else if (poorMetrics >= 2) {
      penaltyAmplification = 0.8;
    }
    score = Math.round(score * penaltyAmplification);

    if (heartbeat.isHeartbeatLost && rhythm.isAnomalous) {
      score = Math.round(score * 0.85);
      penaltyAmplification *= 0.85;
    }
    if (confidence.isSurge && freshness < 50) {
      score = Math.round(score * 0.9);
      penaltyAmplification *= 0.9;
    }
    if (heartbeat.heartbeatSeverity === 'severe' || heartbeat.heartbeatSeverity === 'critical') {
      score = Math.round(score * 0.85);
      penaltyAmplification *= 0.85;
    }

    score = Math.max(0, Math.min(100, score));

    let level: FeedHealthLevel;
    if (score >= 80) {
      level = 'healthy';
    } else if (score >= 60) {
      level = 'fair';
    } else if (score >= 40) {
      level = 'degraded';
    } else {
      level = 'critical';
    }

    logger.debug(
      `Feed health for ${rhythm.provider}: score=${score}, level=${level}, profile=${weightProfile}, penalty=${penaltyAmplification.toFixed(4)}`
    );

    return {
      provider: rhythm.provider,
      score,
      level,
      rhythmStability: Math.round(rhythmStability),
      confidenceStability: Math.round(confidenceStability),
      heartbeatReliability: Math.round(heartbeatScore),
      freshness: Math.round(freshness),
      penaltyAmplification: Number(penaltyAmplification.toFixed(4)),
      weightProfile,
    };
  } catch (error) {
    logger.error('Failed to calculate feed health score', normalizeError(error));
    return {
      provider: params.rhythm.provider,
      score: 0,
      level: 'critical',
      rhythmStability: 0,
      confidenceStability: 0,
      heartbeatReliability: 0,
      freshness: 0,
      penaltyAmplification: 0,
      weightProfile: 'unknown',
    };
  }
}

export function calculateFeedBehavior(
  _priceData: Array<{
    provider: string;
    price: number;
    timestamp: number;
    success: boolean;
    confidence?: number;
    confidenceInterval?: { bid: number; ask: number; widthPercentage: number };
  }>,
  priceHistoryMap: Map<
    string,
    Array<{
      price: number;
      timestamp: number;
      success: boolean;
      confidence?: number;
      confidenceInterval?: { bid: number; ask: number; widthPercentage: number };
    }>
  >,
  currentTime?: number
): FeedBehaviorResult {
  const now = currentTime ?? Date.now();
  try {
    const providers = Array.from(priceHistoryMap.keys());

    const rhythmMetrics: UpdateRhythmMetrics[] = [];
    const confidenceMetrics: ConfidenceIntervalMetrics[] = [];
    const heartbeatMetrics: HeartbeatMetrics[] = [];
    const healthScores: FeedHealthScore[] = [];

    for (const provider of providers) {
      const history = priceHistoryMap.get(provider) ?? [];
      const expectedInterval = ORACLE_EXPECTED_INTERVALS[provider.toLowerCase()] ?? 3600;

      const timestamps = history.map((h) => h.timestamp);

      const rhythm = calculateUpdateRhythm(provider, timestamps, expectedInterval);
      rhythmMetrics.push(rhythm);

      const confidenceData = history
        .filter((h) => h.confidenceInterval != null)
        .map((h) => ({ widthPercentage: h.confidenceInterval!.widthPercentage }));
      const confidence = calculateConfidenceIntervalMetrics(provider, confidenceData);
      confidenceMetrics.push(confidence);

      const heartbeat = calculateHeartbeat(provider, timestamps, expectedInterval, now);
      heartbeatMetrics.push(heartbeat);

      const lastTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : 0;
      const freshnessSeconds = Math.max((now - lastTimestamp) / 1000, 0);

      const healthScore = calculateFeedHealthScore({
        rhythm,
        confidence,
        heartbeat,
        freshnessSeconds,
        expectedIntervalSeconds: expectedInterval,
      });
      healthScores.push(healthScore);
    }

    const anomalyCount = rhythmMetrics.filter((r) => r.isAnomalous).length;
    const heartbeatLostCount = heartbeatMetrics.filter((h) => h.isHeartbeatLost).length;
    const confidenceSurgeCount = confidenceMetrics.filter((c) => c.isSurge).length;

    let overallHealthAvg = 0;
    if (healthScores.length > 0) {
      const simpleAvg = healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length;
      const minScore = Math.min(...healthScores.map((h) => h.score));
      overallHealthAvg = Math.round(simpleAvg * 0.7 + minScore * 0.3);
    }

    let overallHealthLevel: FeedHealthLevel;
    if (overallHealthAvg >= 80) {
      overallHealthLevel = 'healthy';
    } else if (overallHealthAvg >= 60) {
      overallHealthLevel = 'fair';
    } else if (overallHealthAvg >= 40) {
      overallHealthLevel = 'degraded';
    } else {
      overallHealthLevel = 'critical';
    }

    logger.info(
      `Feed behavior calculated. Overall health: ${overallHealthAvg}, Level: ${overallHealthLevel}, Anomalies: ${anomalyCount}, Heartbeat lost: ${heartbeatLostCount}, Surges: ${confidenceSurgeCount}`
    );

    return {
      rhythmMetrics,
      confidenceMetrics,
      heartbeatMetrics,
      healthScores,
      overallHealthAvg,
      overallHealthLevel,
      anomalyCount,
      heartbeatLostCount,
      confidenceSurgeCount,
    };
  } catch (error) {
    logger.error('Failed to calculate feed behavior', normalizeError(error));
    return {
      rhythmMetrics: [],
      confidenceMetrics: [],
      heartbeatMetrics: [],
      healthScores: [],
      overallHealthAvg: 0,
      overallHealthLevel: 'critical',
      anomalyCount: 0,
      heartbeatLostCount: 0,
      confidenceSurgeCount: 0,
    };
  }
}
