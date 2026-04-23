'use client';

import { useCallback } from 'react';

import Link from 'next/link';

import { AlertConfig } from '@/components/alerts/AlertConfig';
import { AlertHistory } from '@/components/alerts/AlertHistory';
import { AlertList } from '@/components/alerts/AlertList';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAlerts, useAlertEvents, useAlertEventsRealtime } from '@/hooks';
import { useUser, useAuthLoading } from '@/stores/authStore';

function AlertsContentInner() {
  const user = useUser();
  const authLoading = useAuthLoading();
  const {
    alerts,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useAlerts();
  const {
    events,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useAlertEvents();
  useAlertEventsRealtime();

  const handleAlertCreated = useCallback(() => {
    refetchAlerts();
  }, [refetchAlerts]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center rounded-lg">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center rounded-lg">
        <div className="text-center bg-white border border-gray-200 rounded-lg p-8">
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
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Log In Required</h2>
          <p className="mt-2 text-gray-500">Please sign in to view and manage your alerts.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Go to Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 rounded-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Price Alerts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up and manage your price alerts for oracle data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AlertConfig onAlertCreated={handleAlertCreated} />
        </div>

        <div className="lg:col-span-2">
          {(alertsError || eventsError) && (
            <div className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-600">
                {alertsError?.message || eventsError?.message || 'An error occurred'}
              </p>
            </div>
          )}
          <AlertList alerts={alerts} isLoading={alertsLoading} onRefresh={refetchAlerts} />
        </div>
      </div>

      <div id="alert-history" className="mt-6">
        <AlertHistory events={events} isLoading={eventsLoading} onRefresh={refetchEvents} />
      </div>

      <div className="mt-8 p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-primary-600"
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
            <h3 className="text-sm font-medium text-primary-800">How to Use Alerts</h3>
            <div className="mt-2 text-sm text-primary-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Configure your alert parameters in the form on the left</li>
                <li>Set the target price and threshold for notifications</li>
                <li>Choose your preferred notification channels</li>
                <li>Monitor your active alerts in the list above</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsContent() {
  return (
    <ErrorBoundary level="page" componentName="AlertsContent">
      <AlertsContentInner />
    </ErrorBoundary>
  );
}
