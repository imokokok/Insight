'use client';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

export interface UnifiedSidebarProps {
  items: SidebarItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  themeColor?: string;
  translationNamespace?: string;
}

export function UnifiedSidebar({
  items,
  activeTab,
  onTabChange,
  themeColor = '#3b82f6',
  translationNamespace,
}: UnifiedSidebarProps) {
  const t = useTranslations();

  return (
    <aside className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <nav className="py-2" aria-label="主导航">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const label = translationNamespace
            ? t(`${translationNamespace}.${item.labelKey}`)
            : t(item.labelKey);
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'border-l-4'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
              )}
              style={{
                backgroundColor: isActive ? `${themeColor}15` : undefined,
                color: isActive ? themeColor : undefined,
                borderLeftColor: isActive ? themeColor : undefined,
              }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span style={{ color: isActive ? themeColor : '#9ca3af' }}>{item.icon}</span>
              <span>{label}</span>
            </button>
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
