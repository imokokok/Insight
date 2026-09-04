'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

import { Clock, Database, Save, Loader2, CheckCircle, RefreshCw, DollarSign } from 'lucide-react';

import { DropdownSelect, SegmentedControl } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useDynamicSymbols } from '@/hooks/data/useDynamicSymbols';
import { useProfileUpdate } from '@/hooks/useProfileUpdate';
import {
  type UserPreferences,
  type DbUserPreferences,
  STORAGE_KEY,
  defaultPreferences,
} from '@/hooks/utils/usePreferences';
import { getPriceOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { providerNames } from '@/lib/constants';
import { getAllSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { createLogger } from '@/lib/utils/logger';
import { useUser, useProfile, useAuthInitialized } from '@/stores/authStore';

const logger = createLogger('PreferencesPanel');

// Generate trading pair options from unified symbol list
const allSymbols = getAllSupportedSymbols();

const timeRangeOptions = [
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

const currencyOptions = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const autoRefreshOptions = [
  { value: '0', label: 'Off' },
  { value: '10', label: '10 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '1 minute' },
  { value: '300', label: '5 minutes' },
];

export function PreferencesPanel() {
  const user = useUser();
  const profile = useProfile();
  const authInitialized = useAuthInitialized();
  const { updateProfile, isUpdating: isSaving } = useProfileUpdate();
  const { symbols: dynamicSymbols } = useDynamicSymbols();

  const symbolOptions = (dynamicSymbols.length > 0 ? dynamicSymbols : allSymbols).map((symbol) => ({
    value: `${symbol}/USD`,
    label: `${symbol}/USD`,
  }));

  // Derive oracle options from the centralized config (sorted by market cap)
  // instead of a hard-coded subset, so newly integrated providers surface
  // here automatically.
  const oracleOptions = useMemo(
    () =>
      getPriceOracleProvidersSortedByMarketCap().map((provider) => ({
        value: provider,
        label: providerNames[provider] ?? provider,
      })),
    []
  );

  const computedPreferences = useMemo(() => {
    if (typeof window === 'undefined') return defaultPreferences;
    const saved = localStorage.getItem(STORAGE_KEY);
    let localPrefs: Partial<UserPreferences> = {};
    if (saved) {
      try {
        localPrefs = JSON.parse(saved);
      } catch {
        localPrefs = {};
      }
    }

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
            : localPrefs.autoRefreshInterval || defaultPreferences.autoRefreshInterval,
      };
    }
    return { ...defaultPreferences, ...localPrefs };
  }, [user, profile]);

  const [localOverrides, setLocalOverrides] = useState<Partial<UserPreferences> | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preferences = localOverrides
    ? { ...computedPreferences, ...localOverrides }
    : computedPreferences;

  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    setError(null);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      if (user) {
        const dbPreferences: DbUserPreferences = {
          default_oracle: preferences.defaultOracle,
          default_symbol: preferences.defaultSymbol,
          default_time_range: preferences.defaultTimeRange,
          default_currency: preferences.defaultCurrency,
          auto_refresh_interval: parseInt(preferences.autoRefreshInterval, 10),
          chart_settings: {
            show_confidence_interval: true,
            auto_refresh: preferences.autoRefreshInterval !== '0',
            refresh_interval: parseInt(preferences.autoRefreshInterval, 10) * 1000,
          },
        };
        await updateProfile({
          preferences: dbPreferences as Record<string, unknown>,
        });
      }

      setLocalOverrides(null);
      setSuccess('Preferences saved successfully');

      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error(
        'Failed to save preferences',
        err instanceof Error ? err : new Error(String(err))
      );
      setError('Failed to save preferences');
    }
  };

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setLocalOverrides((prev) => ({ ...(prev || {}), [key]: value }));
  };

  return (
    <div className="space-y-6">
      {!authInitialized ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <section className="settings-record">
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Preferences</h2>
                  <p className="text-sm text-slate-500">Customize your default settings</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {success && (
                <div className="flex items-center gap-2 border-l-2 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              )}

              {error && (
                <div className="border-l-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-400" />
                    Default Oracle
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {oracleOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updatePreference('defaultOracle', option.value)}
                        className={`border px-3 py-2 text-sm font-medium transition-colors ${
                          preferences.defaultOracle === option.value
                            ? 'border-blue-700 bg-blue-700 text-white'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Select your preferred oracle provider for price queries
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Default Symbol
                  </label>
                  <DropdownSelect
                    options={symbolOptions}
                    value={preferences.defaultSymbol}
                    onChange={(value) => updatePreference('defaultSymbol', value)}
                    searchable
                    searchPlaceholder="Search symbol..."
                    placeholder="Select symbol"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Your default trading pair for queries
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Default Time Range
                  </label>
                  <SegmentedControl
                    options={timeRangeOptions}
                    value={preferences.defaultTimeRange}
                    onChange={(value) => updatePreference('defaultTimeRange', value as string)}
                    size="md"
                  />
                  <p className="text-xs text-slate-500 mt-1">Default time range for price charts</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    Default Currency
                  </label>
                  <DropdownSelect
                    options={currencyOptions}
                    value={preferences.defaultCurrency}
                    onChange={(value) => updatePreference('defaultCurrency', value)}
                    placeholder="Select currency"
                  />
                  <p className="text-xs text-slate-500 mt-1">Currency for displaying prices</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                    Auto Refresh Interval
                  </label>
                  <DropdownSelect
                    options={autoRefreshOptions}
                    value={preferences.autoRefreshInterval}
                    onChange={(value) => updatePreference('autoRefreshInterval', value)}
                    placeholder="Select refresh interval"
                  />
                  <p className="text-xs text-slate-500 mt-1">How often to refresh price data</p>
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              leftIcon={
                isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )
              }
              className="rounded-sm"
            >
              Save Settings
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
