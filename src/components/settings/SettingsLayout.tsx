'use client';

import { type ReactNode } from 'react';

import { User, Database, Palette, Key, CreditCard } from 'lucide-react';

import { SettingsHero } from './SettingsHero';

export type SettingsTab = 'profile' | 'preferences' | 'data' | 'api-keys' | 'billing';

interface SettingsLayoutProps {
  children: ReactNode;
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export function SettingsLayout({ children, activeTab, onTabChange }: SettingsLayoutProps) {
  const tabs: TabItem[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Manage your account profile',
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: Palette,
      description: 'Customize your preferences',
    },
    {
      id: 'data',
      label: 'Data',
      icon: Database,
      description: 'Manage your data',
    },
    {
      id: 'api-keys',
      label: 'API Keys',
      icon: Key,
      description: 'Manage API access',
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: CreditCard,
      description: 'Manage your subscription',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <SettingsHero />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <nav className="lg:w-72 flex-shrink-0" aria-label="Settings">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-all duration-200 rounded-xl mb-1 last:mb-0 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/10'
                        : 'text-slate-600 hover:bg-blue-50/50 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{tab.label}</div>
                      <div
                        className={`text-xs truncate ${
                          isActive ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="flex-1 min-w-0" role="main">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
