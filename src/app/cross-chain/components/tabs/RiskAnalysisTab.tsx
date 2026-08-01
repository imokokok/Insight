'use client';

import { memo } from 'react';

import { BaseRiskAnalysisTab, type BaseRiskMetrics } from '@/components/shared/BaseRiskAnalysisTab';

import { type CrossChainRiskResult } from '../../hooks/useCrossChainAnalytics';

interface RiskAnalysisTabProps {
  risk: CrossChainRiskResult;
  chainCount: number;
}

function RiskAnalysisTabComponent({ risk, chainCount }: RiskAnalysisTabProps) {
  const baseMetrics: BaseRiskMetrics = {
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    riskColor: risk.riskColor,
    hhiValue: risk.hhiValue,
    hhiLevel: risk.hhiLevel,
    diversificationScore: risk.diversificationScore,
    diversificationLevel: risk.diversificationLevel,
    volatilityIndex: risk.volatilityIndex,
    volatilityLevel: risk.volatilityLevel,
    correlationScore: risk.correlationScore,
    correlationLevel: risk.correlationLevel,
    highCorrelationPairs: risk.highCorrelationPairs,
    freshnessScore: risk.freshnessScore,
    freshnessLevel: risk.freshnessLevel,
    staleOracles: risk.staleOracles,
    manipulationResistanceScore: risk.manipulationResistanceScore,
    manipulationResistanceLevel: risk.manipulationResistanceLevel,
    manipulationResistanceFactors: risk.manipulationResistanceFactors,
    sharedDependencyScore: risk.sharedDependencyScore,
    sharedDependencyLevel: risk.sharedDependencyLevel,
    sharedSourceGroups: risk.sharedSourceGroups,
    systemicRiskFactor: risk.systemicRiskFactor,
    weights: risk.weights,
    divergenceAccelerationScore: risk.divergenceAccelerationScore,
    divergenceAccelerationLevel: risk.divergenceAccelerationLevel,
    feedBehaviorHealthAvg: risk.feedBehaviorHealthAvg,
    feedBehaviorHealthLevel: risk.feedBehaviorHealthLevel,
    stabilityDecayScore: risk.stabilityDecayScore,
    stabilityDecayLevel: risk.stabilityDecayLevel,
    riskAttribution: risk.riskAttribution,
    entityCount: chainCount,
  };

  return <BaseRiskAnalysisTab mode="chain" riskMetrics={baseMetrics} />;
}

export const RiskAnalysisTab = memo(RiskAnalysisTabComponent);
RiskAnalysisTab.displayName = 'RiskAnalysisTab';
