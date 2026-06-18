'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

import { getSymbolCategory } from '@/lib/constants';

import { THREAT_LEVEL_CONFIG, DEFAULT_DEVIATION_THRESHOLDS } from '../types';

import type { AttackSignature, SignatureScores, ThreatLevel } from '../types';

interface AttackSignaturePanelProps {
  signature: AttackSignature;
  scores: SignatureScores;
  threatLevel: ThreatLevel;
  confidence: number;
  recommendation: string;
  symbol: string;
}

const THREAT_FILL_COLORS: Record<ThreatLevel, string> = {
  low: 'rgba(16, 185, 129, 0.3)',
  medium: 'rgba(245, 158, 11, 0.3)',
  high: 'rgba(249, 115, 22, 0.3)',
  critical: 'rgba(239, 68, 68, 0.3)',
};

const THREAT_STROKE_COLORS: Record<ThreatLevel, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

function getThresholdPct(symbol: string): number {
  const category = getSymbolCategory(symbol);
  return DEFAULT_DEVIATION_THRESHOLDS[category] ?? DEFAULT_DEVIATION_THRESHOLDS.alt;
}

export function AttackSignaturePanel({
  signature,
  scores,
  threatLevel,
  confidence,
  recommendation,
  symbol,
}: AttackSignaturePanelProps) {
  const radarData = [
    { dimension: 'Spot/TWAP Deviation', value: scores.spotTwap },
    { dimension: 'Deviation Accel.', value: scores.acceleration },
    { dimension: 'Cross-Oracle Agreement', value: 1 - scores.agreement },
    { dimension: 'Directional Bias', value: scores.directionalBias },
    { dimension: 'Heartbeat Anomaly', value: scores.heartbeat },
    { dimension: 'Liquidity Drain', value: scores.liquidityDrain },
    { dimension: 'Liquidity Level Risk', value: scores.liquidityLevel },
    { dimension: 'Pool Consistency', value: scores.poolConsistency },
  ];

  const thresholdPct = getThresholdPct(symbol);
  const levelConfig = THREAT_LEVEL_CONFIG[threatLevel];

  const liquidityLevelLabel: Record<string, string> = {
    deep: 'Deep',
    moderate: 'Moderate',
    thin: 'Thin',
    critical: 'Critical',
  };

  const tableRows = [
    {
      feature: 'Spot/TWAP Deviation',
      description:
        'Difference between current pool price and time-weighted average. Large gaps indicate possible manipulation.',
      currentValue: `${signature.spotTwapDeviation.toFixed(2)}%`,
      threshold: `<${thresholdPct}%`,
      isOk: Math.abs(signature.spotTwapDeviation) < thresholdPct,
    },
    {
      feature: 'Deviation Accel.',
      description: 'Whether the price gap is growing. Accelerating gaps suggest an active attack.',
      currentValue:
        signature.deviationAcceleration === 'accelerating'
          ? 'Accelerating'
          : signature.deviationAcceleration === 'decelerating'
            ? 'Decelerating'
            : 'Stable',
      threshold: 'Stable',
      isOk: signature.deviationAcceleration === 'stable',
    },
    {
      feature: 'Cross-Oracle Agreement',
      description:
        'How closely multiple oracles agree. Low agreement means one source may be compromised.',
      currentValue: `${(signature.crossOracleAgreement * 100).toFixed(1)}%`,
      threshold: '<80%',
      isOk: signature.crossOracleAgreement >= 0.8,
    },
    {
      feature: 'Directional Bias',
      description:
        'Consecutive deviations in the same direction. Persistent bias suggests systematic manipulation.',
      currentValue: `${signature.directionalBiasCount}`,
      threshold: '≥3',
      isOk: signature.directionalBiasCount < 3,
    },
    {
      feature: 'Heartbeat Status',
      description:
        'Whether the oracle updates on schedule. Stale prices can be exploited for unfair liquidations.',
      currentValue: signature.heartbeatAnomaly ? 'Abnormal' : 'Normal',
      threshold: 'Normal',
      isOk: !signature.heartbeatAnomaly,
    },
    {
      feature: 'Pool Liquidity Level',
      description:
        'Depth of the DEX pool. Thin liquidity is cheaper to manipulate with a large swap.',
      currentValue: liquidityLevelLabel[signature.liquidityLevel] ?? signature.liquidityLevel,
      threshold: '≥Moderate',
      isOk: signature.liquidityLevel === 'deep' || signature.liquidityLevel === 'moderate',
    },
    {
      feature: 'Liquidity Drain',
      description: 'Sudden liquidity withdrawal. Attackers may drain LP before manipulating price.',
      currentValue: signature.isLiquidityDrain
        ? `${(signature.liquidityChangeRate * 100).toFixed(1)}%`
        : 'None',
      threshold: '>−30%',
      isOk: !signature.isLiquidityDrain,
    },
    {
      feature: 'Pool State Consistency',
      description:
        'Internal pool data consistency (sqrtPrice vs tick). Inconsistencies indicate corrupted state.',
      currentValue: signature.poolConsistencyAnomaly
        ? `${(signature.consistencyDeviation * 100).toFixed(2)}%`
        : 'Consistent',
      threshold: '<0.5%',
      isOk: !signature.poolConsistencyAnomaly,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top: Radar + Summary */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Radar Chart */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Attack Signature Radar</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 1]}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickCount={5}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke={THREAT_STROKE_COLORS[threatLevel]}
                  fill={THREAT_FILL_COLORS[threatLevel]}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Box */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-full flex flex-col justify-center gap-4">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Threat Level</span>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${levelConfig.color} ${levelConfig.bgColor} ${levelConfig.borderColor} border`}
                >
                  {levelConfig.icon} {levelConfig.label}
                </span>
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Confidence</span>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {(confidence * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Recommendation</span>
              <p className="mt-1 text-sm text-gray-700 leading-relaxed">{recommendation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Feature Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Feature</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Current</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Threshold</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.feature} className="border-b border-gray-50 last:border-b-0">
                <td className="px-4 py-3">
                  <div className="text-gray-800 font-medium">{row.feature}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    {row.description}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700 align-top">{row.currentValue}</td>
                <td className="px-4 py-3 text-gray-500 align-top">{row.threshold}</td>
                <td className="px-4 py-3 text-center align-top">
                  {row.isOk ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 inline-block" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
