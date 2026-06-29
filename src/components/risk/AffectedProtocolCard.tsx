'use client';

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
  className,
}: AffectedProtocolCardProps) {
  const ltPercent = (1 / protocol.liquidationThreshold) * 100;
  const chainName = chainNames[protocol.chain] ?? protocol.chain;

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
        riskLevel === 'critical' || riskLevel === 'severe'
          ? 'border-red-200'
          : riskLevel === 'warning'
            ? 'border-amber-200'
            : 'border-gray-200',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-semibold text-gray-900">{protocol.protocolName}</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {chainName}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
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

          <p className="text-sm text-gray-600 leading-relaxed">{protocol.riskSummary}</p>
        </div>

        <Link
          href={`/safety-check?protocol=${protocol.protocolId}&collateral=${assetSymbol}`}
          passHref
        >
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
