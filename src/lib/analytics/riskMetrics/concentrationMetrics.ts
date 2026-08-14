import { type OracleMarketData } from '@/lib/services/marketData/types';
import { normalizeError } from '@/lib/utils/logger';

import {
  riskMetricsLogger as logger,
  type DiversificationResult,
  type HHIResult,
  type RiskLevel,
} from './types';

function calculateHHI(marketShares: number[]): HHIResult {
  try {
    if (!marketShares || marketShares.length === 0) {
      throw new Error('Market shares array is empty');
    }

    const hhi =
      marketShares.reduce((sum, share) => {
        const decimalShare = share / 100;
        return sum + Math.pow(decimalShare, 2);
      }, 0) * 10000;

    const sortedShares = [...marketShares].sort((a, b) => b - a);
    const cr4 = sortedShares.slice(0, 4).reduce((sum, share) => sum + share, 0);

    let level: RiskLevel;
    let description: string;

    if (hhi < 1500) {
      level = 'low';
      description = 'market_concentration_low';
    } else if (hhi < 2500) {
      level = 'medium';
      description = 'market_concentration_medium';
    } else if (hhi < 3500) {
      level = 'high';
      description = 'market_concentration_high';
    } else {
      level = 'critical';
      description = 'market_concentration_critical';
    }

    logger.debug(`HHI calculated: ${hhi.toFixed(2)}, Level: ${level}`);

    return {
      value: Math.round(hhi),
      level,
      description,
      concentrationRatio: Number(cr4.toFixed(2)),
    };
  } catch (error) {
    logger.error('Failed to calculate HHI', normalizeError(error));
    return {
      value: 0,
      level: 'critical',
      description: 'calculation_error',
      concentrationRatio: 0,
    };
  }
}

export function calculateHHIFromOracles(oracleData: OracleMarketData[]): HHIResult {
  const shares = oracleData.map((o) => o.share);
  return calculateHHI(shares);
}

export function calculateDiversificationScore(params: {
  chainCount: number;
  totalChains: number;
  protocolCount: number;
  totalProtocols: number;
  assetCount: number;
  totalAssets: number;
  entropy?: number;
  marketShares?: number[];
}): DiversificationResult {
  try {
    const {
      chainCount,
      totalChains,
      protocolCount,
      totalProtocols,
      assetCount,
      totalAssets,
      marketShares,
    } = params;

    let chainDiversity: number;
    let protocolDiversity: number;
    let assetDiversity: number;

    if (marketShares && marketShares.length > 0) {
      const shares = marketShares.filter((s) => s > 0);
      const n = shares.length;
      if (n <= 1) {
        chainDiversity = 0;
      } else {
        const rawEntropy = -shares.reduce((sum, s) => {
          const p = s / 100;
          return sum + (p > 0 ? p * Math.log(p) : 0);
        }, 0);
        const maxEntropy = Math.log(n);
        chainDiversity = maxEntropy > 0 ? (rawEntropy / maxEntropy) * 100 : 0;
      }
      protocolDiversity = Math.min((protocolCount / Math.max(n * 3, 1)) * 100, 100);
      assetDiversity = Math.min((assetCount / Math.max(n * 5, 1)) * 100, 100);
    } else {
      chainDiversity = totalChains > 0 ? Math.min((chainCount / totalChains) * 100, 100) : 0;
      protocolDiversity =
        totalProtocols > 0 ? Math.min((protocolCount / totalProtocols) * 100, 100) : 0;
      assetDiversity = totalAssets > 0 ? Math.min((assetCount / totalAssets) * 100, 100) : 0;
    }

    const score = Math.round(chainDiversity * 0.3 + protocolDiversity * 0.4 + assetDiversity * 0.3);

    let level: RiskLevel;
    let description: string;

    if (score >= 80) {
      level = 'low';
      description = 'diversification_excellent';
    } else if (score >= 60) {
      level = 'low';
      description = 'diversification_good';
    } else if (score >= 40) {
      level = 'medium';
      description = 'diversification_moderate';
    } else if (score >= 20) {
      level = 'high';
      description = 'diversification_poor';
    } else {
      level = 'critical';
      description = 'diversification_critical';
    }

    logger.debug(`Diversification score: ${score}, Level: ${level}`);

    return {
      score,
      level,
      description,
      factors: {
        chainDiversity: Math.round(chainDiversity),
        protocolDiversity: Math.round(protocolDiversity),
        assetDiversity: Math.round(assetDiversity),
      },
    };
  } catch (error) {
    logger.error('Failed to calculate diversification score', normalizeError(error));
    return {
      score: 0,
      level: 'critical',
      description: 'calculation_error',
      factors: {
        chainDiversity: 0,
        protocolDiversity: 0,
        assetDiversity: 0,
      },
    };
  }
}
