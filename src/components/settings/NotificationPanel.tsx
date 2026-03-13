'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Globe,
  AlertTriangle,
  TrendingUp,
  Save,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('NotificationPanel');

interface NotificationSettings {
  emailNotifications: boolean;
  browserNotifications: boolean;
  alertNotifications: boolean;
  priceChangeThreshold: number;
  priceChangeEnabled: boolean;
}

const STORAGE_KEY = 'notification_settings';

const defaultSettings: NotificationSettings = {
  emailNotifications: false,
  browserNotifications: false,
  alertNotifications: true,
  priceChangeThreshold: 5,
  priceChangeEnabled: false,
};

export function NotificationPanel() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        logger.error(
          'Failed to parse notification settings',
          e instanceof Error ? e : new Error(String(e))
        );
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);

      if (permission === 'denied') {
        alert('浏览器通知权限被拒绝。请在浏览器设置中允许通知。');
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    setIsSaving(false);
    setSuccess('通知设置已保存');

    setTimeout(() => setSuccess(null), 3000);
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const Toggle = ({
    enabled,
    onChange,
    disabled = false,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            通知设置
          </h2>
          <p className="text-sm text-gray-500 mt-1">管理您接收通知的方式</p>
        </div>

        <div className="p-6 space-y-6">
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">邮件通知</div>
                  <div className="text-sm text-gray-500">通过邮件接收重要通知</div>
                </div>
              </div>
              <Toggle
                enabled={settings.emailNotifications}
                onChange={(value) => updateSetting('emailNotifications', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">浏览器通知</div>
                  <div className="text-sm text-gray-500">在浏览器中显示实时通知</div>
                  {browserPermission === 'denied' && (
                    <div className="text-xs text-red-500 mt-1">
                      通知权限已被拒绝，请在浏览器设置中允许
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {browserPermission === 'default' && settings.browserNotifications && (
                  <button
                    onClick={requestBrowserPermission}
                    className="text-xs text-blue-600 hover:text-blue-700 mr-2"
                  >
                    授权
                  </button>
                )}
                <Toggle
                  enabled={settings.browserNotifications}
                  onChange={(value) => {
                    if (value && browserPermission === 'default') {
                      requestBrowserPermission();
                    }
                    updateSetting('browserNotifications', value);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gray-400" />
            告警通知
          </h2>
          <p className="text-sm text-gray-500 mt-1">配置价格告警的通知方式</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">告警触发通知</div>
                <div className="text-sm text-gray-500">当价格告警触发时发送通知</div>
              </div>
            </div>
            <Toggle
              enabled={settings.alertNotifications}
              onChange={(value) => updateSetting('alertNotifications', value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            价格变动通知
          </h2>
          <p className="text-sm text-gray-500 mt-1">当价格变动超过阈值时自动通知</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">启用价格变动通知</div>
                <div className="text-sm text-gray-500">当价格变动超过设定阈值时通知</div>
              </div>
            </div>
            <Toggle
              enabled={settings.priceChangeEnabled}
              onChange={(value) => updateSetting('priceChangeEnabled', value)}
            />
          </div>

          {settings.priceChangeEnabled && (
            <div className="pl-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">变动阈值 (%)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings.priceChangeThreshold}
                  onChange={(e) => updateSetting('priceChangeThreshold', Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="w-16 text-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {settings.priceChangeThreshold}
                  </span>
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                当价格在短时间内变动超过此百分比时发送通知
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存设置
        </button>
      </div>
    </div>
  );
}
