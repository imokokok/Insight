'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Palette,
  Globe,
  Clock,
  Database,
  Save,
  Loader2,
  CheckCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser, useProfile, useAuthInitialized } from '@/stores/authStore';
import { updateUserProfile } from '@/lib/supabase/auth';
import { OracleProvider } from '@/types/oracle';
import { DropdownSelect, SegmentedControl } from '@/components/ui/selectors';

interface UserPreferences {
  defaultOracle: string;
  defaultSymbol: string;
  defaultTimeRange: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

const STORAGE_KEY = 'user_preferences';

const defaultPreferences: UserPreferences = {
  defaultOracle: 'chainlink',
  defaultSymbol: 'BTC/USD',
  defaultTimeRange: '24h',
  theme: 'system',
  language: 'zh-CN',
};

const oracleOptions = [
  { value: 'chainlink', label: 'Chainlink' },
  { value: 'pyth', label: 'Pyth Network' },
  { value: 'band', label: 'Band Protocol' },
  { value: 'api3', label: 'API3' },
  { value: 'uma', label: 'UMA' },
];

const symbolOptions = [
  { value: 'BTC/USD', label: 'BTC/USD' },
  { value: 'ETH/USD', label: 'ETH/USD' },
  { value: 'SOL/USD', label: 'SOL/USD' },
  { value: 'AVAX/USD', label: 'AVAX/USD' },
  { value: 'NEAR/USD', label: 'NEAR/USD' },
  { value: 'MATIC/USD', label: 'MATIC/USD' },
  { value: 'ARB/USD', label: 'ARB/USD' },
  { value: 'OP/USD', label: 'OP/USD' },
  { value: 'DOT/USD', label: 'DOT/USD' },
  { value: 'ADA/USD', label: 'ADA/USD' },
  { value: 'ATOM/USD', label: 'ATOM/USD' },
  { value: 'FTM/USD', label: 'FTM/USD' },
  { value: 'LINK/USD', label: 'LINK/USD' },
  { value: 'UNI/USD', label: 'UNI/USD' },
  { value: 'AAVE/USD', label: 'AAVE/USD' },
  { value: 'MKR/USD', label: 'MKR/USD' },
  { value: 'SNX/USD', label: 'SNX/USD' },
  { value: 'COMP/USD', label: 'COMP/USD' },
  { value: 'YFI/USD', label: 'YFI/USD' },
  { value: 'CRV/USD', label: 'CRV/USD' },
  { value: 'LDO/USD', label: 'LDO/USD' },
  { value: 'SUSHI/USD', label: 'SUSHI/USD' },
  { value: '1INCH/USD', label: '1INCH/USD' },
  { value: 'BAL/USD', label: 'BAL/USD' },
  { value: 'FXS/USD', label: 'FXS/USD' },
  { value: 'RPL/USD', label: 'RPL/USD' },
  { value: 'GMX/USD', label: 'GMX/USD' },
  { value: 'DYDX/USD', label: 'DYDX/USD' },
  { value: 'USDC/USD', label: 'USDC/USD' },
  { value: 'USDT/USD', label: 'USDT/USD' },
  { value: 'DAI/USD', label: 'DAI/USD' },
];

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

export function PreferencesPanel() {
  const t = useTranslations();
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
      const dbPrefs = profile.preferences;
      const merged: UserPreferences = {
        defaultOracle:
          dbPrefs.defaultProvider || localPrefs.defaultOracle || defaultPreferences.defaultOracle,
        defaultSymbol:
          dbPrefs.defaultSymbol || localPrefs.defaultSymbol || defaultPreferences.defaultSymbol,
        defaultTimeRange: localPrefs.defaultTimeRange || defaultPreferences.defaultTimeRange,
        theme: dbPrefs.theme || localPrefs.theme || defaultPreferences.theme,
        language: localPrefs.language || defaultPreferences.language,
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
        await updateUserProfile(user.id, {
          preferences: {
            defaultProvider: preferences.defaultOracle as OracleProvider,
            defaultSymbol: preferences.defaultSymbol,
            theme: preferences.theme,
          },
        });
      }

      if (preferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (preferences.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
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

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-gray-400" />
                {t('settings.preferences.title')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{t('settings.preferences.subtitle')}</p>
            </div>

            <div className="p-6 space-y-6">
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-400" />
                    {t('settings.preferences.defaultOracle')}
                  </label>
                  <SegmentedControl
                    options={oracleOptions}
                    value={preferences.defaultOracle}
                    onChange={(value) => updatePreference('defaultOracle', value as string)}
                    size="md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
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
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {preferences.theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-gray-400" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-400" />
                )}
                {t('settings.preferences.themeSettings')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t('settings.preferences.themeSettingsDesc')}
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    value: 'light',
                    label: t('settings.preferences.themeLight'),
                    icon: Sun,
                    desc: t('settings.preferences.themeLightDesc'),
                  },
                  {
                    value: 'dark',
                    label: t('settings.preferences.themeDark'),
                    icon: Moon,
                    desc: t('settings.preferences.themeDarkDesc'),
                  },
                  {
                    value: 'system',
                    label: t('settings.preferences.themeSystem'),
                    icon: Palette,
                    desc: t('settings.preferences.themeSystemDesc'),
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  const isSelected = preferences.theme === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() =>
                        updatePreference('theme', option.value as UserPreferences['theme'])
                      }
                      className={`p-4 border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                      />
                      <div
                        className={`font-medium text-sm ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}
                      >
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
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
