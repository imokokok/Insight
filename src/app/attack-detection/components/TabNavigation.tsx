'use client';

import { BarChart3, Shield } from 'lucide-react';

export type TabId = 'deviation' | 'signature';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: Tab[] = [
  {
    id: 'deviation',
    label: 'Deviation Analysis',
    icon: BarChart3,
    description: 'Spot/TWAP deviation trends and oracle comparison',
  },
  {
    id: 'signature',
    label: 'Attack Signature',
    icon: Shield,
    description: '8-dimension attack signature radar and scoring',
  },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-6 pt-4">
        <div className="flex items-center gap-1">
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
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
