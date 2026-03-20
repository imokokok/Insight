'use client';

import { useTranslations } from 'next-intl';
import { DashboardCard } from '../DashboardCard';
import { AnomalyStats as AnomalyStatsType } from './types';

interface AlertStatsProps {
  stats: AnomalyStatsType;
}

export function AlertStats({ stats }: AlertStatsProps) {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      <DashboardCard className="text-center">
        <div className="text-2xl font-bold text-gray-900">{stats.totalAnomalies}</div>
        <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.totalAnomalies')}</div>
      </DashboardCard>

      <DashboardCard className="text-center">
        <div className="text-2xl font-bold text-danger-600">{stats.highSeverityCount}</div>
        <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.highSeverity')}</div>
      </DashboardCard>

      <DashboardCard className="text-center">
        <div className="text-2xl font-bold text-warning-600">{stats.mediumSeverityCount}</div>
        <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.mediumSeverity')}</div>
      </DashboardCard>

      <DashboardCard className="text-center">
        <div className="text-2xl font-bold text-warning-600">{stats.lowSeverityCount}</div>
        <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.lowSeverity')}</div>
      </DashboardCard>

      <DashboardCard className="text-center">
        <div className="text-2xl font-bold text-primary-600">{stats.priceSpikeCount}</div>
        <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.priceSpikeCount')}</div>
      </DashboardCard>

      <DashboardCard className="text-center">
        <div className="text-2xl font-bold text-purple-600">{stats.priceDeviationCount}</div>
        <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.priceDeviationCount')}</div>
      </DashboardCard>

      <DashboardCard className="text-center">
        <div className="text-2xl font-bold text-indigo-600">{stats.dataDelayCount}</div>
        <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.dataDelayCount')}</div>
      </DashboardCard>

      <DashboardCard className="text-center">
        <div className="text-2xl font-bold text-pink-600">{stats.priceDropCount}</div>
        <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.priceDropCount')}</div>
      </DashboardCard>
    </div>
  );
}
