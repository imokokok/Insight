'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useUser, useAuthLoading } from '@/stores/authStore';
import { useAlerts, useAlertEvents, useAlertEventsRealtime } from '@/hooks/useAlerts';
import { AlertConfig } from '@/components/alerts/AlertConfig';
import { AlertList } from '@/components/alerts/AlertList';
import { AlertHistory } from '@/components/alerts/AlertHistory';
import { AlertNotificationContainer } from '@/components/alerts/AlertNotification';
import { useTranslations } from 'next-intl';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { TutorialManager } from '@/components/ui/Tutorial';
import { ProgressBar } from '@/components/ui/LoadingProgress';

export default function AlertsPage() {
  const t = useTranslations();
  const user = useUser();
  const authLoading = useAuthLoading();
  const { alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useAlerts();
  const { events, isLoading: eventsLoading, refetch: refetchEvents } = useAlertEvents();
  useAlertEventsRealtime();

  const handleAlertCreated = useCallback(() => {
    refetchAlerts();
  }, [refetchAlerts]);

  const handleDismissNotification = useCallback(
    (_eventId: string) => {
      refetchEvents();
    },
    [refetchEvents]
  );

  const handleViewDetails = useCallback(() => {
    const element = document.getElementById('alert-history');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {t('alerts.page.loginRequired')}
          </h2>
          <p className="mt-2 text-gray-500">{t('alerts.page.loginRequiredDesc')}</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('alerts.page.goToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  const unacknowledgedEvents = events.filter((e) => !e.acknowledged);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AlertNotificationContainer
        events={unacknowledgedEvents}
        onDismiss={handleDismissNotification}
        onViewDetails={handleViewDetails}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('alerts.page.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('alerts.page.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AlertConfig onAlertCreated={handleAlertCreated} />
        </div>

        <div className="lg:col-span-2">
          <AlertList alerts={alerts} isLoading={alertsLoading} onRefresh={refetchAlerts} />
        </div>
      </div>

      <div id="alert-history" className="mt-6">
        <AlertHistory events={events} isLoading={eventsLoading} onRefresh={refetchEvents} />
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              {t('alerts.page.instructions.title')}
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>{t('alerts.page.instructions.items.1')}</li>
                <li>{t('alerts.page.instructions.items.2')}</li>
                <li>{t('alerts.page.instructions.items.3')}</li>
                <li>{t('alerts.page.instructions.items.4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
