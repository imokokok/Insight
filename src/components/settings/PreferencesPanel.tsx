'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { Clock, Database, Save, Loader2, CheckCircle, RefreshCw, DollarSign } from 'lucide-react';

import { DropdownSelect, SegmentedControl } from '@/components/ui';
import { getAllSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { updateUserProfile } from '@/lib/supabase/auth';
import { useUser, useProfile, useAuthInitialized } from '@/stores/authStore';

interface UserPreferences {
  defaultOracle: string;
  defaultSymbol: string;
  defaultTimeRange: string;
  defaultCurrency: string;
  autoRefreshInterval: string;
}

// Database field name mapping (snake_case)
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

const STORAGE_KEY = 'user_preferences';

const defaultPreferences: UserPreferences = {
  defaultOracle: 'chainlink',
  defaultSymbol: 'BTC/USD',
  defaultTimeRange: '24h',
  defaultCurrency: 'USD',
  autoRefreshInterval: '30',
};

const oracleOptions = [
  { value: 'chainlink', label: 'Chainlink' },
  { value: 'pyth', label: 'Pyth Network' },
  { value: 'api3', label: 'API3' },
  { value: 'redstone', label: 'RedStone' },
  { value: 'dia', label: 'DIA' },
  { value: 'winklink', label: 'WINkLink' },
];

// Generate trading pair options from unified symbol list
const allSymbols = getAllSupportedSymbols();
const symbolOptions = allSymbols.map((symbol) => ({
  value: `${symbol}/USD`,
  label: `${symbol}/USD`,
}));

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

  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadPreferences = useCallback(() => {
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
      const merged: UserPreferences = {
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
      setPreferences(merged);
    } else {
      setPreferences({ ...defaultPreferences, ...localPrefs });
    }
    setIsLoading(false);
  }, [user, profile]);

  useEffect(() => {
    if (authInitialized) {
      loadPreferences();
    }
  }, [authInitialized, loadPreferences]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

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
        await updateUserProfile(user.id, {
          preferences: dbPreferences as Record<string, unknown>,
        });
      }

      setSuccess('Preferences saved successfully');

      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setError('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-400" />
                Preferences
              </h2>
              <p className="text-sm text-gray-500 mt-1">Customize your default settings</p>
            </div>

            <div className="p-6 space-y-6">
              {success && (
                <div className="p-3 bg-success-50 border border-green-200 rounded-lg text-success-700 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              )}

              {error && (
                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-400" />
                    Default Oracle
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {oracleOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updatePreference('defaultOracle', option.value)}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                          preferences.defaultOracle === option.value
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Select your preferred oracle provider for price queries
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <p className="text-xs text-gray-500 mt-1">
                    Your default trading pair for queries
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Default Time Range
                  </label>
                  <SegmentedControl
                    options={timeRangeOptions}
                    value={preferences.defaultTimeRange}
                    onChange={(value) => updatePreference('defaultTimeRange', value as string)}
                    size="md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default time range for price charts</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    Default Currency
                  </label>
                  <DropdownSelect
                    options={currencyOptions}
                    value={preferences.defaultCurrency}
                    onChange={(value) => updatePreference('defaultCurrency', value)}
                    placeholder="Select currency"
                  />
                  <p className="text-xs text-gray-500 mt-1">Currency for displaying prices</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                    Auto Refresh Interval
                  </label>
                  <DropdownSelect
                    options={autoRefreshOptions}
                    value={preferences.autoRefreshInterval}
                    onChange={(value) => updatePreference('autoRefreshInterval', value)}
                    placeholder="Select refresh interval"
                  />
                  <p className="text-xs text-gray-500 mt-1">How often to refresh price data</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm hover:shadow-md"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Settings
            </button>
          </div>
        </>
      )}
    </div>
  );
}
