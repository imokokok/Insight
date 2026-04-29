import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('feedBehavior');

export type FeedHealthLevel = 'healthy' | 'fair' | 'degraded' | 'critical';
export type RhythmAnomalyType = 'irregular' | 'sudden_slowdown' | 'sudden_speedup' | 'gap_detected';

export interface UpdateRhythmMetrics {
  provider: string;
  expectedIntervalSeconds: number;
  actualAvgIntervalSeconds: number;
  intervalStdDev: number;
  intervalCV: number;
  isAnomalous: boolean;
  anomalyType: RhythmAnomalyType | null;
  intervals: number[];
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
}

export interface FeedHealthScore {
  provider: string;
  score: number;
  level: FeedHealthLevel;
  rhythmStability: number;
  confidenceStability: number;
  heartbeatReliability: number;
  freshness: number;
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

const EXPECTED_INTERVALS: Record<string, number> = {
  pyth: 1,
  redstone: 1,
  supra: 60,
  flare: 90,
  reflector: 300,
  twap: 600,
  winklink: 1800,
  chainlink: 3600,
  api3: 3600,
  dia: 3600,
};

export function calculateUpdateRhythm(
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
      };
    }

    const mean = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

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

    for (let i = 1; i < intervals.length; i++) {
      const rollingAvg = intervals.slice(0, i).reduce((sum, v) => sum + v, 0) / i;
      if (rollingAvg > 0 && intervals[i] > 3 * rollingAvg) {
        isAnomalous = true;
        anomalyType = 'gap_detected';
        break;
      }
    }

    logger.debug(
      `Update rhythm for ${provider}: avg=${mean.toFixed(2)}s, cv=${cv.toFixed(4)}, anomalous=${isAnomalous}`
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
    };
  } catch (error) {
    logger.error(
      'Failed to calculate update rhythm',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      provider,
      expectedIntervalSeconds,
      actualAvgIntervalSeconds: 0,
      intervalStdDev: 0,
      intervalCV: 0,
      isAnomalous: false,
      anomalyType: null,
      intervals: [],
    };
  }
}

export function calculateConfidenceIntervalMetrics(
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
    if (widthChangeRate > 0.1) {
      trend = 'expanding';
    } else if (widthChangeRate < -0.1) {
      trend = 'contracting';
    }

    logger.debug(
      `Confidence interval for ${provider}: current=${currentWidth.toFixed(4)}, trend=${trend}, surge=${isSurge}`
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
    };
  } catch (error) {
    logger.error(
      'Failed to calculate confidence interval metrics',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      provider,
      currentWidth: 0,
      avgWidth: 0,
      widthChangeRate: 0,
      isSurge: false,
      surgeMagnitude: 0,
      trend: 'stable',
      widths: [],
    };
  }
}

export function calculateHeartbeat(
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

    logger.debug(
      `Heartbeat for ${provider}: reliability=${reliability.toFixed(4)}, missed=${missedBeats}, lost=${isHeartbeatLost}`
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
    };
  } catch (error) {
    logger.error(
      'Failed to calculate heartbeat',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      provider,
      expectedUpdateCount: 0,
      actualUpdateCount: 0,
      reliability: 0,
      missedBeats: 0,
      maxGapSeconds: 0,
      isHeartbeatLost: true,
      lastUpdateTimestamp: 0,
    };
  }
}

export function calculateFeedHealthScore(params: {
  rhythm: UpdateRhythmMetrics;
  confidence: ConfidenceIntervalMetrics;
  heartbeat: HeartbeatMetrics;
  freshnessSeconds: number;
  expectedIntervalSeconds: number;
}): FeedHealthScore {
  try {
    const { rhythm, confidence, heartbeat, freshnessSeconds, expectedIntervalSeconds } = params;

    const rhythmStability = 100 * (1 - Math.min(rhythm.intervalCV, 1));
    const confidenceStability = 100 * (1 - Math.min(Math.abs(confidence.widthChangeRate), 1));
    const heartbeatReliability = heartbeat.reliability * 100;

    let freshness: number;
    if (freshnessSeconds <= expectedIntervalSeconds) {
      freshness = 100;
    } else {
      const extraRatio = (freshnessSeconds - expectedIntervalSeconds) / expectedIntervalSeconds;
      freshness = Math.max(100 * Math.exp(-extraRatio), 0);
    }

    const score = Math.round(
      rhythmStability * 0.3 +
        confidenceStability * 0.25 +
        heartbeatReliability * 0.25 +
        freshness * 0.2
    );

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

    logger.debug(`Feed health for ${rhythm.provider}: score=${score}, level=${level}`);

    return {
      provider: rhythm.provider,
      score,
      level,
      rhythmStability: Math.round(rhythmStability),
      confidenceStability: Math.round(confidenceStability),
      heartbeatReliability: Math.round(heartbeatReliability),
      freshness: Math.round(freshness),
    };
  } catch (error) {
    logger.error(
      'Failed to calculate feed health score',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      provider: params.rhythm.provider,
      score: 0,
      level: 'critical',
      rhythmStability: 0,
      confidenceStability: 0,
      heartbeatReliability: 0,
      freshness: 0,
    };
  }
}

export function calculateFeedBehavior(
  priceData: Array<{
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
      const expectedInterval = EXPECTED_INTERVALS[provider.toLowerCase()] ?? 3600;

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

    const overallHealthAvg =
      healthScores.length > 0
        ? Math.round(healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length)
        : 0;

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
    logger.error(
      'Failed to calculate feed behavior',
      error instanceof Error ? error : new Error(String(error))
    );
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
