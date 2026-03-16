'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { DashboardCard } from '../../common/DashboardCard';

interface NetworkStatusItem {
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface DataSource {
  name: string;
  status: 'active' | 'syncing' | 'offline';
  latency: string;
}

interface UMADashboardPanelProps {
  activeValidators: number;
  avgResponseTime: number;
  nodeUptime: number;
  dataFeeds: number;
  networkStatus?: NetworkStatusItem[];
  dataSources?: DataSource[];
}

export function UMADashboardPanel({
  activeValidators,
  avgResponseTime,
  nodeUptime,
  dataFeeds,
  networkStatus = [],
  dataSources = [],
}: UMADashboardPanelProps) {
  const t = useTranslations();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return 'bg-green-500';
      case 'warning':
      case 'syncing':
        return 'bg-yellow-500';
      case 'critical':
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return t('uma.networkHealth.online') || '正常';
      case 'warning':
        return t('uma.networkHealth.warning') || '警告';
      case 'critical':
        return t('uma.networkHealth.offline') || '离线';
      default:
        return status;
    }
  };

  return (
    <DashboardCard title={t('uma.dashboard.networkHealth') || '网络健康指标'}>
      <div className="space-y-6">
        {/* 主要指标 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.stats.activeValidators')}
            </p>
            <p className="text-xl font-bold text-gray-900">{activeValidators.toLocaleString()}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-500">{t('uma.networkHealth.online')}</span>
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.networkHealth.responseTime')}
            </p>
            <p className="text-xl font-bold text-gray-900">{avgResponseTime}ms</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${avgResponseTime < 300 ? 'bg-green-500' : 'bg-yellow-500'}`}
              />
              <span className="text-xs text-gray-500">
                {avgResponseTime < 300
                  ? t('uma.networkHealth.excellent')
                  : t('uma.networkHealth.good')}
              </span>
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.stats.validatorUptime')}
            </p>
            <p className="text-xl font-bold text-gray-900">{nodeUptime}%</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-500">{t('uma.networkHealth.online')}</span>
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.stats.dataFeeds')}
            </p>
            <p className="text-xl font-bold text-gray-900">{dataFeeds}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-500">{t('uma.networkHealth.active')}</span>
            </div>
          </div>
        </div>

        {/* 详细状态 */}
        {networkStatus.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              {t('uma.dashboard.detailedStatus') || '详细状态'}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {networkStatus.map((item, index) => (
                <div key={index} className="text-center py-2">
                  <p className="text-xs text-gray-500 mb-1 truncate">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                    <span className="text-xs text-gray-500">{getStatusText(item.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 数据源状态 */}
        {dataSources.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              {t('uma.dashboard.dataSources') || '数据源状态'}
            </h4>
            <div className="space-y-2">
              {dataSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 flex-shrink-0 rounded-full ${
                        source.status === 'active'
                          ? 'bg-green-500'
                          : source.status === 'syncing'
                            ? 'bg-yellow-500 animate-pulse'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm text-gray-700 truncate">{source.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                    {source.latency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

export default UMADashboardPanel;
