'use client';

import { useState } from 'react';

import {
  TrendingUp,
  Activity,
  Users,
  Scale,
  Wallet,
  Globe,
  Shield,
  Gavel,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorSidebarProps } from '../types';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
}

const menuItems: MenuItem[] = [
  { id: 'market', label: 'marketData', icon: TrendingUp, description: 'Price feeds and market data' },
  { id: 'network', label: 'networkHealth', icon: Activity, description: 'Network status and metrics' },
  { id: 'reporters', label: 'reporters', icon: Users, description: 'Reporter statistics and rankings' },
  { id: 'disputes', label: 'disputes', icon: Scale, description: 'Dispute resolution and history' },
  { id: 'staking', label: 'staking', icon: Wallet, description: 'Staking tiers and rewards' },
  { id: 'ecosystem', label: 'ecosystem', icon: Globe, description: 'Protocol integrations and TVL' },
  { id: 'risk', label: 'riskAssessment', icon: Shield, description: 'Risk analysis and metrics' },
  { id: 'governance', label: 'governance', icon: Gavel, description: 'Proposals and voting' },
];

export function TellorSidebar({ activeTab, onTabChange }: TellorSidebarProps) {
  const t = useTranslations('tellor');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId as typeof activeTab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {isMobileOpen ? (
          <X className="w-5 h-5 text-gray-600" />
        ) : (
          <Menu className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen
          bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900">{t('menu.title')}</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-65px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200 group
                  ${isActive
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                title={isCollapsed ? t(`menu.${item.label}`) : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-cyan-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium">{t(`menu.${item.label}`)}</span>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                    )}
                  </div>
                )}
                {!isCollapsed && isActive && (
                  <ChevronRight className="w-4 h-4 text-cyan-600" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
