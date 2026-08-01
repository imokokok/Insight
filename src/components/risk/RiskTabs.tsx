'use client';

import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

interface RiskTab {
  id: string;
  label: string;
  badge?: number;
  icon?: LucideIcon;
}

interface RiskTabsProps {
  tabs: RiskTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function RiskTabs({ tabs, activeTab, onChange, className }: RiskTabsProps) {
  return (
    <div className={cn('border-b border-slate-100', className)}>
      <nav className="flex gap-1" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                activeTab === tab.id
                  ? 'text-blue-700'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
              )}
              <span className="flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4" />}
                {tab.label}
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-5 text-xs rounded-full',
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
