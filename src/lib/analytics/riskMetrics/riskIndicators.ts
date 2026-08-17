import { roundTo } from '@/lib/utils/format';
import { normalizeError } from '@/lib/utils/logger';

import {
  riskMetricsLogger as logger,
  type FreshnessRiskResult,
  type ManipulationResistanceResult,
  type RiskLevel,
  type SharedDependencyResult,
} from './types';

export function calculateFreshnessRisk(params: {
  oracleTimestamps: Array<{ name: string; timestamp: number }>;
  currentTime?: number;
}): FreshnessRiskResult {
  try {
    const { oracleTimestamps, currentTime } = params;
    const now = currentTime ?? Date.now();

    if (!oracleTimestamps || oracleTimestamps.length === 0) {
      throw new Error('No oracle timestamp data');
    }

    const staleOracles: Array<{ name: string; stalenessSeconds: number }> = [];
    let totalStalenessScore = 0;

    const FRESH = 30;
    const NORMAL = 60;
    const DELAYED = 120;
    const SEVERELY_DELAYED = 300;

    for (const oracle of oracleTimestamps) {
      const stalenessSeconds = Math.max(0, Math.floor((now - oracle.timestamp) / 1000));

      let oracleStalenessScore = 0;
      if (stalenessSeconds <= FRESH) {
        oracleStalenessScore = (stalenessSeconds / FRESH) * 10;
      } else if (stalenessSeconds <= NORMAL) {
        oracleStalenessScore = 10 + ((stalenessSeconds - FRESH) / (NORMAL - FRESH)) * 20;
      } else if (stalenessSeconds <= DELAYED) {
        oracleStalenessScore = 30 + ((stalenessSeconds - NORMAL) / (DELAYED - NORMAL)) * 30;
      } else if (stalenessSeconds <= SEVERELY_DELAYED) {
        oracleStalenessScore =
          60 + ((stalenessSeconds - DELAYED) / (SEVERELY_DELAYED - DELAYED)) * 25;
      } else {
        oracleStalenessScore = Math.min(85 + ((stalenessSeconds - SEVERELY_DELAYED) / 60) * 5, 100);
      }

      totalStalenessScore += oracleStalenessScore;

      if (stalenessSeconds > DELAYED) {
        staleOracles.push({ name: oracle.name, stalenessSeconds });
      }
    }

    const score = Math.min(Math.round(totalStalenessScore / oracleTimestamps.length), 100);

    let level: RiskLevel;
    let description: string;

    if (score < 20) {
      level = 'low';
      description = 'freshness_risk_low';
    } else if (score < 40) {
      level = 'medium';
      description = 'freshness_risk_moderate';
    } else if (score < 65) {
      level = 'high';
      description = 'freshness_risk_high';
    } else {
      level = 'critical';
      description = 'freshness_risk_critical';
    }

    const maxStalenessSeconds =
      oracleTimestamps.length > 0
        ? Math.max(
            ...oracleTimestamps.map((o) => Math.max(0, Math.floor((now - o.timestamp) / 1000)))
          )
        : 0;

    logger.debug(`Freshness risk score: ${score}, Stale oracles: ${staleOracles.length}`);

    return {
      score,
      level,
      description,
      staleOracleCount: staleOracles.length,
      maxStalenessSeconds,
      staleOracles: staleOracles
        .sort((a, b) => b.stalenessSeconds - a.stalenessSeconds)
        .slice(0, 5),
    };
  } catch (error) {
    logger.error('Failed to calculate freshness risk', normalizeError(error));
    return {
      score: 0,
      level: 'critical',
      description: 'calculation_error',
      staleOracleCount: 0,
      maxStalenessSeconds: 0,
      staleOracles: [],
    };
  }
}

export function calculateManipulationResistance(params: {
  oracleData: Array<{
    name: string;
    dataSources: number;
    updateFrequencySeconds: number;
    hasOnChainVerification: boolean;
    aggregationMethod: 'median' | 'weighted_average' | 'simple_average' | 'unknown';
  }>;
}): ManipulationResistanceResult {
  try {
    const { oracleData } = params;

    if (!oracleData || oracleData.length === 0) {
      throw new Error('No oracle data for manipulation resistance');
    }

    let totalDataSourceDiversity = 0;
    let totalAggregationRobustness = 0;
    let totalUpdateFrequency = 0;
    let totalOnChainVerification = 0;

    for (const oracle of oracleData) {
      const dataSourceScore = Math.min(oracle.dataSources / 10, 1) * 100;
      totalDataSourceDiversity += dataSourceScore;

      const aggregationScores: Record<string, number> = {
        median: 100,
        weighted_average: 80,
        simple_average: 60,
        unknown: 30,
      };
      totalAggregationRobustness += aggregationScores[oracle.aggregationMethod] ?? 30;

      let freqScore = 0;
      if (oracle.updateFrequencySeconds <= 1) {
        freqScore = 100;
      } else if (oracle.updateFrequencySeconds <= 10) {
        freqScore = 90;
      } else if (oracle.updateFrequencySeconds <= 60) {
        freqScore = 75;
      } else if (oracle.updateFrequencySeconds <= 300) {
        freqScore = 55;
      } else if (oracle.updateFrequencySeconds <= 3600) {
        freqScore = 35;
      } else {
        freqScore = 15;
      }
      totalUpdateFrequency += freqScore;

      totalOnChainVerification += oracle.hasOnChainVerification ? 100 : 20;
    }

    const n = oracleData.length;
    const factors = {
      dataSourceDiversity: Math.round(totalDataSourceDiversity / n),
      aggregationRobustness: Math.round(totalAggregationRobustness / n),
      updateFrequency: Math.round(totalUpdateFrequency / n),
      onChainVerification: Math.round(totalOnChainVerification / n),
    };

    const score = Math.round(
      factors.dataSourceDiversity * 0.3 +
        factors.aggregationRobustness * 0.25 +
        factors.updateFrequency * 0.25 +
        factors.onChainVerification * 0.2
    );

    const riskScore = 100 - score;

    let level: RiskLevel;
    let description: string;

    if (riskScore < 20) {
      level = 'low';
      description = 'manipulation_resistance_low';
    } else if (riskScore < 40) {
      level = 'medium';
      description = 'manipulation_resistance_moderate';
    } else if (riskScore < 60) {
      level = 'high';
      description = 'manipulation_resistance_high';
    } else {
      level = 'critical';
      description = 'manipulation_resistance_critical';
    }

    logger.debug(`Manipulation resistance risk score: ${riskScore}`);

    return {
      score: riskScore,
      level,
      description,
      factors,
    };
  } catch (error) {
    logger.error('Failed to calculate manipulation resistance', normalizeError(error));
    return {
      score: 0,
      level: 'critical',
      description: 'calculation_error',
      factors: {
        dataSourceDiversity: 0,
        aggregationRobustness: 0,
        updateFrequency: 0,
        onChainVerification: 0,
      },
    };
  }
}

export function calculateSharedDependency(params: {
  oracleData: Array<{
    name: string;
    primaryDataSources: string[];
  }>;
}): SharedDependencyResult {
  try {
    const { oracleData } = params;

    if (!oracleData || oracleData.length === 0) {
      throw new Error('No oracle data for shared dependency');
    }

    const sourceToOracles = new Map<string, string[]>();
    for (const oracle of oracleData) {
      for (const source of oracle.primaryDataSources) {
        const existing = sourceToOracles.get(source) ?? [];
        if (!existing.includes(oracle.name)) {
          existing.push(oracle.name);
        }
        sourceToOracles.set(source, existing);
      }
    }

    const sharedSourceGroups: Array<{ source: string; oracles: string[] }> = [];
    for (const [source, oracles] of sourceToOracles) {
      if (oracles.length > 1) {
        sharedSourceGroups.push({ source, oracles });
      }
    }

    sharedSourceGroups.sort((a, b) => b.oracles.length - a.oracles.length);

    const totalOracles = oracleData.length;
    let maxOverlapRatio = 0;
    for (const group of sharedSourceGroups) {
      const ratio = group.oracles.length / totalOracles;
      maxOverlapRatio = Math.max(maxOverlapRatio, ratio);
    }

    const avgOverlapRatio =
      sharedSourceGroups.length > 0
        ? sharedSourceGroups.reduce((sum, g) => sum + g.oracles.length / totalOracles, 0) /
          sharedSourceGroups.length
        : 0;

    const systemicRiskFactor = roundTo(maxOverlapRatio * 0.6 + avgOverlapRatio * 0.4, 4);

    const score = Math.min(Math.round(systemicRiskFactor * 100), 100);

    let level: RiskLevel;
    let description: string;

    if (score < 25) {
      level = 'low';
      description = 'shared_dependency_low';
    } else if (score < 50) {
      level = 'medium';
      description = 'shared_dependency_moderate';
    } else if (score < 75) {
      level = 'high';
      description = 'shared_dependency_high';
    } else {
      level = 'critical';
      description = 'shared_dependency_critical';
    }

    logger.debug(`Shared dependency score: ${score}, Systemic risk: ${systemicRiskFactor}`);

    return {
      score,
      level,
      description,
      sharedSourceGroups: sharedSourceGroups.slice(0, 5),
      systemicRiskFactor,
    };
  } catch (error) {
    logger.error('Failed to calculate shared dependency', normalizeError(error));
    return {
      score: 0,
      level: 'critical',
      description: 'calculation_error',
      sharedSourceGroups: [],
      systemicRiskFactor: 0,
    };
  }
}
