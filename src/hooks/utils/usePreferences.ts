'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';

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

function getLocalPreferences(): Partial<UserPreferences> {
  if (typeof window === 'undefined') return {};
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    return {
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
    return {};
  }
}

export function usePreferences() {
  const user = useUser();
  const profile = useProfile();
  const [isLoading, setIsLoading] = useState(true);

  const preferences = useMemo(() => {
    const localPrefs = getLocalPreferences();

    if (user && profile?.preferences) {
      const dbPrefs = profile.preferences as DbUserPreferences;
      return {
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
    }
    return { ...defaultPreferences, ...localPrefs };
  }, [user, profile]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

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
  }, []);

  return {
    preferences,
    isLoading,
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
