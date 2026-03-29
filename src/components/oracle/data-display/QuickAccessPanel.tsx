'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  Clock,
  Heart,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  TrendingUp,
  Database,
  Server,
  Globe,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useFavorites } from '@/hooks/useFavorites';
import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('QuickAccessPanel');

interface RecentItem {
  id: string;
  type: 'dapi' | 'airnode' | 'chain';
  name: string;
  timestamp: Date;
  path?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string | number;
}

const STORAGE_KEY_RECENT = 'api3_recent_items';
const MAX_RECENT_ITEMS = 10;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  dapi: <Database className="w-4 h-4" />,
  airnode: <Server className="w-4 h-4" />,
  chain: <Globe className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  dapi: 'text-blue-600 bg-blue-50',
  airnode: 'text-purple-600 bg-purple-50',
  chain: 'text-green-600 bg-green-50',
};

interface QuickAccessPanelProps {
  onNavigate?: (path: string) => void;
  quickActions?: QuickAction[];
  defaultCollapsed?: boolean;
}

export function QuickAccessPanel({
  onNavigate,
  quickActions,
  defaultCollapsed = false,
}: QuickAccessPanelProps) {
  const t = useTranslations();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'recent' | 'favorites'>('recent');

  const { favorites } = useFavorites();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY_RECENT);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentItems(
          parsed.map((item: RecentItem) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }))
        );
      } catch (error) {
        logger.error(
          'Failed to parse recent items',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }, []);

  const addRecentItem = useCallback((item: Omit<RecentItem, 'id' | 'timestamp'>) => {
    const newItem: RecentItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    setRecentItems((prev) => {
      const filtered = prev.filter((i) => !(i.name === item.name && i.type === item.type));
      const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
      localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentItems = useCallback(() => {
    setRecentItems([]);
    localStorage.removeItem(STORAGE_KEY_RECENT);
  }, []);

  const handleItemClick = useCallback(
    (item: RecentItem) => {
      if (item.path && onNavigate) {
        onNavigate(item.path);
      }
    },
    [onNavigate]
  );

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('api3.quickAccess.justNow') || 'Just now';
    if (diffMins < 60)
      return t('api3.quickAccess.minutesAgo', { count: diffMins }) || `${diffMins}m ago`;
    if (diffHours < 24)
      return t('api3.quickAccess.hoursAgo', { count: diffHours }) || `${diffHours}h ago`;
    return t('api3.quickAccess.daysAgo', { count: diffDays }) || `${diffDays}d ago`;
  };

  const defaultQuickActions: QuickAction[] = [
    {
      id: 'market',
      label: t('api3.quickAccess.marketData') || 'Market Data',
      icon: <TrendingUp className="w-4 h-4" />,
      onClick: () => onNavigate?.('/api3?tab=market'),
    },
    {
      id: 'dapi',
      label: t('api3.quickAccess.dapi') || 'dAPI',
      icon: <Database className="w-4 h-4" />,
      onClick: () => onNavigate?.('/api3?tab=dapi'),
    },
    {
      id: 'airnode',
      label: t('api3.quickAccess.airnode') || 'Airnode',
      icon: <Server className="w-4 h-4" />,
      onClick: () => onNavigate?.('/api3?tab=airnode'),
    },
  ];

  const actions = quickActions || defaultQuickActions;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t('api3.quickAccess.title') || 'Quick Access'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <Badge variant="secondary" size="sm">
              {activeTab === 'recent' ? recentItems.length : favorites.length}
            </Badge>
          )}
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="border-t border-gray-200">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'recent'
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              {t('api3.quickAccess.recent') || 'Recent'}
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'favorites'
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Heart className="w-4 h-4" />
              {t('api3.quickAccess.favorites') || 'Favorites'}
            </button>
          </div>

          <div className="p-3">
            <div className="flex flex-wrap gap-2 mb-3">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  variant="secondary"
                  size="sm"
                  onClick={action.onClick}
                  className="gap-1.5"
                >
                  {action.icon}
                  {action.label}
                  {action.badge && (
                    <Badge variant="primary" size="sm">
                      {action.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {activeTab === 'recent' && (
              <div className="space-y-1">
                {recentItems.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-500">
                    {t('api3.quickAccess.noRecent') || 'No recent items'}
                  </div>
                ) : (
                  <>
                    {recentItems.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className={`p-1.5 rounded ${TYPE_COLORS[item.type]}`}>
                          {TYPE_ICONS[item.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTimeAgo(item.timestamp)}
                          </div>
                        </div>
                        {item.path && (
                          <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                    {recentItems.length > 5 && (
                      <button
                        onClick={clearRecentItems}
                        className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-2"
                      >
                        {t('api3.quickAccess.clearRecent') || 'Clear recent items'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="space-y-1">
                {favorites.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-500">
                    {t('api3.quickAccess.noFavorites') || 'No favorites yet'}
                  </div>
                ) : (
                  favorites.slice(0, 5).map((favorite) => (
                    <button
                      key={favorite.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded bg-red-50 text-red-500">
                        <Heart className="w-4 h-4 fill-current" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {favorite.name}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {favorite.config_type}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function addRecentItem(item: Omit<RecentItem, 'id' | 'timestamp'>) {
  const newItem: RecentItem = {
    ...item,
    id: Date.now().toString(),
    timestamp: new Date(),
  };

  const stored = localStorage.getItem(STORAGE_KEY_RECENT);
  let recentItems: RecentItem[] = [];
  if (stored) {
    try {
      recentItems = JSON.parse(stored);
    } catch {
      recentItems = [];
    }
  }

  const filtered = recentItems.filter((i) => !(i.name === item.name && i.type === item.type));
  const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
  localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
}
