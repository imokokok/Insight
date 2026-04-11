'use client';

import { type ReactNode } from 'react';

import { Settings, User, Bell, Database, Palette } from 'lucide-react';

import { useTranslations } from '@/i18n';

export type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'data';

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
  const t = useTranslations();

  const tabs: TabItem[] = [
    {
      id: 'profile',
      label: t('settings.profile'),
      icon: User,
      description: t('settings.profileDesc'),
    },
    {
      id: 'preferences',
      label: t('settings.preferences'),
      icon: Palette,
      description: t('settings.preferencesDesc'),
    },
    {
      id: 'notifications',
      label: t('settings.notifications'),
      icon: Bell,
      description: t('settings.notificationsDesc'),
    },
    {
      id: 'data',
      label: t('settings.data'),
      icon: Database,
      description: t('settings.dataDesc'),
    },
  ];

  return (
    <div className="min-h-screen bg-insight">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{t('settings.title')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('settings.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <nav className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 relative rounded-lg ${
                      index !== 0 ? 'border-t border-gray-100' : ''
                    } ${
                      isActive
                        ? 'bg-primary-50/80 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-600" />
                    )}
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-primary-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{tab.label}</div>
                      <div
                        className={`text-xs truncate ${
                          isActive ? 'text-primary-500' : 'text-gray-400'
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

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
