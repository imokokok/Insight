'use client';

import { memo } from 'react';

import { ShieldCheck, BarChart3, Activity, ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface QuickLinksPanelProps {
  symbol: string;
  className?: string;
}

interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
  colorClass: string;
}

export const QuickLinksPanel = memo(function QuickLinksPanel({
  symbol,
  className,
}: QuickLinksPanelProps) {
  const encodedSymbol = encodeURIComponent(symbol);

  const links: QuickLink[] = [
    {
      href: `/safety-check?symbol=${encodedSymbol}`,
      label: 'Safety Check',
      description: 'Stress-test this price against liquidation thresholds',
      icon: ShieldCheck,
      colorClass: 'text-emerald-600 bg-emerald-50',
    },
    {
      href: `/price-insight?symbol=${encodedSymbol}`,
      label: 'Price Insight',
      description: 'Cross-oracle and cross-chain comparison',
      icon: BarChart3,
      colorClass: 'text-violet-600 bg-violet-50',
    },
    {
      href: `/reputation`,
      label: 'Reputation',
      description: 'View provider reputation rankings',
      icon: Activity,
      colorClass: 'text-blue-600 bg-blue-50',
    },
  ];

  return (
    <div className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm p-4', className)}>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Explore Further</h3>
      <div className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.label}
              href={link.href}
              className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                  link.colorClass
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-slate-800">{link.label}</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{link.description}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
});
