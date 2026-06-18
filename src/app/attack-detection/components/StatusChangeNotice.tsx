'use client';

import { useEffect, useRef, useState } from 'react';

import { ArrowUp, ArrowDown, X } from 'lucide-react';

import { getSymbolCategory } from '@/lib/constants';
import { cn } from '@/lib/utils';

import { THREAT_LEVEL_CONFIG, DEFAULT_DEVIATION_THRESHOLDS } from '../types';

import type { ThreatLevel, AttackSignature } from '../types';

// ── Threat level severity ranking (for comparing escalation/de-escalation) ──
const THREAT_SEVERITY: Record<ThreatLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

interface StatusChangeNoticeProps {
  threatLevel: ThreatLevel;
  signature: AttackSignature;
  symbol: string;
}

interface ChangeNotice {
  from: ThreatLevel;
  to: ThreatLevel;
  reason: string;
  timestamp: number;
}

function getThresholdPct(symbol: string): number {
  const category = getSymbolCategory(symbol);
  return DEFAULT_DEVIATION_THRESHOLDS[category] ?? DEFAULT_DEVIATION_THRESHOLDS.alt;
}

// ── Find the top trigger reason for the notice ──
function getTopReason(signature: AttackSignature, symbol: string): string {
  const thresholdPct = getThresholdPct(symbol);

  if (signature.isLiquidityDrain && signature.drainSeverity > 0.5) {
    return `pool liquidity dropped ${(signature.liquidityChangeRate * 100).toFixed(1)}%`;
  }
  if (Math.abs(signature.spotTwapDeviation) > thresholdPct) {
    return `price deviation reached ${signature.spotTwapDeviation.toFixed(2)}%`;
  }
  if (signature.crossOracleAgreement < 0.5) {
    return `oracle agreement fell to ${(signature.crossOracleAgreement * 100).toFixed(1)}%`;
  }
  if (signature.heartbeatAnomaly) {
    return 'oracle stopped updating (stale price)';
  }
  if (signature.liquidityLevel === 'critical' || signature.liquidityLevel === 'thin') {
    return `pool liquidity is ${signature.liquidityLevel}`;
  }
  if (signature.poolConsistencyAnomaly) {
    return 'pool state inconsistency detected';
  }
  return 'anomaly signals cleared';
}

export function StatusChangeNotice({ threatLevel, signature, symbol }: StatusChangeNoticeProps) {
  const prevLevelRef = useRef<ThreatLevel | null>(null);
  const [notice, setNotice] = useState<ChangeNotice | null>(null);

  useEffect(() => {
    const prevLevel = prevLevelRef.current;

    // Skip on first render (initial load)
    if (prevLevel === null) {
      prevLevelRef.current = threatLevel;
      return;
    }

    // Only show notice when level actually changes
    if (prevLevel !== threatLevel) {
      const isEscalation = THREAT_SEVERITY[threatLevel] > THREAT_SEVERITY[prevLevel];
      setNotice({
        from: prevLevel,
        to: threatLevel,
        reason: getTopReason(signature, symbol),
        timestamp: Date.now(),
      });

      // Auto-dismiss after 15 seconds for de-escalations, 30 for escalations
      const dismissMs = isEscalation ? 30000 : 15000;
      const timer = setTimeout(() => setNotice(null), dismissMs);
      prevLevelRef.current = threatLevel;
      return () => clearTimeout(timer);
    }

    prevLevelRef.current = threatLevel;
  }, [threatLevel, signature, symbol]);

  if (!notice) return null;

  const isEscalation = THREAT_SEVERITY[notice.to] > THREAT_SEVERITY[notice.from];
  const toConfig = THREAT_LEVEL_CONFIG[notice.to];

  return (
    <div
      className={cn(
        'rounded-lg border p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300',
        isEscalation ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isEscalation ? (
          <ArrowUp className="w-4 h-4 text-red-500" />
        ) : (
          <ArrowDown className="w-4 h-4 text-emerald-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">
          <span className="font-medium">
            Threat level {isEscalation ? 'escalated' : 'recovered'}:
          </span>{' '}
          <span className={cn('font-semibold', isEscalation ? 'text-red-700' : 'text-emerald-700')}>
            {THREAT_LEVEL_CONFIG[notice.from].label}
          </span>{' '}
          → <span className={cn('font-semibold', toConfig.color)}>{toConfig.label}</span>
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {isEscalation ? 'Triggered by' : 'Reason'}: {notice.reason}
        </p>
      </div>
      <button
        onClick={() => setNotice(null)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
