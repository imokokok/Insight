'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { X, ChevronDown, Gauge } from 'lucide-react';

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
      <div className="fixed inset-0 z-40 bg-black/30 animate-fade-in" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full border-l border-slate-900/15 bg-[#f8f7f4] sm:max-w-md animate-slide-in-right">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-slate-900/15 px-5 py-5">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/insight-glacier-cut.svg"
                alt="Insight Logo"
                width={24}
                height={30}
                priority
              />
              <div>
                <div className="text-lg font-bold text-slate-950">Insight</div>
                <span className="sr-only">Menu</span>
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-blue-700">
                  Navigation index
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="border border-transparent p-2 text-gray-500 transition-colors hover:border-slate-300 hover:bg-white hover:text-gray-900"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            {navStructure.map((navItem) => {
              if ('items' in navItem) {
                const group = navItem as NavGroup;
                const isExpanded = expandedGroups.includes(group.id);
                const isActive = isGroupActive(group);
                const GroupIcon = group.icon;

                return (
                  <div key={group.id} className="border-b border-slate-900/10">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className={`flex w-full items-center justify-between border-l-2 px-3 py-3 transition-colors ${
                        isActive
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-transparent text-gray-700 hover:bg-white/70'
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
                      <div className="ml-4 border-l border-slate-900/10 animate-fade-in">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isItemActive =
                            currentPath === item.href || currentPath.startsWith(item.href + '/');
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={onClose}
                              className={`flex items-start gap-3 border-b border-slate-900/10 px-4 py-3 transition-colors ${
                                isItemActive
                                  ? 'bg-primary-50 text-primary-700'
                                  : 'text-gray-600 hover:bg-white/70'
                              }`}
                            >
                              {ItemIcon && (
                                <div className="flex-shrink-0 border border-blue-200 bg-blue-50 p-1.5 text-blue-700">
                                  <ItemIcon className="w-4 h-4" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{item.label}</span>
                                  {item.badge && (
                                    <span className="inline-flex items-center border-l-2 border-emerald-500 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-emerald-700">
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
                                <div className="ml-auto mt-2 h-1.5 w-1.5 flex-shrink-0 bg-primary-600" />
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
                  className={`flex items-center gap-3 border-b border-l-2 border-slate-900/10 px-3 py-3 transition-colors ${
                    isItemActive
                      ? 'border-l-primary-600 bg-primary-50 text-primary-700'
                      : 'border-l-transparent text-gray-700 hover:bg-white/70'
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
                className="flex items-center gap-3 border-b border-slate-900/10 px-3 py-3 text-gray-700 transition-colors hover:bg-white/70"
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
