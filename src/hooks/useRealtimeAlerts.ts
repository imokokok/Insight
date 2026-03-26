'use client';

import { useState, useEffect, useCallback } from 'react';

import type { AlertEventPayload } from '@/lib/supabase/realtime';
import { useUser } from '@/stores/authStore';
import { useConnectionStatus, useRealtimeActions } from '@/stores/realtimeStore';

export interface RealtimeAlertNotification {
  id: string;
  alertId: string;
  userId: string;
  price: number;
  triggeredAt: string;
  acknowledged: boolean;
  isNew: boolean;
}

export interface UseRealtimeAlertsOptions {
  enabled?: boolean;
  showAlertNotification?: boolean;
  onAlertTriggered?: (alert: RealtimeAlertNotification) => void;
}

export interface UseRealtimeAlertsReturn {
  alerts: RealtimeAlertNotification[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: Date | null;
  acknowledgeAlert: (alertId: string) => void;
  clearAlerts: () => void;
}

// Alert notification keys for i18n
export const alertNotificationKeys = {
  priceAlertTriggered: 'hooks.alerts.priceAlertTriggered',
  priceReached: 'hooks.alerts.priceReached',
};

export function useRealtimeAlerts(options: UseRealtimeAlertsOptions = {}): UseRealtimeAlertsReturn {
  const { enabled = true, showAlertNotification = true, onAlertTriggered } = options;
  const connectionStatus = useConnectionStatus();
  const { subscribeToAlertEvents } = useRealtimeActions();
  const user = useUser();
  const [alerts, setAlerts] = useState<RealtimeAlertNotification[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleAlertEvent = useCallback(
    (payload: AlertEventPayload) => {
      if (payload.eventType !== 'INSERT') {
        return;
      }

      const newAlert = payload.new;
      const notification: RealtimeAlertNotification = {
        id: newAlert.id || '',
        alertId: newAlert.alert_id || '',
        userId: newAlert.user_id,
        price: newAlert.price,
        triggeredAt: newAlert.triggered_at,
        acknowledged: newAlert.acknowledged || false,
        isNew: true,
      };

      setAlerts((prevAlerts) => [notification, ...prevAlerts]);
      setLastUpdate(new Date());

      if (showAlertNotification && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(alertNotificationKeys.priceAlertTriggered, {
            body: `${alertNotificationKeys.priceReached} ${notification.price}`,
            icon: '/favicon.ico',
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification(alertNotificationKeys.priceAlertTriggered, {
                body: `${alertNotificationKeys.priceReached} ${notification.price}`,
                icon: '/favicon.ico',
              });
            }
          });
        }
      }

      if (onAlertTriggered) {
        onAlertTriggered(notification);
      }
    },
    [showAlertNotification, onAlertTriggered]
  );

  useEffect(() => {
    if (!enabled || !user) {
      return;
    }

    const unsubscribe = subscribeToAlertEvents(user.id, handleAlertEvent);

    return () => {
      unsubscribe();
    };
  }, [enabled, user, handleAlertEvent, subscribeToAlertEvents]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true, isNew: false } : alert
      )
    );
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    connectionStatus,
    lastUpdate,
    acknowledgeAlert,
    clearAlerts,
  };
}

export function useAlertNotifications(): {
  hasUnreadAlerts: boolean;
  unreadCount: number;
  requestPermission: () => Promise<boolean>;
} {
  const [hasUnreadAlerts, _setHasUnreadAlerts] = useState(false);
  const [unreadCount, _setUnreadCount] = useState(0);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  return {
    hasUnreadAlerts,
    unreadCount,
    requestPermission,
  };
}
