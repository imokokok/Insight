'use client';

/**
 * @fileoverview Tab 内容切换组件
 * @description 为查询结果区域提供 Tab 切换功能，包含价格对比、数据质量、风险预警三个 Tab
 */

import { memo } from 'react';
import { TrendingUp, Shield, AlertTriangle } from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

export type TabType = 'priceComparison' | 'dataQuality' | 'riskAlert';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: 'red' | 'orange' | 'yellow' | 'green';
}

interface TabContentSwitcherProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  riskAlertCount?: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取 Tab 配置
 */
function getTabsConfig(
  t: (key: string, params?: Record<string, string | number>) => string,
  riskAlertCount: number
): TabConfig[] {
  return [
    {
      id: 'priceComparison',
      label: t('crossOracle.tabs.priceComparison') || '价格对比',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'dataQuality',
      label: t('crossOracle.tabs.dataQuality') || '数据质量',
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: 'riskAlert',
      label: t('crossOracle.tabs.riskAlert') || '风险预警',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: riskAlertCount > 0 ? riskAlertCount : undefined,
      badgeColor: riskAlertCount > 0 ? 'red' : undefined,
    },
  ];
}

/**
 * 获取 badge 颜色类
 */
function getBadgeColorClass(color?: 'red' | 'orange' | 'yellow' | 'green'): string {
  switch (color) {
    case 'red':
      return 'bg-red-500 text-white';
    case 'orange':
      return 'bg-orange-500 text-white';
    case 'yellow':
      return 'bg-yellow-500 text-white';
    case 'green':
      return 'bg-emerald-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

// ============================================================================
// Tab 按钮组件
// ============================================================================

interface TabButtonProps {
  config: TabConfig;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ config, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 px-4 py-3 text-sm font-medium
        transition-all duration-200 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        ${
          isActive
            ? 'text-blue-600 bg-blue-50/80 border-b-2 border-blue-600'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-b-2 border-transparent'
        }
      `}
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${config.id}`}
      id={`tab-${config.id}`}
    >
      <span className={isActive ? 'text-blue-600' : 'text-gray-500'}>{config.icon}</span>
      <span>{config.label}</span>
      {config.badge !== undefined && config.badge > 0 && (
        <span
          className={`
            ml-1 inline-flex items-center justify-center
            min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold
            ${getBadgeColorClass(config.badgeColor)}
          `}
        >
          {config.badge > 99 ? '99+' : config.badge}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function TabContentSwitcherComponent({
  activeTab,
  onTabChange,
  riskAlertCount = 0,
  t,
}: TabContentSwitcherProps) {
  const tabsConfig = getTabsConfig(t, riskAlertCount);

  return (
    <div className="border-b border-gray-200 bg-gray-50/50">
      <nav
        className="flex items-center px-2"
        role="tablist"
        aria-label="查询结果功能切换"
      >
        {tabsConfig.map((tab) => (
          <TabButton
            key={tab.id}
            config={tab}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </nav>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const TabContentSwitcher = memo(TabContentSwitcherComponent);
TabContentSwitcher.displayName = 'TabContentSwitcher';

export default TabContentSwitcher;
