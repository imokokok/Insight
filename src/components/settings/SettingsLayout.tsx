'use client';

import { ReactNode } from 'react';
import { Settings, User, Bell, Palette, Database } from 'lucide-react';

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

const tabs: TabItem[] = [
  {
    id: 'profile',
    label: '个人资料',
    icon: User,
    description: '管理您的账户信息',
  },
  {
    id: 'preferences',
    label: '偏好设置',
    icon: Palette,
    description: '自定义应用设置',
  },
  {
    id: 'notifications',
    label: '通知设置',
    icon: Bell,
    description: '管理通知偏好',
  },
  {
    id: 'data',
    label: '数据管理',
    icon: Database,
    description: '导出和管理数据',
  },
];

export function SettingsLayout({ children, activeTab, onTabChange }: SettingsLayoutProps) {
  return (
    <div className="min-h-screen bg-dune">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">设置</h1>
              <p className="text-sm text-gray-500 mt-0.5">管理您的账户和应用偏好</p>
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
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 relative ${
                      index !== 0 ? 'border-t border-gray-100' : ''
                    } ${
                      isActive
                        ? 'bg-blue-50/80 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600" />
                    )}
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{tab.label}</div>
                      <div
                        className={`text-xs truncate ${
                          isActive ? 'text-blue-500' : 'text-gray-400'
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
