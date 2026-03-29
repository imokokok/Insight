'use client';

import { useState, useMemo } from 'react';

import { Activity, CheckCircle, XCircle, TrendingUp, Users, Radio } from 'lucide-react';

import { useTranslations, useLocale } from '@/i18n';

import { type BandProtocolIBCViewProps } from '../types';

function formatTimeAgo(timestamp: number, t: (key: string, params?: Record<string, string | number | Date>) => string): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return t('band.bandProtocol.time.minutesAgo', { count: minutes });
  if (hours < 24) return t('band.bandProtocol.time.hoursAgo', { count: hours });
  return t('band.bandProtocol.time.daysAgo', { count: days });
}

function formatDate(timestamp: number, locale: string = 'en-US'): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

export function BandProtocolIBCView({
  ibcConnections,
  ibcTransferStats,
  ibcTransferTrends,
  isLoading,
}: BandProtocolIBCViewProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredConnections = useMemo(() => {
    if (filter === 'all') return ibcConnections;
    return ibcConnections.filter((conn) => conn.status === filter);
  }, [ibcConnections, filter]);

  const activeCount = ibcConnections.filter((c) => c.status === 'active').length;
  const inactiveCount = ibcConnections.filter((c) => c.status === 'inactive').length;

  const stats = ibcTransferStats
    ? [
        {
          label: t('band.bandProtocol.ibc.totalTransfers24h'),
          value: ibcTransferStats.totalTransfers24h.toLocaleString(),
          icon: TrendingUp,
        },
        {
          label: t('band.bandProtocol.ibc.activeChannels'),
          value: ibcTransferStats.activeChannels.toString(),
          icon: Radio,
        },
        {
          label: t('band.bandProtocol.ibc.successRate'),
          value: `${ibcTransferStats.successRate.toFixed(1)}%`,
          icon: CheckCircle,
        },
        {
          label: t('band.bandProtocol.ibc.activeRelayers'),
          value: ibcTransferStats.activeRelayers.toString(),
          icon: Users,
        },
      ]
    : [];

  const getChainIcon = (chainName: string) => {
    const iconMap: Record<string, string> = {
      'Cosmos Hub': '⚛️',
      Osmosis: '🌊',
      Juno: '🚀',
      Stargaze: '🌟',
      Stride: '🏃',
      Axelar: '🔗',
      Injective: '💉',
      Persistence: '💎',
      Crescent: '🌙',
      Kujira: '🦈',
      Neutron: '⚛️',
      Celestia: '🌌',
    };
    return iconMap[chainName] || '🔗';
  };

  const maxTransfers = Math.max(...ibcTransferTrends.map((t) => t.transfers), 1);

  if (isLoading && ibcConnections.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-3">
            <stat.icon className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
            {index < stats.length - 1 && (
              <div className="hidden sm:block w-px h-10 bg-gray-200 ml-4" />
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {t('band.bandProtocol.ibc.transferTrend')}
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-end gap-2 h-32">
            {ibcTransferTrends.map((trend, index) => {
              const height = (trend.transfers / maxTransfers) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-purple-500 rounded-t transition-all duration-300 hover:bg-purple-600"
                    style={{ height: `${height}%` }}
                    title={`${trend.transfers.toLocaleString()} transfers`}
                  />
                  {index % 2 === 0 && (
                    <span className="text-xs text-gray-400">{formatDate(trend.timestamp, locale)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            {t('band.bandProtocol.ibc.connectedChains')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('band.bandProtocol.ibc.all')} ({ibcConnections.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                filter === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {t('band.bandProtocol.ibc.active')} ({activeCount})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                filter === 'inactive'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              {t('band.bandProtocol.ibc.inactive')} ({inactiveCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  {t('band.bandProtocol.ibc.chainName')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  {t('band.bandProtocol.ibc.channelId')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  {t('band.bandProtocol.ibc.connectionId')}
                </th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-600">
                  {t('band.bandProtocol.ibc.status')}
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                  {t('band.bandProtocol.ibc.transfers24h')}
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                  {t('band.bandProtocol.ibc.successRate')}
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                  {t('band.bandProtocol.ibc.lastActivity')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredConnections.map((conn, idx) => (
                <tr
                  key={conn.chainId}
                  className={`${idx !== filteredConnections.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50/50`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span>{getChainIcon(conn.chainName)}</span>
                      <div>
                        <span className="font-medium text-gray-900">{conn.chainName}</span>
                        <p className="text-xs text-gray-400 font-mono">{conn.chainId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-gray-600 font-mono text-xs">{conn.channelId}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-gray-600 font-mono text-xs">{conn.connectionId}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-center">
                      {conn.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full">
                          <Activity className="w-3 h-3" />
                          {t('band.bandProtocol.ibc.active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50 rounded-full">
                          <XCircle className="w-3 h-3" />
                          {t('band.bandProtocol.ibc.inactive')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-900">
                    {conn.transfers24h.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`font-medium ${
                        conn.successRate >= 98
                          ? 'text-emerald-600'
                          : conn.successRate >= 90
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      {conn.successRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500 text-xs">
                    {formatTimeAgo(conn.lastActivity, t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ibcConnections.length > 0 && (
        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {t('band.bandProtocol.ibc.topRelayers')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ibcConnections
              .flatMap((conn) => conn.relayers)
              .sort((a, b) => b.transferCount - a.transferCount)
              .slice(0, 6)
              .map((relayer, index) => (
                <div
                  key={`${relayer.address}-${index}`}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{relayer.moniker}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        relayer.successRate >= 98
                          ? 'bg-emerald-100 text-emerald-700'
                          : relayer.successRate >= 95
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {relayer.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate mb-2">{relayer.address}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{t('band.bandProtocol.ibc.transfers')}</span>
                    <span className="font-medium text-gray-900">
                      {relayer.transferCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
