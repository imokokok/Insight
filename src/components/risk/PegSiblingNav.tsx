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
    <div className="editorial-frame mx-auto max-w-[1440px] px-5 pt-6 sm:px-8 lg:px-12">
      <Link
        href={sibling.href}
        className={cn(
          'group flex items-center justify-between gap-4 border-y border-slate-900/15 bg-white/35 px-4 py-3 transition-colors hover:border-blue-300 hover:bg-blue-50/40'
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
