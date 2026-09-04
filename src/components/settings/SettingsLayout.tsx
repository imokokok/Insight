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
    <div className="editorial-workspace min-h-screen">
      <SettingsHero />

      <div className="editorial-frame mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          <nav className="flex-shrink-0 lg:w-72" aria-label="Settings">
            <p className="editorial-index mb-4 border-b border-slate-900/15 pb-3">
              01 — Select workspace
            </p>
            <div className="border-y border-slate-900/15 bg-white/35">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex w-full items-center gap-3 border-b border-slate-900/10 px-3 py-3 text-left transition-colors last:border-b-0 ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'text-slate-600 hover:bg-blue-50/60 hover:text-slate-900'
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

          <main className="min-w-0 flex-1" role="main">
            <p className="editorial-index mb-4 border-b border-slate-900/15 pb-3">
              02 — Manage account state
            </p>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
