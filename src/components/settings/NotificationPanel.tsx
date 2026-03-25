'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Mail } from 'lucide-react';
import { Globe } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { Save } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { CheckCircle } from 'lucide-react';
import { useTranslations } from '@/i18n';

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

function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
        enabled ? 'bg-primary-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function NotificationPanel() {
  const t = useTranslations();
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    if (typeof window === 'undefined') return defaultSettings;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);

      if (permission === 'denied') {
        alert(t('settings.notifications.browserPermissionDenied'));
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    setIsSaving(false);
    setSuccess(t('settings.notifications.saveSuccess'));

    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = setTimeout(() => setSuccess(null), 3000);
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            {t('settings.notifications.title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('settings.notifications.subtitle')}</p>
        </div>

        <div className="p-6 space-y-6">
          {success && (
            <div className="p-3 bg-success-50 border border-green-200 rounded-lg text-success-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {t('settings.notifications.emailNotifications')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('settings.notifications.emailNotificationsDesc')}
                  </div>
                </div>
              </div>
              <Toggle
                enabled={settings.emailNotifications}
                onChange={(value) => updateSetting('emailNotifications', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-purple-100 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {t('settings.notifications.browserNotifications')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('settings.notifications.browserNotificationsDesc')}
                  </div>
                  {browserPermission === 'denied' && (
                    <div className="text-xs text-danger-500 mt-1">
                      {t('settings.notifications.permissionDeniedHint')}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {browserPermission === 'default' && settings.browserNotifications && (
                  <button
                    onClick={requestBrowserPermission}
                    className="text-xs text-primary-600 hover:text-primary-700 mr-2 transition-colors"
                  >
                    {t('settings.notifications.authorize')}
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

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gray-400" />
            {t('settings.notifications.alertNotifications')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('settings.notifications.alertNotificationsDesc')}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-warning-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {t('settings.notifications.alertTriggerNotification')}
                </div>
                <div className="text-sm text-gray-500">
                  {t('settings.notifications.alertTriggerNotificationDesc')}
                </div>
              </div>
            </div>
            <Toggle
              enabled={settings.alertNotifications}
              onChange={(value) => updateSetting('alertNotifications', value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            {t('settings.notifications.priceChangeNotification')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('settings.notifications.priceChangeNotificationDesc')}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-success-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {t('settings.notifications.enablePriceChangeNotification')}
                </div>
                <div className="text-sm text-gray-500">
                  {t('settings.notifications.enablePriceChangeNotificationDesc')}
                </div>
              </div>
            </div>
            <Toggle
              enabled={settings.priceChangeEnabled}
              onChange={(value) => updateSetting('priceChangeEnabled', value)}
            />
          </div>

          {settings.priceChangeEnabled && (
            <div className="pl-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('settings.notifications.changeThreshold')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings.priceChangeThreshold}
                  onChange={(e) => updateSetting('priceChangeThreshold', Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="w-16 text-center bg-gray-50 rounded-md py-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {settings.priceChangeThreshold}
                  </span>
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('settings.notifications.changeThresholdHint')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm hover:shadow-md"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('settings.notifications.saveSettings')}
        </button>
      </div>
    </div>
  );
}
