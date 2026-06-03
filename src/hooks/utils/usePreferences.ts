'use client';

import { useMemo } from 'react';

import { useUser, useProfile } from '@/stores/authStore';

interface UserPreferences {
  defaultOracle: string;
  defaultSymbol: string;
  defaultTimeRange: string;
  defaultCurrency: string;
  autoRefreshInterval: string;
}

const STORAGE_KEY = 'user_preferences';

const defaultPreferences: UserPreferences = {
  defaultOracle: 'chainlink',
  defaultSymbol: 'BTC/USD',
  defaultTimeRange: '24h',
  defaultCurrency: 'USD',
  autoRefreshInterval: '30',
};

interface DbUserPreferences {
  default_oracle?: string;
  default_symbol?: string;
  default_time_range?: string;
  default_currency?: string;
  auto_refresh_interval?: number;
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
      defaultCurrency: parsed.defaultCurrency,
      autoRefreshInterval:
        parsed.autoRefreshInterval !== undefined && parsed.autoRefreshInterval !== null
          ? String(parsed.autoRefreshInterval)
          : undefined,
    };
  } catch {
    return {};
  }
}

export function usePreferences() {
  const user = useUser();
  const profile = useProfile();

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
        defaultCurrency:
          dbPrefs.default_currency ||
          localPrefs.defaultCurrency ||
          defaultPreferences.defaultCurrency,
        autoRefreshInterval:
          dbPrefs.auto_refresh_interval !== undefined
            ? String(dbPrefs.auto_refresh_interval)
            : (localPrefs.autoRefreshInterval ?? defaultPreferences.autoRefreshInterval),
      };
    }
    return { ...defaultPreferences, ...localPrefs };
  }, [user, profile]);

  return {
    preferences,
  };
}
