/**
 * Export history Hook
 *
 * Provides export history management functionality
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

  // Action functions
  addHistoryItem: (item: ExportHistoryItem) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
  updateSettings: (settings: Partial<ExportSettings>) => void;

  // Utility functions
  formatFileSize: (bytes: number) => string;
  getHistoryByDataSource: (dataSource: string) => ExportHistoryItem[];
  getRecentExports: (count: number) => ExportHistoryItem[];
}

/**
 * Export history Hook
 */
export function useExportHistory(): UseExportHistoryReturn {
  const [history, setHistory] = useState<ExportHistoryItem[]>([]);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Initial load
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

  // Add history record
  const addHistoryItem = useCallback(
    (item: ExportHistoryItem) => {
      setHistory((prev) => {
        const updated = [item, ...prev];
        // Apply settings limit
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

  // Delete history record
  const handleRemoveHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    removeExportHistoryItem(id);
  }, []);

  // Clear history records
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    clearExportHistory();
  }, []);

  // updatesettings
  const handleUpdateSettings = useCallback((newSettings: Partial<ExportSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveExportSettings(newSettings);
      return updated;
    });
  }, []);

  // bygethistoryrecord
  const getHistoryByDataSource = useCallback(
    (dataSource: string) => {
      return history.filter((h) => h.dataSource === dataSource);
    },
    [history]
  );

  // getexportrecord
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
