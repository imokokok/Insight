'use client';

import { AlertTriangle, CheckCircle, Info, ChevronRight } from 'lucide-react';

import { getSymbolCategory } from '@/lib/constants';
import { cn } from '@/lib/utils';

import { THREAT_LEVEL_CONFIG, DEFAULT_DEVIATION_THRESHOLDS } from '../types';

import type { AttackSignature, ThreatLevel } from '../types';

// ── Threat level plain-language descriptions ──
const THREAT_LEVEL_DESCRIPTIONS: Record<ThreatLevel, string> = {
  low: 'No manipulation detected. All oracle prices are operating within normal parameters.',
  medium:
    'Minor anomalies detected. Some price deviation is present but within acceptable range. Continue monitoring.',
  high: 'Significant anomalies detected. Price deviation and/or liquidity changes suggest possible oracle manipulation. Review your DeFi positions.',
  critical:
    'High-risk manipulation likely. Multiple attack signals triggered simultaneously. Check position liquidation risk immediately and pause new borrowing relying on this oracle.',
};

interface TriggerReason {
  label: string;
  detail: string;
  severity: 'warning' | 'critical';
}

function getThresholdPct(symbol: string): number {
  const category = getSymbolCategory(symbol);
  return DEFAULT_DEVIATION_THRESHOLDS[category] ?? DEFAULT_DEVIATION_THRESHOLDS.alt;
}

// ── Analyze signature to find which dimensions triggered the threat ──
function analyzeTriggers(signature: AttackSignature, symbol: string): TriggerReason[] {
  const triggers: TriggerReason[] = [];
  const thresholdPct = getThresholdPct(symbol);

  // Spot/TWAP deviation
  if (Math.abs(signature.spotTwapDeviation) > thresholdPct) {
    const isCritical = Math.abs(signature.spotTwapDeviation) > thresholdPct * 2;
    triggers.push({
      label: 'Price Deviation',
      detail: `Spot price differs from TWAP by ${signature.spotTwapDeviation > 0 ? '+' : ''}${signature.spotTwapDeviation.toFixed(2)}% (threshold: ${thresholdPct}%)`,
      severity: isCritical ? 'critical' : 'warning',
    });
  }

  // Liquidity drain
  if (signature.isLiquidityDrain && signature.drainSeverity > 0.3) {
    triggers.push({
      label: 'Liquidity Drain',
      detail: `Pool liquidity dropped ${(signature.liquidityChangeRate * 100).toFixed(1)}% compared to recent average — possible setup for price manipulation`,
      severity: signature.drainSeverity > 0.7 ? 'critical' : 'warning',
    });
  }

  // Low liquidity level
  if (signature.liquidityLevel === 'thin' || signature.liquidityLevel === 'critical') {
    triggers.push({
      label: 'Low Pool Liquidity',
      detail: `Pool liquidity is ${signature.liquidityLevel} — cheap to manipulate with a large swap`,
      severity: signature.liquidityLevel === 'critical' ? 'critical' : 'warning',
    });
  }

  // Cross-oracle disagreement
  if (signature.crossOracleAgreement < 0.7) {
    triggers.push({
      label: 'Oracle Disagreement',
      detail: `Only ${(signature.crossOracleAgreement * 100).toFixed(1)}% agreement across oracles — one source may be compromised`,
      severity: signature.crossOracleAgreement < 0.5 ? 'critical' : 'warning',
    });
  }

  // Heartbeat anomaly (stale price)
  if (signature.heartbeatAnomaly) {
    triggers.push({
      label: 'Stale Price',
      detail: 'Oracle has stopped updating on schedule — protocols may be using outdated prices',
      severity: 'critical',
    });
  }

  // Pool state inconsistency
  if (signature.poolConsistencyAnomaly) {
    triggers.push({
      label: 'Pool State Inconsistency',
      detail: `Internal pool data mismatch (${(signature.consistencyDeviation * 100).toFixed(2)}%) — possible corrupted or manipulated state`,
      severity: 'warning',
    });
  }

  // Accelerating deviation
  if (signature.deviationAcceleration === 'accelerating') {
    triggers.push({
      label: 'Accelerating Deviation',
      detail: 'Price gap is growing rapidly — manipulation may be in progress',
      severity: 'critical',
    });
  }

  return triggers;
}

interface ThreatExplanationProps {
  threatLevel: ThreatLevel;
  signature: AttackSignature;
  recommendation: string;
  symbol: string;
}

export function ThreatExplanation({
  threatLevel,
  signature,
  recommendation,
  symbol,
}: ThreatExplanationProps) {
  const config = THREAT_LEVEL_CONFIG[threatLevel];
  const description = THREAT_LEVEL_DESCRIPTIONS[threatLevel];
  const triggers = analyzeTriggers(signature, symbol);
  const hasTriggers = triggers.length > 0;

  return (
    <div className={cn('rounded-lg border shadow-sm p-4', config.bgColor, config.borderColor)}>
      {/* Threat level description */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {threatLevel === 'low' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertTriangle
              className={cn(
                'w-5 h-5',
                threatLevel === 'medium' ? 'text-amber-500' : 'text-red-500'
              )}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-sm font-bold', config.color)}>
              {config.icon} {config.label} THREAT
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Trigger reasons */}
      {hasTriggers && (
        <div className="mt-4 pt-3 border-t border-gray-200/60">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              What Triggered This
            </span>
          </div>
          <div className="space-y-2">
            {triggers.map((trigger, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 flex-shrink-0 mt-0.5',
                    trigger.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">{trigger.label}</span>
                  <span className="text-sm text-gray-600 ml-1.5">{trigger.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation — always visible regardless of active tab */}
      {threatLevel !== 'low' && (
        <div className="mt-4 pt-3 border-t border-gray-200/60">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Recommended Action
            </span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed font-medium">{recommendation}</p>
        </div>
      )}
    </div>
  );
}
