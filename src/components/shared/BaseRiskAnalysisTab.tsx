'use client';

import { memo } from 'react';

import {
  Shield,
  BarChart3,
  TrendingDown,
  Link2,
  AlertTriangle,
  Clock,
  Lock,
  Share2,
  Zap,
  Heart,
} from 'lucide-react';

import {
  getLevelBadge,
  ScoreBar,
  RiskMetricCard,
  formatStaleness,
} from '@/components/shared/RiskMetricCard';
import {
  type RiskLevel,
  type RiskWeights,
  DEFAULT_RISK_WEIGHTS,
} from '@/lib/analytics/riskMetrics';

export interface BaseRiskMetrics {
  riskScore: number;
  riskLevel: RiskLevel;
  riskColor: string;
  hhiValue: number;
  hhiLevel: RiskLevel;
  diversificationScore: number;
  diversificationLevel: RiskLevel;
  volatilityIndex: number;
  volatilityLevel: RiskLevel;
  correlationScore: number;
  correlationLevel: RiskLevel;
  highCorrelationPairs: string[];
  freshnessScore: number;
  freshnessLevel: RiskLevel;
  staleOracles: Array<{ name: string; stalenessSeconds: number }>;
  manipulationResistanceScore: number;
  manipulationResistanceLevel: RiskLevel;
  manipulationResistanceFactors: {
    dataSourceDiversity: number;
    aggregationRobustness: number;
    updateFrequency: number;
    onChainVerification: number;
  };
  sharedDependencyScore: number;
  sharedDependencyLevel: RiskLevel;
  sharedSourceGroups: Array<{ source: string; oracles: string[] }>;
  systemicRiskFactor: number;
  weights: RiskWeights;
  divergenceAccelerationScore: number;
  divergenceAccelerationLevel: RiskLevel;
  feedBehaviorHealthAvg: number;
  feedBehaviorHealthLevel: RiskLevel;
  stabilityDecayScore: number;
  stabilityDecayLevel: RiskLevel;
  riskAttribution: Array<{ dimension: string; contribution: number; suggestion: string }>;
  entityCount: number;
}

const LABELS: Record<'oracle' | 'chain', Record<string, string>> = {
  oracle: {
    headerTitle: 'Risk Analysis',
    countLabel: 'Oracle Count',
    hhiTitle: 'Market Concentration (HHI)',
    hhiDescription:
      'Herfindahl-Hirschman Index measuring oracle market concentration. Lower is more competitive.',
    hhiThresholdLow: 'Competitive',
    diversificationTitle: 'Diversification Score',
    diversificationDescription:
      'Evaluates chain, protocol, and asset diversity across oracle sources. Higher is better.',
    diversificationComposition:
      'Chain Diversity (30%) · Protocol Diversity (40%) · Asset Diversity (30%)',
    volatilityTitle: 'Volatility Index',
    volatilityDescription:
      'Price volatility based on log returns from time-series data. Higher values indicate greater price instability.',
    correlationTitle: 'Correlation Risk',
    correlationDescription:
      'Inter-oracle price correlation. High correlation means oracles may share common failure modes.',
    correlationEmpty:
      'No high correlation pairs detected — oracle sources are sufficiently independent.',
    freshnessDescription:
      'Risk from stale or delayed oracle data. Stale prices can be exploited in attacks (e.g., Mango Markets $117M).',
    staleLabel: 'Stale Oracles',
    freshnessEmpty: 'All oracle data is fresh — no stale data detected.',
    manipulationDescription:
      'Resistance to price manipulation based on data source diversity, aggregation method, update frequency, and on-chain verification.',
    sharedDependencyDescription:
      'Risk from oracles sharing common data sources. If a shared source fails, multiple oracles are affected simultaneously.',
    sharedSourceLabel: 'Shared Data Sources',
    sharedDependencyEmpty:
      'No shared data source dependencies detected — oracle data sources are independent.',
    divergenceDescription:
      'Detects oracles whose deviation from consensus is accelerating, indicating potential data source issues or manipulation attempts',
    feedBehaviorTitle: 'Feed Behavior Health',
    feedBehaviorDescription:
      'Overall health of oracle feed behavior including update rhythm, confidence intervals, and heartbeat reliability',
    feedBehaviorComposition:
      'Rhythm Stability (30%) · Confidence Stability (25%) · Heartbeat Reliability (25%) · Freshness (20%)',
    stabilityDescription:
      'Detects declining stability trends in oracle data. Early warning before quality degrades to critical levels',
  },
  chain: {
    headerTitle: 'Cross-Chain Risk Analysis',
    countLabel: 'Chain Count',
    hhiTitle: 'Chain Concentration (HHI)',
    hhiDescription:
      'Herfindahl-Hirschman Index measuring price concentration across chains. Lower is more balanced.',
    hhiThresholdLow: 'Balanced',
    diversificationTitle: 'Concentration Risk',
    diversificationDescription:
      'Risk from insufficient chain diversity. Low diversification means single-chain failures have greater impact.',
    diversificationComposition:
      'Chain Diversity (30%) · Protocol Diversity (40%) · Asset Diversity (30%)',
    volatilityTitle: 'Cross-Chain Volatility Index',
    volatilityDescription:
      'Price volatility across chains based on log returns. Higher values indicate greater inter-chain price instability.',
    correlationTitle: 'Inter-Chain Correlation Risk',
    correlationDescription:
      'Cross-chain price correlation. High correlation means chains may share common failure modes or data sources.',
    correlationEmpty:
      'No high correlation pairs detected — chain sources are sufficiently independent.',
    freshnessDescription:
      'Risk from stale or delayed chain data. Stale prices can be exploited in cross-chain arbitrage attacks.',
    staleLabel: 'Stale Chains',
    freshnessEmpty: 'All chain data is fresh — no stale data detected.',
    manipulationDescription:
      'Resistance to price manipulation based on data source diversity, update frequency, and on-chain verification per chain.',
    sharedDependencyDescription:
      'Risk from chains sharing the same oracle provider. If the provider fails, all dependent chains are affected simultaneously.',
    sharedSourceLabel: 'Shared Oracle Providers',
    sharedDependencyEmpty:
      'No shared oracle provider dependencies — chains use independent sources.',
    divergenceDescription:
      'Detects chains whose deviation from cross-chain consensus is accelerating, indicating potential oracle issues or network congestion',
    feedBehaviorTitle: 'Feed Behavior Risk',
    feedBehaviorDescription:
      'Risk from degraded chain feed behavior including update rhythm anomalies, confidence instability, and heartbeat loss',
    feedBehaviorComposition:
      'Rhythm Stability (30%) · Confidence Stability (25%) · Heartbeat Reliability (25%) · Freshness (20%)',
    stabilityDescription:
      'Detects declining stability trends in chain data. Early warning before quality degrades to critical levels',
  },
};

interface BaseRiskAnalysisTabProps {
  mode: 'oracle' | 'chain';
  riskMetrics: BaseRiskMetrics;
}

function BaseRiskAnalysisTabComponent({ mode, riskMetrics }: BaseRiskAnalysisTabProps) {
  const labels = LABELS[mode];
  const {
    riskScore,
    riskLevel,
    riskColor,
    hhiValue,
    hhiLevel,
    diversificationScore,
    diversificationLevel,
    volatilityIndex,
    volatilityLevel,
    correlationScore,
    correlationLevel,
    highCorrelationPairs,
    freshnessScore,
    freshnessLevel,
    staleOracles,
    manipulationResistanceScore,
    manipulationResistanceLevel,
    manipulationResistanceFactors,
    sharedDependencyScore,
    sharedDependencyLevel,
    sharedSourceGroups,
    systemicRiskFactor,
    weights,
    divergenceAccelerationScore,
    divergenceAccelerationLevel,
    feedBehaviorHealthAvg,
    feedBehaviorHealthLevel,
    stabilityDecayScore,
    stabilityDecayLevel,
    riskAttribution,
    entityCount,
  } = riskMetrics;

  const overallBadge = getLevelBadge(riskLevel);
  const w = weights ?? DEFAULT_RISK_WEIGHTS;

  const diversificationValue = mode === 'chain' ? 100 - diversificationScore : diversificationScore;
  const feedBehaviorValue = mode === 'chain' ? 100 - feedBehaviorHealthAvg : feedBehaviorHealthAvg;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">{labels.headerTitle}</span>
          </div>
          <p className="text-xs text-gray-500">
            Comprehensive risk assessment: 7 weighted dimensions (market concentration,
            diversification, volatility, correlation, data freshness, manipulation resistance,
            shared dependency) + 3 tracked dimensions (divergence acceleration, feed behavior,
            stability decay). Based on accumulated polled data (up to 24h window).
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{labels.countLabel}</p>
          <p className="text-lg font-semibold text-gray-900">{entityCount}</p>
        </div>
      </div>

      <div className="border-y border-slate-900/15 bg-white/55 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gray-700" />
            <span className="text-base font-semibold text-gray-900">Overall Risk Score</span>
          </div>
          <span
            className={`inline-flex items-center border-l-2 border-current px-2.5 py-1 text-xs font-semibold ${overallBadge.bgClass} ${overallBadge.textClass}`}
          >
            {overallBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div
              className="flex h-20 w-20 items-center justify-center border-4"
              style={{ borderColor: riskColor }}
            >
              <span className="text-2xl font-bold text-gray-900">{riskScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <ScoreBar value={riskScore} maxValue={100} color={riskColor} />
            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
              <span>Low (0-24)</span>
              <span>Medium (25-44)</span>
              <span>High (45-64)</span>
              <span>Critical (65-100)</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Weighted composite: HHI ({Math.round(w.hhi * 100)}%) · Diversification (
              {Math.round(w.diversification * 100)}%) · Volatility ({Math.round(w.volatility * 100)}
              %) · Correlation ({Math.round(w.correlation * 100)}%) · Freshness (
              {Math.round(w.freshness * 100)}%) · Manip. Resistance (
              {Math.round(w.manipulationResistance * 100)}%) · Shared Dep. (
              {Math.round(w.sharedDependency * 100)}%) + 3 unweighted tracked dimensions
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskMetricCard
          icon={BarChart3}
          iconColor="text-blue-500"
          title={labels.hhiTitle}
          description={labels.hhiDescription}
          value={hhiValue}
          maxValue={10000}
          unit={mode === 'chain' ? 'HHI' : undefined}
          level={hhiLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium text-gray-700">Thresholds:</span> &lt;1500{' '}
            {labels.hhiThresholdLow} · 1500-2500 Moderate · &gt;2500 Concentrated
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={Shield}
          iconColor="text-emerald-500"
          title={labels.diversificationTitle}
          description={labels.diversificationDescription}
          value={diversificationValue}
          maxValue={100}
          unit={mode === 'oracle' ? '/ 100' : undefined}
          level={diversificationLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            {mode === 'chain' && (
              <>
                <span className="font-medium text-gray-700">Diversification Score:</span>{' '}
                {diversificationScore}/100 ·{' '}
              </>
            )}
            {mode === 'oracle' && <span className="font-medium text-gray-700">Composition:</span>}{' '}
            {labels.diversificationComposition}
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={TrendingDown}
          iconColor="text-blue-600"
          title={labels.volatilityTitle}
          description={labels.volatilityDescription}
          value={volatilityIndex}
          maxValue={100}
          level={volatilityLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium text-gray-700">Thresholds:</span> &lt;20 Low · 20-40
            Moderate · 40-60 High · &gt;60 Extreme
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={Link2}
          iconColor="text-orange-500"
          title={labels.correlationTitle}
          description={labels.correlationDescription}
          value={correlationScore}
          maxValue={100}
          level={correlationLevel}
        >
          {highCorrelationPairs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1.5">
                High Correlation Pairs (&gt;80%):
              </p>
              <div className="space-y-1">
                {highCorrelationPairs.map((pair, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span className="text-gray-600">{pair}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {highCorrelationPairs.length === 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              {labels.correlationEmpty}
            </div>
          )}
        </RiskMetricCard>

        <RiskMetricCard
          icon={Clock}
          iconColor="text-blue-600"
          title="Data Freshness Risk"
          description={labels.freshnessDescription}
          value={freshnessScore}
          maxValue={100}
          level={freshnessLevel}
        >
          {staleOracles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1.5">
                {labels.staleLabel} (&gt;2min delay):
              </p>
              <div className="space-y-1">
                {staleOracles.map((oracle, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span className="text-gray-600">
                      {oracle.name}: {formatStaleness(oracle.stalenessSeconds)} old
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {staleOracles.length === 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              {labels.freshnessEmpty}
            </div>
          )}
        </RiskMetricCard>

        <RiskMetricCard
          icon={Lock}
          iconColor="text-blue-700"
          title="Manipulation Resistance"
          description={labels.manipulationDescription}
          value={manipulationResistanceScore}
          maxValue={100}
          level={manipulationResistanceLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Data Sources:</span>
                <span className="font-mono font-medium text-gray-700">
                  {manipulationResistanceFactors.dataSourceDiversity}%
                </span>
                <span
                  className={`font-medium ${manipulationResistanceFactors.dataSourceDiversity >= 80 ? 'text-emerald-600' : manipulationResistanceFactors.dataSourceDiversity >= 50 ? 'text-amber-600' : 'text-red-600'}`}
                >
                  {manipulationResistanceFactors.dataSourceDiversity >= 80
                    ? 'Strong'
                    : manipulationResistanceFactors.dataSourceDiversity >= 50
                      ? 'Moderate'
                      : 'Weak'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Aggregation:</span>
                <span className="font-mono font-medium text-gray-700">
                  {manipulationResistanceFactors.aggregationRobustness}%
                </span>
                <span
                  className={`font-medium ${manipulationResistanceFactors.aggregationRobustness >= 80 ? 'text-emerald-600' : manipulationResistanceFactors.aggregationRobustness >= 50 ? 'text-amber-600' : 'text-red-600'}`}
                >
                  {manipulationResistanceFactors.aggregationRobustness >= 80
                    ? 'Strong'
                    : manipulationResistanceFactors.aggregationRobustness >= 50
                      ? 'Moderate'
                      : 'Weak'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Update Freq:</span>
                <span className="font-mono font-medium text-gray-700">
                  {manipulationResistanceFactors.updateFrequency}%
                </span>
                <span
                  className={`font-medium ${manipulationResistanceFactors.updateFrequency >= 80 ? 'text-emerald-600' : manipulationResistanceFactors.updateFrequency >= 50 ? 'text-amber-600' : 'text-red-600'}`}
                >
                  {manipulationResistanceFactors.updateFrequency >= 80
                    ? 'Strong'
                    : manipulationResistanceFactors.updateFrequency >= 50
                      ? 'Moderate'
                      : 'Weak'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">On-chain Verify:</span>
                <span className="font-mono font-medium text-gray-700">
                  {manipulationResistanceFactors.onChainVerification}%
                </span>
                <span
                  className={`font-medium ${manipulationResistanceFactors.onChainVerification >= 80 ? 'text-emerald-600' : manipulationResistanceFactors.onChainVerification >= 50 ? 'text-amber-600' : 'text-red-600'}`}
                >
                  {manipulationResistanceFactors.onChainVerification >= 80
                    ? 'Strong'
                    : manipulationResistanceFactors.onChainVerification >= 50
                      ? 'Moderate'
                      : 'Weak'}
                </span>
              </div>
            </div>
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={Share2}
          iconColor="text-blue-600"
          title="Shared Dependency Risk"
          description={labels.sharedDependencyDescription}
          value={sharedDependencyScore}
          maxValue={100}
          level={sharedDependencyLevel}
        >
          {sharedSourceGroups.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1.5">
                {labels.sharedSourceLabel}:
              </p>
              <div className="space-y-1">
                {sharedSourceGroups.map((group, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span className="text-gray-600">
                      <span className="font-medium capitalize">{group.source}</span>
                      {' → '}
                      {group.oracles.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                Systemic risk factor: {(systemicRiskFactor * 100).toFixed(1)}%
              </p>
            </div>
          )}
          {sharedSourceGroups.length === 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              {labels.sharedDependencyEmpty}
            </div>
          )}
        </RiskMetricCard>

        <RiskMetricCard
          icon={Zap}
          iconColor="text-blue-600"
          title="Divergence Acceleration Risk"
          description={labels.divergenceDescription}
          value={divergenceAccelerationScore}
          maxValue={100}
          level={divergenceAccelerationLevel}
        />

        <RiskMetricCard
          icon={Heart}
          iconColor="text-blue-700"
          title={labels.feedBehaviorTitle}
          description={labels.feedBehaviorDescription}
          value={feedBehaviorValue}
          maxValue={100}
          level={feedBehaviorHealthLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            {mode === 'chain' && (
              <>
                <span className="font-medium text-gray-700">Feed Health Score:</span>{' '}
                {feedBehaviorHealthAvg}/100 ·{' '}
              </>
            )}
            {mode === 'oracle' && <span className="font-medium text-gray-700">Composition:</span>}{' '}
            {labels.feedBehaviorComposition}
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={TrendingDown}
          iconColor="text-blue-600"
          title="Stability Decay Risk"
          description={labels.stabilityDescription}
          value={stabilityDecayScore}
          maxValue={100}
          level={stabilityDecayLevel}
        />
      </div>

      {riskAttribution.length > 0 && (
        <div className="border-y border-slate-900/15 bg-white/55 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Risk Attribution Analysis</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Identifies which risk dimensions contribute most to the overall risk score and provides
            actionable recommendations
          </p>
          <div className="space-y-3">
            {riskAttribution.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-slate-900/10 bg-white/35 p-3 last:border-b-0"
              >
                <div className="flex-shrink-0 w-16 text-right">
                  <span className="text-sm font-mono font-medium text-gray-700">
                    {item.contribution.toFixed(1)}%
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">{item.dimension}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden bg-gray-200">
                    <div
                      className="h-1.5 bg-amber-500"
                      style={{ width: `${Math.min(item.contribution, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 max-w-[200px]">
                  <span className="text-[10px] text-gray-500">{item.suggestion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const BaseRiskAnalysisTab = memo(BaseRiskAnalysisTabComponent);
BaseRiskAnalysisTab.displayName = 'BaseRiskAnalysisTab';
