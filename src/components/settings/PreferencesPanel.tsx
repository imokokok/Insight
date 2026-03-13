'use client';

import { useState, useEffect } from 'react';
import { Palette, Globe, Clock, Database, Save, Loader2, CheckCircle, Sun, Moon } from 'lucide-react';

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
  { value: 'BNB/USD', label: 'BNB/USD' },
  { value: 'SOL/USD', label: 'SOL/USD' },
  { value: 'AVAX/USD', label: 'AVAX/USD' },
  { value: 'MATIC/USD', label: 'MATIC/USD' },
];

const timeRangeOptions = [
  { value: '1h', label: '1 小时' },
  { value: '6h', label: '6 小时' },
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
];

const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
];

export function PreferencesPanel() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (e) {
        console.error('Failed to parse preferences:', e);
      }
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    
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
    
    setIsSaving(false);
    setSuccess('偏好设置已保存');
    
    setTimeout(() => setSuccess(null), 3000);
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-gray-400" />
            偏好设置
          </h2>
          <p className="text-sm text-gray-500 mt-1">自定义应用的默认行为</p>
        </div>

        <div className="p-6 space-y-6">
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-400" />
                默认预言机
              </label>
              <select
                value={preferences.defaultOracle}
                onChange={(e) => updatePreference('defaultOracle', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                {oracleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">打开预言机页面时默认显示</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                默认交易对
              </label>
              <select
                value={preferences.defaultSymbol}
                onChange={(e) => updatePreference('defaultSymbol', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                {symbolOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">查询价格时默认的交易对</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                默认时间范围
              </label>
              <select
                value={preferences.defaultTimeRange}
                onChange={(e) => updatePreference('defaultTimeRange', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">图表显示的默认时间范围</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                语言
              </label>
              <select
                value={preferences.language}
                onChange={(e) => updatePreference('language', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                {languageOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">应用界面语言</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {preferences.theme === 'dark' ? (
              <Moon className="w-5 h-5 text-gray-400" />
            ) : (
              <Sun className="w-5 h-5 text-gray-400" />
            )}
            主题设置
          </h2>
          <p className="text-sm text-gray-500 mt-1">选择应用的外观主题</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'light', label: '亮色', icon: Sun, desc: '使用亮色主题' },
              { value: 'dark', label: '暗色', icon: Moon, desc: '使用暗色主题' },
              { value: 'system', label: '跟随系统', icon: Palette, desc: '自动跟随系统设置' },
            ].map(option => {
              const Icon = option.icon;
              const isSelected = preferences.theme === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => updatePreference('theme', option.value as UserPreferences['theme'])}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className={`font-medium text-sm ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
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
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          保存设置
        </button>
      </div>
    </div>
  );
}
