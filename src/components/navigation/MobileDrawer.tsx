'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { X, ChevronDown, Gauge } from 'lucide-react';

import { oracleColors } from './config';
import { type NavStructure, type NavGroup } from './types';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navStructure: NavStructure;
  currentPath: string;
  isOpsOwner?: boolean;
}

export function MobileDrawer({
  isOpen,
  onClose,
  navStructure,
  currentPath,
  isOpsOwner = false,
}: MobileDrawerProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(
      (item) => currentPath === item.href || currentPath.startsWith(item.href + '/')
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full sm:max-w-sm bg-white rounded-l-lg z-50 animate-slide-in-right">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Image src="/logos/owl-logo.svg" alt="Insight Logo" width={32} height={28} priority />
              <div className="text-xl font-bold text-primary-600">Insight</div>
              <div className="text-lg font-semibold text-gray-900">Menu</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
                      className={`w-full flex items-center justify-between px-4 py-3 mx-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {GroupIcon && <GroupIcon className="w-5 h-5" />}
                        <span className="font-medium">{group.label}</span>
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
                          const isItemActive =
                            currentPath === item.href || currentPath.startsWith(item.href + '/');
                          const oracleKey = item.href.replace('/', '') as keyof typeof oracleColors;
                          const accentColor = oracleColors[oracleKey];

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={onClose}
                              className={`flex items-start gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                                isItemActive
                                  ? 'bg-primary-50 text-primary-600'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {ItemIcon && (
                                <div
                                  className={`p-1.5 rounded-md flex-shrink-0 ${
                                    isItemActive ? 'bg-primary-100' : 'bg-gray-100'
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
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{item.label}</span>
                                  {item.badge && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 leading-none">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <span className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                                    {item.description}
                                  </span>
                                )}
                              </div>
                              {isItemActive && (
                                <div className="ml-auto w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 flex-shrink-0" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const item = navItem;
              const ItemIcon = item.icon;
              const isItemActive =
                currentPath === item.href || currentPath.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                    isItemActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {ItemIcon && <ItemIcon className="w-5 h-5" />}
                  <span className="font-medium">{item.label}</span>
                  {isItemActive && <div className="ml-auto w-1.5 h-1.5 bg-primary-600 " />}
                </Link>
              );
            })}
            {isOpsOwner && (
              <Link
                href="/ops"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <Gauge className="w-5 h-5" />
                <span className="font-medium">Console</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
