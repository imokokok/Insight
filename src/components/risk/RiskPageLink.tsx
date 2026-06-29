'use client';

import Link from 'next/link';

import { AlertTriangle, Anchor, ArrowRight } from 'lucide-react';

import { isStablecoin, isWrappedAsset } from '@/lib/risk/assetClassifier';
import { cn } from '@/lib/utils';

interface RiskPageLinkProps {
  symbol: string | null | undefined;
  className?: string;
}

export function RiskPageLink({ symbol, className }: RiskPageLinkProps) {
  if (!symbol) return null;

  const normalized = symbol.toUpperCase();
  const stablecoin = isStablecoin(normalized);
  const wrapped = isWrappedAsset(normalized);

  if (!stablecoin && !wrapped) return null;

  const href = stablecoin
    ? `/stablecoin-depeg?symbol=${symbol}`
    : `/wrapped-assets?symbol=${symbol}`;
  const label = stablecoin ? 'Depeg Monitor' : 'Peg Monitor';
  const icon = stablecoin ? (
    <AlertTriangle className="w-3.5 h-3.5" />
  ) : (
    <Anchor className="w-3.5 h-3.5" />
  );
  const colorClass = stablecoin
    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors',
        colorClass,
        className
      )}
    >
      {icon}
      <span>{label}</span>
      <ArrowRight className="w-3 h-3" />
    </Link>
  );
}
