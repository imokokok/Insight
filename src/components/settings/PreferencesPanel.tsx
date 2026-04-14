'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import {
  Globe,
  Clock,
  Database,
  Save,
  Loader2,
  CheckCircle,
  RefreshCw,
  DollarSign,
} from 'lucide-react';

import { DropdownSelect, SegmentedControl } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { getAllSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { updateUserProfile } from '@/lib/supabase/auth';
import { useUser, useProfile, useAuthInitialized } from '@/stores/authStore';

interface UserPreferences {
  defaultOracle: string;
  defaultSymbol: string;
  defaultTimeRange: string;
  language: string;
  defaultCurrency: string;
  autoRefreshInterval: string;
}

// 数据库字段名映射（snake_case）
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

const STORAGE_KEY = 'user_preferences';

const defaultPreferences: UserPreferences = {
  defaultOracle: 'chainlink',
  defaultSymbol: 'BTC/USD',
  defaultTimeRange: '24h',
  language: 'zh-CN',
  defaultCurrency: 'USD',
  autoRefreshInterval: '30',
};

const oracleOptions = [
  { value: 'chainlink', label: 'Chainlink' },
  { value: 'pyth', label: 'Pyth Network' },
  { value: 'api3', label: 'API3' },
  { value: 'redstone', label: 'Redstone' },
  { value: 'dia', label: 'DIA' },
  { value: 'winklink', label: 'WINkLink' },
];

// 从统一的符号列表生成交易对选项
const allSymbols = getAllSupportedSymbols();
const symbolOptions = allSymbols.map((symbol) => ({
  value: `${symbol}/USD`,
  label: `${symbol}/USD`,
}));

const timeRangeOptionKeys = [
  { value: '1h', key: 'settings.preferences.timeRange.hour1' },
  { value: '6h', key: 'settings.preferences.timeRange.hour6' },
  { value: '24h', key: 'settings.preferences.timeRange.day1' },
  { value: '7d', key: 'settings.preferences.timeRange.day7' },
  { value: '30d', key: 'settings.preferences.timeRange.day30' },
];

const languageOptionKeys = [
  { value: 'zh-CN', key: 'settings.preferences.languages.zhCN' },
  { value: 'en-US', key: 'settings.preferences.languages.en' },
];

const currencyOptions = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const autoRefreshOptionKeys = [
  { value: '0', key: 'settings.preferences.refreshInterval.off' },
  { value: '10', key: 'settings.preferences.refreshInterval.sec10' },
  { value: '30', key: 'settings.preferences.refreshInterval.sec30' },
  { value: '60', key: 'settings.preferences.refreshInterval.min1' },
  { value: '300', key: 'settings.preferences.refreshInterval.min5' },
];

export function PreferencesPanel() {
  const t = useTranslations('settingsPage');
  const user = useUser();
  const profile = useProfile();
  const authInitialized = useAuthInitialized();

  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);

  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  const timeRangeOptions = useMemo(
    () => timeRangeOptionKeys.map((option) => ({ value: option.value, label: t(option.key) })),
    [t]
  );

  const languageOptions = useMemo(
    () => languageOptionKeys.map((option) => ({ value: option.value, label: t(option.key) })),
    [t]
  );

  const autoRefreshOptions = useMemo(
    () => autoRefreshOptionKeys.map((option) => ({ value: option.value, label: t(option.key) })),
    [t]
  );

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
        language: dbPrefs.language || localPrefs.language || defaultPreferences.language,
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
          language: preferences.language,
          default_currency: preferences.defaultCurrency,
          auto_refresh_interval: parseInt(preferences.autoRefreshInterval, 10),
          theme: 'dark',
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

      setSuccess(t('settings.preferences.saveSuccess'));

      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
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
                {t('settings.preferences.title')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{t('settings.preferences.subtitle')}</p>
            </div>

            <div className="p-6 space-y-6">
              {success && (
                <div className="p-3 bg-success-50 border border-green-200 rounded-lg text-success-700 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-400" />
                    {t('settings.preferences.defaultOracle')}
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
                    {t('settings.preferences.defaultOracleHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.preferences.defaultSymbol')}
                  </label>
                  <DropdownSelect
                    options={symbolOptions}
                    value={preferences.defaultSymbol}
                    onChange={(value) => updatePreference('defaultSymbol', value)}
                    searchable
                    searchPlaceholder={t('settings.preferences.searchSymbol') || '搜索交易对...'}
                    placeholder={t('settings.preferences.selectSymbol') || '请选择交易对'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings.preferences.defaultSymbolHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {t('settings.preferences.defaultTimeRange')}
                  </label>
                  <SegmentedControl
                    options={timeRangeOptions}
                    value={preferences.defaultTimeRange}
                    onChange={(value) => updatePreference('defaultTimeRange', value as string)}
                    size="md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings.preferences.defaultTimeRangeHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    {t('settings.preferences.language')}
                  </label>
                  <SegmentedControl
                    options={languageOptions}
                    value={preferences.language}
                    onChange={(value) => updatePreference('language', value as string)}
                    size="md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings.preferences.languageHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    {t('settings.preferences.defaultCurrency')}
                  </label>
                  <DropdownSelect
                    options={currencyOptions}
                    value={preferences.defaultCurrency}
                    onChange={(value) => updatePreference('defaultCurrency', value)}
                    placeholder={t('settings.preferences.selectCurrency') || '请选择货币'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings.preferences.defaultCurrencyHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                    {t('settings.preferences.autoRefreshInterval')}
                  </label>
                  <DropdownSelect
                    options={autoRefreshOptions}
                    value={preferences.autoRefreshInterval}
                    onChange={(value) => updatePreference('autoRefreshInterval', value)}
                    placeholder={
                      t('settings.preferences.selectRefreshInterval') || '请选择刷新间隔'
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings.preferences.autoRefreshIntervalHint')}
                  </p>
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
              {t('settings.preferences.saveSettings')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
