'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

export interface SidebarGroup {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  items: SidebarItem[];
}

export interface GroupedSidebarProps {
  groups: SidebarGroup[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  themeColor?: string;
  translationNamespace?: string;
}

function GroupHeader({
  group,
  isExpanded,
  onToggle,
  themeColor,
  t,
  translationNamespace,
}: {
  group: SidebarGroup;
  isExpanded: boolean;
  onToggle: () => void;
  themeColor: string;
  t: (key: string) => string;
  translationNamespace?: string;
}) {
  const label = translationNamespace
    ? t(`${translationNamespace}.${group.labelKey}`)
    : t(group.labelKey);

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors duration-200"
    >
      <div className="flex items-center gap-2">
        <span style={{ color: themeColor }}>{group.icon}</span>
        <span>{label}</span>
      </div>
      <div
        className="transition-transform duration-200"
        style={{ color: themeColor }}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </div>
    </button>
  );
}

function GroupItem({
  item,
  isActive,
  onClick,
  themeColor,
  t,
  translationNamespace,
}: {
  item: SidebarItem;
  isActive: boolean;
  onClick: () => void;
  themeColor: string;
  t: (key: string) => string;
  translationNamespace?: string;
}) {
  const label = translationNamespace
    ? t(`${translationNamespace}.${item.labelKey}`)
    : t(item.labelKey);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 pl-10',
        isActive
          ? 'border-l-4'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
      )}
      style={{
        backgroundColor: isActive ? `${themeColor}10` : undefined,
        color: isActive ? themeColor : undefined,
        borderLeftColor: isActive ? themeColor : undefined,
      }}
    >
      <span style={{ color: isActive ? themeColor : '#9ca3af' }}>{item.icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function GroupedSidebar({
  groups,
  activeTab,
  onTabChange,
  themeColor = '#3b82f6',
  translationNamespace,
}: GroupedSidebarProps) {
  const t = useTranslations();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    groups.forEach((group) => {
      const hasActiveItem = group.items.some((item) => item.id === activeTab);
      if (hasActiveItem) {
        setExpandedGroups((prev) => new Set([...prev, group.id]));
      }
    });
  }, [activeTab, groups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <aside className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <nav className="py-2">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const hasActiveItem = group.items.some((item) => item.id === activeTab);

          return (
            <div key={group.id} className="mb-1">
              <GroupHeader
                group={group}
                isExpanded={isExpanded}
                onToggle={() => toggleGroup(group.id)}
                themeColor={themeColor}
                t={t}
                translationNamespace={translationNamespace}
              />
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <GroupItem
                      key={item.id}
                      item={item}
                      isActive={isActive}
                      onClick={() => onTabChange(item.id)}
                      themeColor={themeColor}
                      t={t}
                      translationNamespace={translationNamespace}
                    />
                  );
                })}
              </div>
              {hasActiveItem && !isExpanded && (
                <div
                  className="h-1 mx-4 rounded-full"
                  style={{ backgroundColor: `${themeColor}30` }}
                />
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export interface MobileMenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
  themeColor?: string;
  label?: string;
}

export function MobileMenuButton({
  isOpen,
  onClick,
  themeColor = '#3b82f6',
  label = '菜单',
}: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm"
      style={{
        borderColor: themeColor,
        color: themeColor,
      }}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        {isOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
      <span>{label}</span>
    </button>
  );
}
