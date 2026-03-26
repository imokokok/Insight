'use client';

import React from 'react';

import { providerNames } from '@/lib/constants';

import { type AnomalyType } from './types';

export const PROVIDER_NAMES = providerNames;

export const SEVERITY_COLORS = {
  high: { bg: 'bg-danger-100', text: 'text-danger-700', border: 'border-red-300' },
  medium: { bg: 'bg-warning-100', text: 'text-orange-700', border: 'border-orange-300' },
  low: { bg: 'bg-warning-100', text: 'text-warning-700', border: 'border-yellow-300' },
};

export const ANOMALY_TYPE_ICONS: Record<AnomalyType, React.ReactNode> = {
  price_spike: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  price_deviation: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  ),
  data_delay: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  price_drop: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
};

export function formatTime(timestamp: number, locale: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDuration(ms: number, t: (key: string) => string): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}${t('time.hours')} ${minutes % 60}${t('time.minutes')}`;
  }
  if (minutes > 0) {
    return `${minutes}${t('time.minutes')} ${seconds % 60}${t('time.seconds')}`;
  }
  return `${seconds}${t('time.seconds')}`;
}

export function generateAnomalyId(): string {
  return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
