'use client';

import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

const SIBLING: Record<'stablecoin' | 'wrapped', { href: string; label: string; desc: string }> = {
  stablecoin: {
    href: '/wrapped-assets',
    label: 'Wrapped-Asset Peg Tracker',
    desc: 'Monitor LSTs and wrapped tokens against their underlying assets',
  },
  wrapped: {
    href: '/stablecoin-depeg',
    label: 'Stablecoin Depeg Tracker',
    desc: 'Monitor stablecoins against their pegs in real time',
  },
};

export function PegSiblingNav({ page }: { page: 'stablecoin' | 'wrapped' }) {
  const sibling = SIBLING[page];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <Link
        href={sibling.href}
        className={cn(
          'group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40'
        )}
      >
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Also available
          </div>
          <div className="truncate text-sm font-semibold text-slate-800">{sibling.label}</div>
          <div className="truncate text-xs text-slate-500">{sibling.desc}</div>
        </div>
        <ArrowRight className="w-4 h-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
      </Link>
    </div>
  );
}
