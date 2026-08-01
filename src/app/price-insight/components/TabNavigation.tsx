'use client';

import { BarChart3, Shield, Activity, Heart } from 'lucide-react';

import type { Dimension } from './DimensionSwitcher';

export type TabId = 'comparison' | 'risk' | 'divergence' | 'feedHealth';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  dimension: Dimension;
}

const TABS: Tab[] = [
  {
    id: 'comparison',
    label: 'Price Comparison',
    icon: BarChart3,
    description: 'Price comparison and consensus analysis',
  },
  {
    id: 'risk',
    label: 'Risk Analysis',
    icon: Shield,
    description: 'Multi-dimensional risk assessment',
  },
  {
    id: 'divergence',
    label: 'Divergence Signals',
    icon: Activity,
    description: 'Price divergence detection and tracking',
  },
  {
    id: 'feedHealth',
    label: 'Feed Health',
    icon: Heart,
    description: 'Data source health tracking',
  },
];

export function TabNavigation({
  activeTab,
  onTabChange,
  dimension: _dimension,
}: TabNavigationProps) {
  return (
    <div
      className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-100"
      role="tablist"
      aria-label="Analysis tabs"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={isActive}
            title={tab.description}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
