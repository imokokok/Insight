'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Settings,
  Pin,
  PinOff,
  GripVertical,
  RotateCcw,
  Check,
  X,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DashboardCustomizer');

export interface MetricItem {
  id: string;
  key: string;
  labelKey: string;
  labelZh: string;
  labelEn: string;
  icon: React.ReactNode;
  category: 'price' | 'network' | 'provider' | 'token';
  defaultVisible: boolean;
  defaultPinned: boolean;
}

export interface DashboardPreferences {
  pinnedMetrics: string[];
  hiddenMetrics: string[];
  metricOrder: string[];
  lastUpdated: string;
}

const STORAGE_KEY = 'redstone_dashboard_preferences';

const DEFAULT_METRICS: MetricItem[] = [
  {
    id: 'price',
    key: 'price',
    labelKey: 'redstone.stats.price',
    labelZh: '价格',
    labelEn: 'Price',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'price',
    defaultVisible: true,
    defaultPinned: true,
  },
  {
    id: 'marketCap',
    key: 'marketCap',
    labelKey: 'redstone.stats.marketCap',
    labelZh: '市值',
    labelEn: 'Market Cap',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'price',
    defaultVisible: true,
    defaultPinned: false,
  },
  {
    id: 'volume24h',
    key: 'volume24h',
    labelKey: 'redstone.stats.volume24h',
    labelZh: '24h交易量',
    labelEn: '24h Volume',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'price',
    defaultVisible: true,
    defaultPinned: false,
  },
  {
    id: 'activeNodes',
    key: 'activeNodes',
    labelKey: 'redstone.stats.activeNodes',
    labelZh: '活跃节点',
    labelEn: 'Active Nodes',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'network',
    defaultVisible: true,
    defaultPinned: true,
  },
  {
    id: 'dataFeeds',
    key: 'dataFeeds',
    labelKey: 'redstone.stats.dataFeeds',
    labelZh: '数据源',
    labelEn: 'Data Feeds',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'network',
    defaultVisible: true,
    defaultPinned: false,
  },
  {
    id: 'avgResponse',
    key: 'avgResponse',
    labelKey: 'redstone.stats.avgResponse',
    labelZh: '平均响应',
    labelEn: 'Avg Response',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'network',
    defaultVisible: true,
    defaultPinned: false,
  },
  {
    id: 'networkUptime',
    key: 'networkUptime',
    labelKey: 'redstone.stats.networkUptime',
    labelZh: '网络正常运行',
    labelEn: 'Network Uptime',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'network',
    defaultVisible: true,
    defaultPinned: false,
  },
  {
    id: 'circulatingSupply',
    key: 'circulatingSupply',
    labelKey: 'redstone.stats.circulatingSupply',
    labelZh: '流通供应量',
    labelEn: 'Circulating Supply',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'token',
    defaultVisible: true,
    defaultPinned: false,
  },
  {
    id: 'stakingApr',
    key: 'stakingApr',
    labelKey: 'redstone.stats.stakingApr',
    labelZh: '质押APR',
    labelEn: 'Staking APR',
    icon: <Sparkles className="w-4 h-4" />,
    category: 'token',
    defaultVisible: true,
    defaultPinned: false,
  },
];

const DEFAULT_PREFERENCES: DashboardPreferences = {
  pinnedMetrics: ['price', 'activeNodes'],
  hiddenMetrics: [],
  metricOrder: DEFAULT_METRICS.map((m) => m.id),
  lastUpdated: new Date().toISOString(),
};

interface DashboardCustomizerProps {
  onPreferencesChange?: (preferences: DashboardPreferences) => void;
  compact?: boolean;
}

export function DashboardCustomizer({
  onPreferencesChange,
  compact = false,
}: DashboardCustomizerProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as DashboardPreferences;
      } catch {
        return DEFAULT_PREFERENCES;
      }
    }
    return DEFAULT_PREFERENCES;
  });
  const [tempOrder, setTempOrder] = useState<string[]>(() => preferences.metricOrder);
  const [hasChanges, setHasChanges] = useState(false);

  const savePreferences = useCallback(
    (newPreferences: DashboardPreferences) => {
      const updated = {
        ...newPreferences,
        lastUpdated: new Date().toISOString(),
      };
      setPreferences(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      onPreferencesChange?.(updated);
    },
    [onPreferencesChange]
  );

  const togglePin = useCallback(
    (metricId: string) => {
      const isPinned = preferences.pinnedMetrics.includes(metricId);
      const newPinned = isPinned
        ? preferences.pinnedMetrics.filter((id) => id !== metricId)
        : [...preferences.pinnedMetrics, metricId];
      savePreferences({ ...preferences, pinnedMetrics: newPinned });
    },
    [preferences, savePreferences]
  );

  const toggleVisibility = useCallback(
    (metricId: string) => {
      const isHidden = preferences.hiddenMetrics.includes(metricId);
      const newHidden = isHidden
        ? preferences.hiddenMetrics.filter((id) => id !== metricId)
        : [...preferences.hiddenMetrics, metricId];
      savePreferences({ ...preferences, hiddenMetrics: newHidden });
    },
    [preferences, savePreferences]
  );

  const handleReorder = useCallback((newOrder: string[]) => {
    setTempOrder(newOrder);
    setHasChanges(true);
  }, []);

  const applyReorder = useCallback(() => {
    savePreferences({ ...preferences, metricOrder: tempOrder });
    setHasChanges(false);
  }, [preferences, tempOrder, savePreferences]);

  const resetToDefaults = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES);
    setTempOrder(DEFAULT_PREFERENCES.metricOrder);
    setHasChanges(false);
  }, [savePreferences]);

  const getMetricById = useCallback((id: string) => DEFAULT_METRICS.find((m) => m.id === id), []);

  const isPinned = useCallback(
    (id: string) => preferences.pinnedMetrics.includes(id),
    [preferences.pinnedMetrics]
  );

  const isHidden = useCallback(
    (id: string) => preferences.hiddenMetrics.includes(id),
    [preferences.hiddenMetrics]
  );

  const visibleMetrics = useMemo(
    () => tempOrder.filter((id) => !preferences.hiddenMetrics.includes(id)),
    [tempOrder, preferences.hiddenMetrics]
  );

  const hiddenMetrics = useMemo(
    () => tempOrder.filter((id) => preferences.hiddenMetrics.includes(id)),
    [tempOrder, preferences.hiddenMetrics]
  );

  const pinnedMetrics = useMemo(
    () => preferences.pinnedMetrics.filter((id) => !preferences.hiddenMetrics.includes(id)),
    [preferences.pinnedMetrics, preferences.hiddenMetrics]
  );

  if (compact) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title={t('redstone.dashboard.customize') || 'Customize Dashboard'}
      >
        <Settings className="w-4 h-4" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">{t('redstone.dashboard.customize') || '自定义'}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t('redstone.dashboard.title') || '仪表板设置'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {t('redstone.dashboard.pinnedMetrics') || '置顶指标'}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {t('redstone.dashboard.pinnedDesc') || '置顶的指标将显示在顶部'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pinnedMetrics.map((id) => {
                      const metric = getMetricById(id);
                      if (!metric) return null;
                      return (
                        <motion.div
                          key={id}
                          layout
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm"
                        >
                          <Pin className="w-3 h-3" />
                          <span>{metric.labelZh}</span>
                          <button onClick={() => togglePin(id)} className="ml-1 hover:text-red-900">
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      );
                    })}
                    {pinnedMetrics.length === 0 && (
                      <p className="text-sm text-gray-400">
                        {t('redstone.dashboard.noPinned') || '暂无置顶指标'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">
                      {t('redstone.dashboard.metricOrder') || '指标顺序'}
                    </h3>
                    {hasChanges && (
                      <Button size="sm" onClick={applyReorder} className="gap-1">
                        <Check className="w-3 h-3" />
                        {t('common.apply') || '应用'}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {t('redstone.dashboard.dragToReorder') || '拖拽调整顺序'}
                  </p>
                  <Reorder.Group
                    axis="y"
                    values={visibleMetrics}
                    onReorder={handleReorder}
                    className="space-y-2"
                  >
                    {visibleMetrics.map((id) => {
                      const metric = getMetricById(id);
                      if (!metric) return null;
                      return (
                        <Reorder.Item
                          key={id}
                          value={id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-move hover:bg-gray-100 transition-colors"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {metric.labelZh}
                            </div>
                            <div className="text-xs text-gray-500">{metric.labelEn}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => togglePin(id)}
                              className={`p-1.5 rounded transition-colors ${
                                isPinned(id)
                                  ? 'text-red-500 bg-red-50'
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                              }`}
                              title={isPinned(id) ? '取消置顶' : '置顶'}
                            >
                              {isPinned(id) ? (
                                <Pin className="w-4 h-4" />
                              ) : (
                                <PinOff className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => toggleVisibility(id)}
                              className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                              title="隐藏"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          </div>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                </div>

                {hiddenMetrics.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      {t('redstone.dashboard.hiddenMetrics') || '已隐藏指标'}
                    </h3>
                    <div className="space-y-2">
                      {hiddenMetrics.map((id) => {
                        const metric = getMetricById(id);
                        if (!metric) return null;
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg opacity-60"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                {metric.labelZh}
                              </div>
                            </div>
                            <button
                              onClick={() => toggleVisibility(id)}
                              className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                              title="显示"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={resetToDefaults} className="flex-1 gap-1">
                    <RotateCcw className="w-4 h-4" />
                    {t('common.reset') || '重置'}
                  </Button>
                  <Button onClick={() => setIsOpen(false)} className="flex-1">
                    {t('common.done') || '完成'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DashboardPreferences;
        setPreferences(parsed);
      } catch (error) {
        logger.error(
          'Failed to parse dashboard preferences',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }, []);

  const getOrderedMetrics = useCallback(
    (metrics: MetricItem[]) => {
      const orderMap = new Map(preferences.metricOrder.map((id, index) => [id, index]));
      return [...metrics].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Infinity;
        const orderB = orderMap.get(b.id) ?? Infinity;
        return orderA - orderB;
      });
    },
    [preferences.metricOrder]
  );

  const getPinnedMetrics = useCallback(
    (metrics: MetricItem[]) => {
      return metrics.filter((m) => preferences.pinnedMetrics.includes(m.id));
    },
    [preferences.pinnedMetrics]
  );

  const getVisibleMetrics = useCallback(
    (metrics: MetricItem[]) => {
      return metrics.filter((m) => !preferences.hiddenMetrics.includes(m.id));
    },
    [preferences.hiddenMetrics]
  );

  return {
    preferences,
    getOrderedMetrics,
    getPinnedMetrics,
    getVisibleMetrics,
    isPinned: (id: string) => preferences.pinnedMetrics.includes(id),
    isHidden: (id: string) => preferences.hiddenMetrics.includes(id),
  };
}

export { DEFAULT_METRICS, DEFAULT_PREFERENCES };
