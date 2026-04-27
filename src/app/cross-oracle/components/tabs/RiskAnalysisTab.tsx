'use client';

import { memo } from 'react';

import { Shield, BarChart3, TrendingDown, Link2, AlertTriangle } from 'lucide-react';

import { type RiskLevel } from '@/lib/analytics/riskMetrics';

interface RiskAnalysisTabProps {
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
  oracleCount: number;
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

function RiskMetricCard({
  icon: Icon,
  iconColor,
  title,
  description,
  value,
  maxValue,
  unit,
  level,
  barColor,
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
  barColor: string;
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
      <ScoreBar value={value} maxValue={maxValue} color={barColor} />
      {children}
    </div>
  );
}

function RiskAnalysisTabComponent({
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
  oracleCount,
}: RiskAnalysisTabProps) {
  const overallBadge = getLevelBadge(riskLevel);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Risk Analysis</span>
          </div>
          <p className="text-xs text-gray-500">
            Comprehensive risk assessment based on market concentration, diversification,
            volatility, and oracle correlation
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Oracle Count</p>
          <p className="text-lg font-semibold text-gray-900">{oracleCount}</p>
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
              style={{ borderColor: riskColor }}
            >
              <span className="text-2xl font-bold text-gray-900">{riskScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <ScoreBar value={riskScore} maxValue={100} color={riskColor} />
            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
              <span>Low (0-29)</span>
              <span>Medium (30-49)</span>
              <span>High (50-69)</span>
              <span>Critical (70-100)</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Weighted composite: HHI (30%) + Diversification (25%) + Volatility (25%) + Correlation
              (20%)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskMetricCard
          icon={BarChart3}
          iconColor="text-blue-500"
          title="Market Concentration (HHI)"
          description="Herfindahl-Hirschman Index measuring oracle market concentration. Lower is more competitive."
          value={hhiValue}
          maxValue={10000}
          level={hhiLevel}
          barColor={
            hhiLevel === 'low'
              ? '#10b981'
              : hhiLevel === 'medium'
                ? '#f59e0b'
                : hhiLevel === 'high'
                  ? '#f97316'
                  : '#ef4444'
          }
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium text-gray-700">Thresholds:</span> &lt;1500 Competitive ·
            1500-2500 Moderate · &gt;2500 Concentrated
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={Shield}
          iconColor="text-emerald-500"
          title="Diversification Score"
          description="Evaluates chain, protocol, and asset diversity across oracle sources. Higher is better."
          value={diversificationScore}
          maxValue={100}
          unit="/ 100"
          level={diversificationLevel}
          barColor={
            diversificationLevel === 'low'
              ? '#10b981'
              : diversificationLevel === 'medium'
                ? '#f59e0b'
                : diversificationLevel === 'high'
                  ? '#f97316'
                  : '#ef4444'
          }
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium text-gray-700">Composition:</span> Chain Diversity (30%) ·
            Protocol Diversity (40%) · Asset Diversity (30%)
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={TrendingDown}
          iconColor="text-purple-500"
          title="Volatility Index"
          description="Price volatility based on log returns. Higher values indicate greater price instability."
          value={volatilityIndex}
          maxValue={100}
          level={volatilityLevel}
          barColor={
            volatilityLevel === 'low'
              ? '#10b981'
              : volatilityLevel === 'medium'
                ? '#f59e0b'
                : volatilityLevel === 'high'
                  ? '#f97316'
                  : '#ef4444'
          }
        >
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium text-gray-700">Thresholds:</span> &lt;20 Low · 20-40
            Moderate · 40-60 High · &gt;60 Extreme
          </div>
        </RiskMetricCard>

        <RiskMetricCard
          icon={Link2}
          iconColor="text-orange-500"
          title="Correlation Risk"
          description="Inter-oracle price correlation. High correlation means oracles may share common failure modes."
          value={correlationScore}
          maxValue={100}
          level={correlationLevel}
          barColor={
            correlationLevel === 'low'
              ? '#10b981'
              : correlationLevel === 'medium'
                ? '#f59e0b'
                : correlationLevel === 'high'
                  ? '#f97316'
                  : '#ef4444'
          }
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
              No high correlation pairs detected — oracle sources are sufficiently independent.
            </div>
          )}
        </RiskMetricCard>
      </div>
    </div>
  );
}

export const RiskAnalysisTab = memo(RiskAnalysisTabComponent);
RiskAnalysisTab.displayName = 'RiskAnalysisTab';
