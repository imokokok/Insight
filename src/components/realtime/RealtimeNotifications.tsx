'use client';

import { useState, useEffect, useCallback } from 'react';

import { useRealtimeAlerts } from '@/hooks';
import { useConnectionStatus } from '@/stores/realtimeStore';

export interface NotificationData {
  id: string;
  type: 'price_update' | 'alert_triggered' | 'connection' | 'snapshot' | 'favorite';
  title: string;
  message: string;
  timestamp: Date;
  data?: unknown;
  read: boolean;
}

export interface RealtimeNotificationsProps {
  maxNotifications?: number;
  autoHideDuration?: number;
  showPriceUpdates?: boolean;
  showAlerts?: boolean;
  showConnectionStatus?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function RealtimeNotifications({
  maxNotifications = 5,
  autoHideDuration = 5000,
  showPriceUpdates: _showPriceUpdates = true,
  showAlerts = true,
  showConnectionStatus = true,
  position = 'top-right',
}: RealtimeNotificationsProps) {
  const connectionStatus = useConnectionStatus();
  const { alerts } = useRealtimeAlerts({ enabled: showAlerts });
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = useCallback(
    (notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: NotificationData = {
        ...notification,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        read: false,
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev].slice(0, maxNotifications);
        return updated;
      });

      if (autoHideDuration > 0) {
        setTimeout(() => {
          removeNotification(newNotification.id);
        }, autoHideDuration);
      }
    },
    [maxNotifications, autoHideDuration]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  useEffect(() => {
    if (showConnectionStatus && connectionStatus === 'connected') {
      addNotification({
        type: 'connection',
        title: '实时连接',
        message: '已成功连接到实时数据流',
      });
    }
  }, [connectionStatus, showConnectionStatus, addNotification]);

  useEffect(() => {
    if (showAlerts && alerts.length > 0) {
      const latestAlert = alerts[0];
      if (latestAlert.isNew) {
        addNotification({
          type: 'alert_triggered',
          title: '价格告警',
          message: `价格已达到 ${latestAlert.price}`,
          data: latestAlert,
        });
      }
    }
  }, [alerts, showAlerts, addNotification]);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const typeIcons = {
    price_update: '📈',
    alert_triggered: '🚨',
    connection: '🔗',
    snapshot: '📸',
    favorite: '⭐',
  };

  const typeColors = {
    price_update: 'border-primary-500 bg-primary-50',
    alert_triggered: 'border-danger-500 bg-danger-50',
    connection: 'border-success-500 bg-success-50',
    snapshot: 'border-purple-500 bg-purple-50',
    favorite: 'border-warning-500 bg-warning-50',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none`}
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`pointer-events-auto border-l-4   p-4 transition-all duration-300 transform ${
            typeColors[notification.type]
          } ${notification.read ? 'opacity-60' : 'opacity-100'}`}
          onClick={() => markAsRead(notification.id)}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{typeIcons[notification.type]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 text-sm">{notification.title}</h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-700 text-sm mt-1">{notification.message}</p>
              <p className="text-gray-500 text-xs mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RealtimeNotifications;
