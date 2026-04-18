/**
 * 导出历史记录 Hook
 *
 * 提供导出历史记录的管理功能
 */

import { useState, useEffect, useCallback } from 'react';

import { createLogger } from '@/lib/utils/logger';

import {
  loadExportHistory,
  clearExportHistory,
  removeExportHistoryItem,
  loadExportSettings,
  saveExportSettings,
  formatFileSize,
} from './exportUtils';
import { type ExportHistoryItem, type ExportSettings, DEFAULT_EXPORT_SETTINGS } from './types';

const logger = createLogger('useExportHistory');

interface UseExportHistoryReturn {
  history: ExportHistoryItem[];
  settings: ExportSettings;
  isLoading: boolean;

  // 操作函数
  addHistoryItem: (item: ExportHistoryItem) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
  updateSettings: (settings: Partial<ExportSettings>) => void;

  // 工具函数
  formatFileSize: (bytes: number) => string;
  getHistoryByDataSource: (dataSource: string) => ExportHistoryItem[];
  getRecentExports: (count: number) => ExportHistoryItem[];
}

/**
 * 导出历史记录 Hook
 */
export function useExportHistory(): UseExportHistoryReturn {
  const [history, setHistory] = useState<ExportHistoryItem[]>([]);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化加载
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const loadedHistory = loadExportHistory();
      const loadedSettings = loadExportSettings();
      setHistory(loadedHistory);
      setSettings(loadedSettings);
    } catch (error) {
      logger.error('Failed to initialize export history', error as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 添加历史记录
  const addHistoryItem = useCallback(
    (item: ExportHistoryItem) => {
      setHistory((prev) => {
        const updated = [item, ...prev];
        // 应用设置限制
        const maxItems = settings.maxHistoryItems;
        let filtered = updated.slice(0, maxItems);

        if (settings.autoCleanup) {
          const cutoffTime = Date.now() - settings.cleanupAfterDays * 24 * 60 * 60 * 1000;
          filtered = filtered.filter((h) => h.createdAt > cutoffTime);
        }

        return filtered;
      });
    },
    [settings]
  );

  // 删除历史记录
  const handleRemoveHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    removeExportHistoryItem(id);
  }, []);

  // 清空历史记录
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    clearExportHistory();
  }, []);

  // 更新设置
  const handleUpdateSettings = useCallback((newSettings: Partial<ExportSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveExportSettings(newSettings);
      return updated;
    });
  }, []);

  // 按数据源获取历史记录
  const getHistoryByDataSource = useCallback(
    (dataSource: string) => {
      return history.filter((h) => h.dataSource === dataSource);
    },
    [history]
  );

  // 获取最近的导出记录
  const getRecentExports = useCallback(
    (count: number) => {
      return history.slice(0, count);
    },
    [history]
  );

  return {
    history,
    settings,
    isLoading,
    addHistoryItem,
    removeHistoryItem: handleRemoveHistoryItem,
    clearHistory: handleClearHistory,
    updateSettings: handleUpdateSettings,
    formatFileSize,
    getHistoryByDataSource,
    getRecentExports,
  };
}
