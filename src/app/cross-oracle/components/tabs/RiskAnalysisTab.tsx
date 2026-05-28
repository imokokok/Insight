'use client';

import { memo } from 'react';

import { BaseRiskAnalysisTab, type BaseRiskMetrics } from '@/components/shared/BaseRiskAnalysisTab';
import { type RiskLevel } from '@/lib/analytics/riskMetrics';

import type { RiskMetricsResult } from '../../hooks/useRiskMetrics';

interface RiskAnalysisTabProps {
  riskMetrics: RiskMetricsResult;
  oracleCount: number;
  divergenceAccelerationScore: number;
  divergenceAccelerationLevel: RiskLevel;
  feedBehaviorHealthAvg: number;
  feedBehaviorHealthLevel: RiskLevel;
  stabilityDecayScore: number;
  stabilityDecayLevel: RiskLevel;
  riskAttribution: Array<{ dimension: string; contribution: number; suggestion: string }>;
}

function RiskAnalysisTabComponent({
  riskMetrics,
  oracleCount,
  divergenceAccelerationScore,
  divergenceAccelerationLevel,
  feedBehaviorHealthAvg,
  feedBehaviorHealthLevel,
  stabilityDecayScore,
  stabilityDecayLevel,
  riskAttribution,
}: RiskAnalysisTabProps) {
  const baseMetrics: BaseRiskMetrics = {
    riskScore: riskMetrics.riskScore,
    riskLevel: riskMetrics.riskLevel,
    riskColor: riskMetrics.riskColor,
    hhiValue: riskMetrics.hhiValue,
    hhiLevel: riskMetrics.hhiLevel,
    diversificationScore: riskMetrics.diversificationScore,
    diversificationLevel: riskMetrics.diversificationLevel,
    volatilityIndex: riskMetrics.volatilityIndex,
    volatilityLevel: riskMetrics.volatilityLevel,
    correlationScore: riskMetrics.correlationScore,
    correlationLevel: riskMetrics.correlationLevel,
    highCorrelationPairs: riskMetrics.highCorrelationPairs,
    freshnessScore: riskMetrics.freshnessScore,
    freshnessLevel: riskMetrics.freshnessLevel,
    staleOracles: riskMetrics.staleOracles,
    manipulationResistanceScore: riskMetrics.manipulationResistanceScore,
    manipulationResistanceLevel: riskMetrics.manipulationResistanceLevel,
    manipulationResistanceFactors: riskMetrics.manipulationResistanceFactors,
    sharedDependencyScore: riskMetrics.sharedDependencyScore,
    sharedDependencyLevel: riskMetrics.sharedDependencyLevel,
    sharedSourceGroups: riskMetrics.sharedSourceGroups,
    systemicRiskFactor: riskMetrics.systemicRiskFactor,
    weights: riskMetrics.weights,
    divergenceAccelerationScore,
    divergenceAccelerationLevel,
    feedBehaviorHealthAvg,
    feedBehaviorHealthLevel,
    stabilityDecayScore,
    stabilityDecayLevel,
    riskAttribution,
    entityCount: oracleCount,
  };

  return <BaseRiskAnalysisTab mode="oracle" riskMetrics={baseMetrics} />;
}

export const RiskAnalysisTab = memo(RiskAnalysisTabComponent);
RiskAnalysisTab.displayName = 'RiskAnalysisTab';
