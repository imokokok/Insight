'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { NavStructure, NavGroup } from './types';
import { oracleColors } from './config';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navStructure: NavStructure;
  currentPath: string;
}

export function MobileDrawer({ isOpen, onClose, navStructure, currentPath }: MobileDrawerProps) {
  const { t } = useI18n();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => item.href === currentPath);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer - Full width on mobile */}
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-sm bg-white  z-50 animate-slide-in-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold text-blue-600">Insight</div>
              <div className="text-lg font-semibold text-gray-900">{t('navbar.menu')}</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100  transition-colors"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-2">
            {navStructure.map((navItem) => {
              if ('items' in navItem) {
                const group = navItem as NavGroup;
                const isExpanded = expandedGroups.includes(group.id);
                const isActive = isGroupActive(group);
                const GroupIcon = group.icon;

                return (
                  <div key={group.id} className="mb-2">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 mx-2  transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {GroupIcon && <GroupIcon className="w-5 h-5" />}
                        <span className="font-medium">{t(group.label)}</span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="mt-1 ml-4 space-y-1 animate-fade-in">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isItemActive = currentPath === item.href;
                          const oracleKey = item.href.replace('/', '') as keyof typeof oracleColors;
                          const accentColor = oracleColors[oracleKey];

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={onClose}
                              className={`flex items-center gap-3 px-4 py-3 mx-2  transition-colors ${
                                isItemActive
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {ItemIcon && (
                                <div
                                  className={`p-1.5  ${
                                    isItemActive ? 'bg-blue-100' : 'bg-gray-100'
                                  }`}
                                  style={
                                    accentColor && !isItemActive
                                      ? { backgroundColor: `${accentColor}15` }
                                      : {}
                                  }
                                >
                                  <ItemIcon
                                    className="w-4 h-4"
                                    style={
                                      accentColor && !isItemActive ? { color: accentColor } : {}
                                    }
                                  />
                                </div>
                              )}
                              <span className="text-sm">{t(item.label)}</span>
                              {isItemActive && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 " />}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Single item (not a group)
              const item = navItem;
              const ItemIcon = item.icon;
              const isItemActive = currentPath === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 mx-2  transition-colors ${
                    isItemActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {ItemIcon && <ItemIcon className="w-5 h-5" />}
                  <span className="font-medium">{t(item.label)}</span>
                  {isItemActive && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 " />}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
