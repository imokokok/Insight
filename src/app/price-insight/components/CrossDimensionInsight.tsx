'use client';

import { memo, useMemo } from 'react';

import { Link2, AlertTriangle, Shield, Activity, Zap } from 'lucide-react';

import { type FeedHealthLevel, type FeedHealthScore } from '@/lib/analytics/feedBehavior';
import { type RiskLevel } from '@/lib/analytics/riskMetrics';
import { capitalize } from '@/lib/utils/format';

interface CrossDimensionInsightProps {
  dimension: 'oracle' | 'chain';
  riskLevel: RiskLevel;
  riskScore: number;
  anomalyCount: number;
  feedHealthLevel: FeedHealthLevel;
  feedHealthAvg: number;
  acceleratingCount: number;
  heartbeatLostCount: number;
  healthScores: FeedHealthScore[];
  staleOracles: Array<{ name: string; stalenessSeconds: number }>;
  sharedSourceGroups: Array<{ source: string; oracles: string[] }>;
}

interface InsightItem {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  relatedDimensions: string[];
}

function generateInsights(
  props: CrossDimensionInsightProps,
  dimension: 'oracle' | 'chain'
): InsightItem[] {
  const insights: InsightItem[] = [];
  const entityLabel = dimension === 'oracle' ? 'oracle' : 'chain';
  const entitiesLabel = dimension === 'oracle' ? 'oracles' : 'chains';

  // Pattern 1: Price deviation + Feed health degradation → possible node issue
  const unhealthyEntities = props.healthScores
    .filter((h) => h.score < 60)
    .map((h) => capitalize(h.provider));
  if (unhealthyEntities.length > 0 && props.anomalyCount > 0) {
    insights.push({
      severity: 'critical',
      title: 'Price anomaly + degraded feed health correlation',
      description: `${unhealthyEntities.join(', ')} ${unhealthyEntities.length > 1 ? 'have' : 'has'} both price anomalies and degraded feed health (score <60). This pattern typically indicates ${entityLabel} node issues rather than genuine market movement — investigate ${entityLabel} infrastructure before trusting these price readings.`,
      relatedDimensions: ['Price Comparison', 'Feed Health'],
    });
  }

  // Pattern 2: Heartbeat lost + stale data → node likely offline
  if (props.heartbeatLostCount > 0 && props.staleOracles.length > 0) {
    const lostWithStale = props.staleOracles
      .filter((s) => s.stalenessSeconds > 120)
      .map((s) => capitalize(s.name));
    if (lostWithStale.length > 0) {
      insights.push({
        severity: 'critical',
        title: 'Heartbeat lost + stale data — node likely offline',
        description: `${lostWithStale.join(', ')} ${lostWithStale.length > 1 ? 'have' : 'has'} both lost heartbeat and stale data (>2min old). The ${entityLabel} ${lostWithStale.length > 1 ? 'nodes are' : 'node is'} likely offline. Consider excluding ${lostWithStale.length > 1 ? 'these' : 'this'} ${entityLabel} from price aggregation until connectivity is restored.`,
        relatedDimensions: ['Feed Health', 'Risk Analysis'],
      });
    }
  }

  // Pattern 3: Accelerating divergence + high volatility → potential manipulation
  if (props.acceleratingCount > 0 && props.riskLevel !== 'low') {
    insights.push({
      severity:
        props.riskLevel === 'critical' || props.riskLevel === 'high' ? 'critical' : 'warning',
      title: 'Accelerating divergence + elevated risk — potential manipulation',
      description: `${props.acceleratingCount} ${entityLabel}${props.acceleratingCount > 1 ? 's' : ''} with accelerating deviation while overall risk is ${props.riskLevel} (score ${props.riskScore}). This combination can indicate coordinated price manipulation or a cascading data source failure. Verify data source integrity across all ${entitiesLabel}.`,
      relatedDimensions: ['Divergence Signals', 'Risk Analysis'],
    });
  }

  // Pattern 4: Shared dependency + correlation risk → systemic vulnerability
  if (props.sharedSourceGroups.length > 0 && props.riskLevel !== 'low') {
    const sharedProviders = props.sharedSourceGroups
      .slice(0, 2)
      .map((g) => `${g.source} (${g.oracles.length} ${entitiesLabel})`)
      .join(', ');
    insights.push({
      severity: 'warning',
      title: 'Shared data dependency creates systemic vulnerability',
      description: `${props.sharedSourceGroups.length} shared data source group(s) detected: ${sharedProviders}. Combined with ${props.riskLevel} risk level, a single source failure could cascade across multiple ${entitiesLabel}. Ensure backup data paths are configured.`,
      relatedDimensions: ['Risk Analysis', 'Divergence Signals'],
    });
  }

  // Pattern 5: Feed health degraded + high volatility → data quality concern
  if (
    props.feedHealthLevel !== 'healthy' &&
    props.feedHealthLevel !== 'fair' &&
    props.riskLevel !== 'low'
  ) {
    insights.push({
      severity: 'warning',
      title: 'Degraded feed health + elevated risk — data quality concern',
      description: `Overall feed health is ${props.feedHealthLevel} (avg ${props.feedHealthAvg.toFixed(0)}/100) while risk is ${props.riskLevel}. Degraded feeds during high-risk periods produce unreliable prices. Consider increasing tracking frequency or temporarily switching to more reliable ${entityLabel} sources.`,
      relatedDimensions: ['Feed Health', 'Risk Analysis'],
    });
  }

  // Pattern 6: All clear — positive insight
  if (insights.length === 0) {
    insights.push({
      severity: 'info',
      title: 'All dimensions healthy — no cross-dimension concerns',
      description: `No significant cross-dimension correlations detected. Price data, feed health, risk metrics, and divergence signals are all within normal parameters. Current ${entityLabel} configuration appears stable and reliable.`,
      relatedDimensions: ['Price Comparison', 'Feed Health', 'Risk Analysis', 'Divergence Signals'],
    });
  }

  return insights;
}

function getSeverityConfig(severity: 'critical' | 'warning' | 'info') {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertTriangle,
        iconColor: 'text-red-500',
        bgClass: 'bg-red-50',
        borderClass: 'border-red-200',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-700',
        badgeLabel: 'Critical',
      };
    case 'warning':
      return {
        icon: Shield,
        iconColor: 'text-amber-500',
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-200',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-700',
        badgeLabel: 'Warning',
      };
    case 'info':
      return {
        icon: Activity,
        iconColor: 'text-blue-500',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-700',
        badgeLabel: 'Info',
      };
  }
}

function CrossDimensionInsightComponent(props: CrossDimensionInsightProps) {
  const insights = useMemo(() => generateInsights(props, props.dimension), [props]);

  if (insights.length === 0) return null;

  return (
    <div className="mt-4 border-y border-slate-900/15 bg-white/55 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Cross-Dimension Insights</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Correlated findings across price, risk, feed health, and divergence dimensions — patterns
        that are only visible when analyzing dimensions together
      </p>
      <div className="divide-y divide-slate-900/10 border-y border-slate-900/10">
        {insights.map((insight, i) => {
          const config = getSeverityConfig(insight.severity);
          const Icon = config.icon;
          return (
            <div key={i} className={`border-l-2 p-4 ${config.bgClass} ${config.borderClass}`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium text-gray-900">{insight.title}</span>
                    <span
                      className={`inline-flex items-center border-l-2 px-1.5 py-0.5 text-[10px] font-medium ${config.borderClass} ${config.badgeBg} ${config.badgeText}`}
                    >
                      {config.badgeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{insight.description}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Zap className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] text-gray-500">Related:</span>
                    {insight.relatedDimensions.map((dim) => (
                      <span
                        key={dim}
                        className="inline-flex items-center border-l-2 border-blue-300 bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                      >
                        {dim}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const CrossDimensionInsight = memo(CrossDimensionInsightComponent);
CrossDimensionInsight.displayName = 'CrossDimensionInsight';
