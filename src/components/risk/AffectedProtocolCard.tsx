'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { Shield, ArrowUpRight, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui';
import { chainNames } from '@/lib/constants';
import type { AffectedProtocol, RiskLevel } from '@/lib/risk/types';
import { cn } from '@/lib/utils';
import { formatLargeNumber } from '@/lib/utils/format';

interface AffectedProtocolCardProps {
  protocol: AffectedProtocol;
  assetSymbol: string;
  riskLevel: RiskLevel;
  /** Live depeg/peg deviation percent for position-level impact estimation (P2) */
  liveDeviationPercent?: number;
  className?: string;
}

function getImpactIcon(direction: AffectedProtocol['impactDirection']) {
  switch (direction) {
    case 'collateral-down':
      return <TrendingDown className="w-4 h-4" />;
    case 'borrow-up':
      return <TrendingUp className="w-4 h-4" />;
    default:
      return <AlertTriangle className="w-4 h-4" />;
  }
}

function getImpactLabel(direction: AffectedProtocol['impactDirection']) {
  switch (direction) {
    case 'collateral-down':
      return 'Collateral Depreciation';
    case 'borrow-up':
      return 'Debt Face Value Rise';
    default:
      return 'Dual Impact';
  }
}

export function AffectedProtocolCard({
  protocol,
  assetSymbol,
  riskLevel,
  liveDeviationPercent,
  className,
}: AffectedProtocolCardProps) {
  const ltPercent = (1 / protocol.liquidationThreshold) * 100;
  const chainName = chainNames[protocol.chain] ?? protocol.chain;

  // P0: Build link based on asset role — stablecoin depeg as borrow, wrapped asset as collateral
  const safetyCheckUrl = (() => {
    const base = `/safety-check?protocol=${encodeURIComponent(protocol.protocolId)}`;
    if (protocol.impactDirection === 'borrow-up') {
      // Stablecoin depeg: asset is the borrow side, collateral picks first non-stablecoin
      return `${base}&borrow=${encodeURIComponent(assetSymbol)}`;
    }
    // Collateral-down (wrapped asset / stablecoin as collateral): asset is the collateral side
    return `${base}&collateral=${encodeURIComponent(assetSymbol)}`;
  })();

  // P2: Estimate HF impact from live deviation + LT
  const hfImpactEstimate = useMemo(() => {
    if (liveDeviationPercent == null || liveDeviationPercent === 0) return null;
    const absDeviation = Math.abs(liveDeviationPercent);
    // Simplified: for collateral-down, HF drops by ~(absDeviation / LT%) of current HF
    // For borrow-up, HF drops by ~(absDeviation / (1-CR%)) roughly
    // More precise: use deviation scenario formula
    // Worst-case HF multiplier for a single-asset δ deviation:
    //   collateral-down: HF_new ≈ HF × (1 - δ) / (1 - δ × LT_weighted)
    // Simplified estimate: HF reduction ≈ δ / LT (for collateral-down)
    if (protocol.impactDirection === 'collateral-down') {
      // δ% collateral drop → collateral value drops δ%, adjusted collateral drops δ%
      // HF_new = (adj_collateral × (1-δ/100)) / borrow / liqRatio
      // HF reduction % ≈ δ/100 × 100 = δ% (approximate, relative to current HF)
      const hfReduction = absDeviation; // percentage points of collateral value loss
      return {
        direction: 'HF drops',
        magnitude: hfReduction.toFixed(2),
        unit: '% of collateral value',
        description: `${assetSymbol} deviation of ${absDeviation.toFixed(2)}% reduces collateral value, lowering Health Factor`,
      };
    } else {
      // borrow-up: δ% borrow rise → borrow value rises δ%
      const hfReduction = absDeviation;
      return {
        direction: 'HF drops',
        magnitude: hfReduction.toFixed(2),
        unit: '% of debt value increase',
        description: `${assetSymbol} deviation of ${absDeviation.toFixed(2)}% increases debt value, lowering Health Factor`,
      };
    }
  }, [liveDeviationPercent, protocol.impactDirection, assetSymbol]);

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
        riskLevel === 'critical' || riskLevel === 'severe'
          ? 'border-red-200'
          : riskLevel === 'warning'
            ? 'border-amber-200'
            : 'border-slate-100',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-semibold text-slate-900">{protocol.protocolName}</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {chainName}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              LT {ltPercent.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              {getImpactIcon(protocol.impactDirection)}
              {getImpactLabel(protocol.impactDirection)}
            </span>
            {protocol.tvlUsd ? <span>TVL ${formatLargeNumber(protocol.tvlUsd)}</span> : null}
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">{protocol.riskSummary}</p>

          {/* P2: Live HF impact estimate */}
          {hfImpactEstimate && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                  Live Impact Estimate
                </span>
              </div>
              <p className="text-sm text-amber-700">{hfImpactEstimate.description}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-amber-600">
                <span className="font-mono font-medium">
                  {hfImpactEstimate.direction} ~{hfImpactEstimate.magnitude}
                  {hfImpactEstimate.unit}
                </span>
              </div>
            </div>
          )}
        </div>

        <Link href={safetyCheckUrl} passHref>
          <Button
            variant="secondary"
            size="sm"
            rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
          >
            Check Position
          </Button>
        </Link>
      </div>
    </div>
  );
}
