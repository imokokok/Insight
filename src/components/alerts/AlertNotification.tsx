'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AlertEvent } from '@/lib/supabase/database.types';
import { useAcknowledgeAlert } from '@/hooks/useAlerts';
import { useTranslations } from 'next-intl';

interface AlertNotificationProps {
  event: AlertEvent;
  onDismiss: (eventId: string) => void;
  onViewDetails?: (eventId: string) => void;
}

export function AlertNotification({ event, onDismiss, onViewDetails }: AlertNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { acknowledge, isAcknowledging } = useAcknowledgeAlert();
  const t = useTranslations();
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setIsLeaving(true);
    dismissTimerRef.current = setTimeout(() => {
      onDismiss(event.id!);
    }, 300);
  }, [event.id, onDismiss]);

  const handleAcknowledge = useCallback(async () => {
    await acknowledge(event.id!);
    handleDismiss();
  }, [acknowledge, event.id, handleDismiss]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(event.id);
    handleDismiss();
  }, [event.id, onViewDetails, handleDismiss]);

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm overflow-hidden   ring-1 ring-black ring-opacity-5 transition-all duration-300 ${
        isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-white p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center  bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900">{t('alerts.notification.title')}</p>
            <p className="mt-1 text-sm text-gray-500">{event.condition_met}</p>
            <p className="mt-1 text-xs text-gray-400">
              {t('alerts.notification.triggerPrice')} {event.price.toFixed(4)}
            </p>
            <p className="text-xs text-gray-400">
              {t('alerts.notification.time')} {new Date(event.triggered_at).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">{t('actions.close')}</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
            className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white  hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-400"
          >
            {isAcknowledging
              ? t('alerts.notification.acknowledging')
              : t('alerts.notification.acknowledge')}
          </button>
          {onViewDetails && (
            <button
              onClick={handleViewDetails}
              className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900  ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              {t('alerts.notification.viewDetails')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface AlertNotificationContainerProps {
  events: AlertEvent[];
  onDismiss: (eventId: string) => void;
  onViewDetails?: (eventId: string) => void;
  maxVisible?: number;
}

export function AlertNotificationContainer({
  events,
  onDismiss,
  onViewDetails,
  maxVisible = 3,
}: AlertNotificationContainerProps) {
  const visibleEvents = events.filter((e) => !e.acknowledged).slice(0, maxVisible);

  if (visibleEvents.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {visibleEvents.map((event) => (
          <AlertNotification
            key={event.id}
            event={event}
            onDismiss={onDismiss}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}

export function useAlertNotifications() {
  const [notifications, setNotifications] = useState<AlertEvent[]>([]);

  const addNotification = useCallback((event: AlertEvent) => {
    setNotifications((prev) => [event, ...prev]);
  }, []);

  const removeNotification = useCallback((eventId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== eventId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };
}
