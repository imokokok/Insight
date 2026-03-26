'use client';

import { useCallback, useEffect, useState } from 'react';

import { useUser, useProfile } from '@/stores/authStore';

export interface UserPreferences {
  defaultOracle: string;
  defaultSymbol: string;
  defaultTimeRange: string;
  language: string;
  defaultCurrency: string;
  autoRefreshInterval: number;
}

const STORAGE_KEY = 'user_preferences';

const defaultPreferences: UserPreferences = {
  defaultOracle: 'chainlink',
  defaultSymbol: 'BTC/USD',
  defaultTimeRange: '24h',
  language: 'zh-CN',
  defaultCurrency: 'USD',
  autoRefreshInterval: 30,
};

interface DbUserPreferences {
  default_oracle?: string;
  default_symbol?: string;
  default_time_range?: string;
  language?: string;
  default_currency?: string;
  auto_refresh_interval?: number;
  theme?: string;
  chart_settings?: {
    show_confidence_interval?: boolean;
    auto_refresh?: boolean;
    refresh_interval?: number;
  };
}

export function usePreferences() {
  const user = useUser();
  const profile = useProfile();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  const loadPreferences = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let localPrefs: Partial<UserPreferences> = {};
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        localPrefs = {
          defaultOracle: parsed.defaultOracle,
          defaultSymbol: parsed.defaultSymbol,
          defaultTimeRange: parsed.defaultTimeRange,
          language: parsed.language,
          defaultCurrency: parsed.defaultCurrency,
          autoRefreshInterval: parsed.autoRefreshInterval
            ? parseInt(parsed.autoRefreshInterval, 10)
            : undefined,
        };
      } catch {
        localPrefs = {};
      }
    }

    if (user && profile?.preferences) {
      const dbPrefs = profile.preferences as DbUserPreferences;
      const merged: UserPreferences = {
        defaultOracle:
          dbPrefs.default_oracle || localPrefs.defaultOracle || defaultPreferences.defaultOracle,
        defaultSymbol:
          dbPrefs.default_symbol || localPrefs.defaultSymbol || defaultPreferences.defaultSymbol,
        defaultTimeRange:
          dbPrefs.default_time_range ||
          localPrefs.defaultTimeRange ||
          defaultPreferences.defaultTimeRange,
        language: dbPrefs.language || localPrefs.language || defaultPreferences.language,
        defaultCurrency:
          dbPrefs.default_currency ||
          localPrefs.defaultCurrency ||
          defaultPreferences.defaultCurrency,
        autoRefreshInterval:
          dbPrefs.auto_refresh_interval !== undefined
            ? dbPrefs.auto_refresh_interval
            : localPrefs.autoRefreshInterval || defaultPreferences.autoRefreshInterval,
      };
      setPreferences(merged);
    } else {
      setPreferences({ ...defaultPreferences, ...localPrefs });
    }
    setIsLoading(false);
  }, [user, profile]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePreferencesToLocal = useCallback((prefs: UserPreferences) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        defaultOracle: prefs.defaultOracle,
        defaultSymbol: prefs.defaultSymbol,
        defaultTimeRange: prefs.defaultTimeRange,
        language: prefs.language,
        defaultCurrency: prefs.defaultCurrency,
        autoRefreshInterval: String(prefs.autoRefreshInterval),
      })
    );
    setPreferences(prefs);
  }, []);

  return {
    preferences,
    isLoading,
    refreshPreferences: loadPreferences,
    savePreferencesToLocal,
    defaultPreferences,
  };
}

export function useDefaultOracle() {
  const { preferences, isLoading } = usePreferences();
  return { defaultOracle: preferences.defaultOracle, isLoading };
}

export function useDefaultSymbol() {
  const { preferences, isLoading } = usePreferences();
  return { defaultSymbol: preferences.defaultSymbol, isLoading };
}

export function useDefaultTimeRange() {
  const { preferences, isLoading } = usePreferences();
  return { defaultTimeRange: preferences.defaultTimeRange, isLoading };
}

export function useDefaultCurrency() {
  const { preferences, isLoading } = usePreferences();
  return { defaultCurrency: preferences.defaultCurrency, isLoading };
}

export function useAutoRefreshInterval() {
  const { preferences, isLoading } = usePreferences();
  return {
    autoRefreshInterval: preferences.autoRefreshInterval,
    isLoading,
    refreshIntervalMs: preferences.autoRefreshInterval * 1000,
  };
}
