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

import { type RiskLevel, DEFAULT_RISK_WEIGHTS } from '@/lib/analytics/riskMetrics';

import { type CrossChainRiskResult } from '../../hooks/useCrossChainAnalytics';

interface RiskAnalysisTabProps {
  risk: CrossChainRiskResult;
  chainCount: number;
}

function getLevelBadge(level: RiskLevel): { label: string; bgClass: string; textClass: string } {
  switch (level) {
    case 'low':
      return { label: 'Low', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
    case 'medium':
      return { label: 'Medium', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
    case 'high':
      return { label: 'High', bgClass: 'bg-orange-50', textClass: 'text-orange-700' };
    case 'critical':
      return { label: 'Critical', bgClass: 'bg-red-50', textClass: 'text-red-700' };
    default:
      return { label: 'Unknown', bgClass: 'bg-gray-50', textClass: 'text-gray-700' };
  }
}

function ScoreBar({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}

function getBarColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return '#10b981';
    case 'medium':
      return '#f59e0b';
    case 'high':
      return '#f97316';
    case 'critical':
      return '#ef4444';
    default:
      return '#888888';
  }
}

function RiskMetricCard({
  icon: Icon,
  iconColor,
  title,
  description,
  value,
  maxValue,
  unit,
  level,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  value: number;
  maxValue: number;
  unit?: string;
  level: RiskLevel;
  children?: React.ReactNode;
}) {
  const badge = getLevelBadge(level);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${badge.bgClass} ${badge.textClass}`}
        >
          {badge.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-gray-900 font-mono">{value.toFixed(0)}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      <ScoreBar value={value} maxValue={maxValue} color={getBarColor(level)} />
      {children}
    </div>
  );
}

function formatStaleness(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function RiskAnalysisTabComponent({ risk, chainCount }: RiskAnalysisTabProps) {
  const overallBadge = getLevelBadge(risk.riskLevel);
  const w = risk.weights ?? DEFAULT_RISK_WEIGHTS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Cross-Chain Risk Analysis</span>
          </div>
          <p className="text-xs text-gray-500">
            Comprehensive risk assessment across 10 dimensions: market concentration,
            diversification, volatility, correlation, data freshness, manipulation resistance,
            shared dependency, divergence acceleration, feed behavior health, and stability decay
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Chain Count</p>
          <p className="text-lg font-semibold text-gray-900">{chainCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gray-700" />
            <span className="text-base font-semibold text-gray-900">Overall Risk Score</span>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg ${overallBadge.bgClass} ${overallBadge.textClass}`}
          >
            {overallBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center border-4"
              style={{ borderColor: risk.riskColor }}
            >
              <span className="text-2xl font-bold text-gray-900">{risk.riskScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <ScoreBar value={risk.riskScore} maxValue={100} color={risk.riskColor} />
            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
              <span>Low (0-24)</span>
              <span>Medium (25-44)</span>
              <span>High (45-64)</span>
              <span>Critical (65-100)</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Weighted composite: HHI ({Math.round(w.hhi * 100)}%) + Diversification (
              {Math.round(w.diversification * 100)}%) + Volatility ({Math.round(w.volatility * 100)}
              %) + Correlation ({Math.round(w.correlation * 100)}%) + Freshness (
              {Math.round(w.freshness * 100)}%) + Manip. Resistance (
              {Math.round(w.manipulationResistance * 100)}%) + Shared Dep. (
              {Math.round(w.sharedDependency * 100)}%) + Divergence Accel. (
              {Math.round(w.divergenceAcceleration * 100)}%) + Feed Health (
              {Math.round(w.feedBehaviorHealth * 100)}%) + Stability Decay (
              {Math.round(w.stabilityDecay * 100)}
              %)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskMetricCard
          icon={BarChart3}
          iconColor="text-blue-500"
          title="Chain Concentration (HHI)"
          description="Herfindahl-Hirschman Index measuring price concentration across chains. Lower is more balanced."
          value={risk.hhiValue}
          maxValue={10000}
          level={risk.hhiLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium text-gray-700">Thresholds:</span> &lt;1500 Balanced ·
            1500-2500 Moderate · &gt;2500 Concentrated
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={Shield}
          iconColor="text-emerald-500"
          title="Diversification Score"
          description="Evaluates chain diversity across data sources. Higher means more resilient against single-chain failures."
          value={risk.diversificationScore}
          maxValue={100}
          unit="/ 100"
          level={risk.diversificationLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium text-gray-700">Composition:</span> Chain Diversity (30%) ·
            Protocol Diversity (40%) · Asset Diversity (30%)
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={TrendingDown}
          iconColor="text-purple-500"
          title="Cross-Chain Volatility Index"
          description="Price volatility across chains based on log returns. Higher values indicate greater inter-chain price instability."
          value={risk.volatilityIndex}
          maxValue={100}
          level={risk.volatilityLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium text-gray-700">Thresholds:</span> &lt;20 Low · 20-40
            Moderate · 40-60 High · &gt;60 Extreme
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={Link2}
          iconColor="text-orange-500"
          title="Inter-Chain Correlation Risk"
          description="Cross-chain price correlation. High correlation means chains may share common failure modes or data sources."
          value={risk.correlationScore}
          maxValue={100}
          level={risk.correlationLevel}
        >
          {risk.highCorrelationPairs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1.5">
                High Correlation Pairs (&gt;80%):
              </p>
              <div className="space-y-1">
                {risk.highCorrelationPairs.map((pair, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span className="text-gray-600">{pair}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {risk.highCorrelationPairs.length === 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              No high correlation pairs detected — chain sources are sufficiently independent.
            </div>
          )}
        </RiskMetricCard>

        <RiskMetricCard
          icon={Clock}
          iconColor="text-cyan-500"
          title="Data Freshness Risk"
          description="Risk from stale or delayed chain data. Stale prices can be exploited in cross-chain arbitrage attacks."
          value={risk.freshnessScore}
          maxValue={100}
          level={risk.freshnessLevel}
        >
          {risk.staleOracles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1.5">
                Stale Chains (&gt;2min delay):
              </p>
              <div className="space-y-1">
                {risk.staleOracles.map((oracle, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-gray-600">
                      {oracle.name}: {formatStaleness(oracle.stalenessSeconds)} old
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {risk.staleOracles.length === 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              All chain data is fresh — no stale data detected.
            </div>
          )}
        </RiskMetricCard>

        <RiskMetricCard
          icon={Lock}
          iconColor="text-indigo-500"
          title="Manipulation Resistance"
          description="Resistance to price manipulation based on data source diversity, update frequency, and on-chain verification per chain."
          value={risk.manipulationResistanceScore}
          maxValue={100}
          level={risk.manipulationResistanceLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Data Sources:</span>
                <span className="font-mono font-medium text-gray-700">
                  {risk.manipulationResistanceFactors.dataSourceDiversity}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Aggregation:</span>
                <span className="font-mono font-medium text-gray-700">
                  {risk.manipulationResistanceFactors.aggregationRobustness}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Update Freq:</span>
                <span className="font-mono font-medium text-gray-700">
                  {risk.manipulationResistanceFactors.updateFrequency}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">On-chain Verify:</span>
                <span className="font-mono font-medium text-gray-700">
                  {risk.manipulationResistanceFactors.onChainVerification}%
                </span>
              </div>
            </div>
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={Share2}
          iconColor="text-rose-500"
          title="Shared Dependency Risk"
          description="Risk from chains sharing the same oracle provider. If the provider fails, all dependent chains are affected simultaneously."
          value={risk.sharedDependencyScore}
          maxValue={100}
          level={risk.sharedDependencyLevel}
        >
          {risk.sharedSourceGroups.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1.5">Shared Oracle Providers:</p>
              <div className="space-y-1">
                {risk.sharedSourceGroups.map((group, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span className="text-gray-600">
                      <span className="font-medium capitalize">{group.source}</span>
                      {' → '}
                      {group.oracles.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                Systemic risk factor: {(risk.systemicRiskFactor * 100).toFixed(1)}%
              </p>
            </div>
          )}
          {risk.sharedSourceGroups.length === 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              No shared oracle provider dependencies — chains use independent sources.
            </div>
          )}
        </RiskMetricCard>

        <RiskMetricCard
          icon={Zap}
          iconColor="text-pink-500"
          title="Divergence Acceleration Risk"
          description="Detects chains whose deviation from cross-chain consensus is accelerating, indicating potential oracle issues or network congestion"
          value={risk.divergenceAccelerationScore}
          maxValue={100}
          level={risk.divergenceAccelerationLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Thresholds: &lt;20 Low · 20-40 Moderate · 40-60 High · &gt;60 Critical
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={Heart}
          iconColor="text-teal-500"
          title="Feed Behavior Health"
          description="Overall health of chain feed behavior including update rhythm, confidence intervals, and heartbeat reliability"
          value={risk.feedBehaviorHealthAvg}
          maxValue={100}
          level={risk.feedBehaviorHealthLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Composition: Rhythm Stability (30%) · Confidence Stability (25%) · Heartbeat Reliability
            (25%) · Freshness (20%)
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={TrendingDown}
          iconColor="text-violet-500"
          title="Stability Decay Risk"
          description="Detects declining stability trends in chain data. Early warning before quality degrades to critical levels"
          value={risk.stabilityDecayScore}
          maxValue={100}
          level={risk.stabilityDecayLevel}
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Thresholds: &lt;20 Low · 20-40 Moderate · 40-60 High · &gt;60 Critical
          </div>
        </RiskMetricCard>
      </div>

      {risk.riskAttribution.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Risk Attribution Analysis</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Identifies which risk dimensions contribute most to the overall risk score and provides
            actionable recommendations
          </p>
          <div className="space-y-3">
            {risk.riskAttribution.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-16 text-right">
                  <span className="text-sm font-mono font-medium text-gray-700">
                    {item.contribution.toFixed(1)}%
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">{item.dimension}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-amber-500"
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

export const RiskAnalysisTab = memo(RiskAnalysisTabComponent);
RiskAnalysisTab.displayName = 'RiskAnalysisTab';
