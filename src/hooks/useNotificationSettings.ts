'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NotificationSettings {
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

export interface UseNotificationSettingsReturn {
  settings: NotificationSettings;
  updateSettings: (updates: Partial<NotificationSettings>) => void;
  requestBrowserPermission: () => Promise<boolean>;
  hasBrowserPermission: boolean;
  shouldShowBrowserNotification: boolean;
  shouldShowAlertNotification: boolean;
}

export function useNotificationSettings(): UseNotificationSettingsReturn {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [hasBrowserPermission, setHasBrowserPermission] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {
        setSettings(defaultSettings);
      }
    }

    if ('Notification' in window) {
      setHasBrowserPermission(Notification.permission === 'granted');
    }
  }, []);

  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      }
      return newSettings;
    });
  }, []);

  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasBrowserPermission(granted);
      return granted;
    } catch {
      return false;
    }
  }, []);

  const shouldShowBrowserNotification = settings.browserNotifications && hasBrowserPermission;
  const shouldShowAlertNotification = settings.alertNotifications;

  return {
    settings,
    updateSettings,
    requestBrowserPermission,
    hasBrowserPermission,
    shouldShowBrowserNotification,
    shouldShowAlertNotification,
  };
}

export function sendBrowserNotification(title: string, body: string, icon?: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
    });
  }
}
