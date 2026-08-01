'use client';

import { memo } from 'react';

import { BarChart3, ScatterChart } from 'lucide-react';

export type ChartTabType = 'distribution' | 'scatter';

interface ChartTab {
  id: ChartTabType;
  label: string;
  icon: React.ReactNode;
}

interface ChartTabSwitcherProps {
  activeTab: ChartTabType;
  onTabChange: (tab: ChartTabType) => void;
}

function ChartTabSwitcherComponent({ activeTab, onTabChange }: ChartTabSwitcherProps) {
  const tabs: ChartTab[] = [
    {
      id: 'distribution',
      label: 'Distribution',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'scatter',
      label: 'Scatter',
      icon: <ScatterChart className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md
            transition-all duration-200
            ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }
          `}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export const ChartTabSwitcher = memo(ChartTabSwitcherComponent);
ChartTabSwitcher.displayName = 'ChartTabSwitcher';
