'use client';

import { useState, useCallback, useMemo } from 'react';
import { PriceAlert } from '@/lib/supabase/database.types';
import { providerNames, chainNames, oracleColors, chainColors } from '@/lib/constants';
import { useUpdateAlert, useDeleteAlert } from '@/hooks/useAlerts';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';

interface AlertListProps {
  alerts: PriceAlert[];
  isLoading: boolean;
  onRefresh: () => void;
}

type AlertStatus = 'active' | 'triggered' | 'disabled';

function getAlertStatus(alert: PriceAlert): AlertStatus {
  if (!alert.is_active) return 'disabled';
  if (alert.last_triggered_at) {
    const triggeredTime = new Date(alert.last_triggered_at).getTime();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (triggeredTime > oneHourAgo) return 'triggered';
  }
  return 'active';
}

export function AlertList({ alerts, isLoading, onRefresh }: AlertListProps) {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { updateAlert, isUpdating } = useUpdateAlert();
  const { deleteAlert, isDeleting } = useDeleteAlert();

  const getStatusBadge = useCallback(
    (status: AlertStatus) => {
      switch (status) {
        case 'active':
          return {
            label: t('alerts.list.statusActive'),
            bgColor: 'bg-green-100',
            textColor: 'text-green-700',
            borderColor: 'border-green-200',
          };
        case 'triggered':
          return {
            label: t('alerts.list.statusTriggered'),
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700',
            borderColor: 'border-yellow-200',
          };
        case 'disabled':
          return {
            label: t('alerts.list.statusDisabled'),
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-700',
            borderColor: 'border-gray-200',
          };
      }
    },
    [t]
  );

  const getConditionLabel = useCallback(
    (conditionType: string, targetValue: number): string => {
      switch (conditionType) {
        case 'above':
          return `${t('alerts.condition.above')} ≥ ${targetValue.toFixed(4)}`;
        case 'below':
          return `${t('alerts.condition.below')} ≤ ${targetValue.toFixed(4)}`;
        case 'change_percent':
          return `${t('alerts.condition.changePercent')} ≥ ${targetValue.toFixed(2)}%`;
        default:
          return `${t('alerts.create.targetValueLabel')}: ${targetValue}`;
      }
    },
    [t]
  );

  const handleToggleActive = useCallback(
    async (alert: PriceAlert) => {
      await updateAlert(alert.id!, { is_active: !alert.is_active });
      onRefresh();
    },
    [updateAlert, onRefresh]
  );

  const handleEdit = useCallback((alert: PriceAlert) => {
    setEditingId(alert.id!);
    setEditValue(alert.target_value.toString());
  }, []);

  const handleSaveEdit = useCallback(
    async (alert: PriceAlert) => {
      const newValue = parseFloat(editValue);
      if (isNaN(newValue) || newValue <= 0) return;

      await updateAlert(alert.id!, { target_value: newValue });
      setEditingId(null);
      onRefresh();
    },
    [editValue, updateAlert, onRefresh]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteAlert(id);
      setDeleteConfirmId(null);
      onRefresh();
    },
    [deleteAlert, onRefresh]
  );

  if (isLoading) {
    return (
      <DashboardCard title={t('alerts.list.title')}>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent animate-spin" />
        </div>
      </DashboardCard>
    );
  }

  if (alerts.length === 0) {
    return (
      <DashboardCard title={t('alerts.list.title')}>
        <div className="text-center py-8 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p className="mt-2 text-sm">{t('alerts.list.empty')}</p>
          <p className="text-xs text-gray-400">{t('alerts.list.emptyHint')}</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={`${t('alerts.list.title')} (${alerts.length})`}>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const status = getAlertStatus(alert);
          const badge = getStatusBadge(status);
          const conditionLabel = getConditionLabel(alert.condition_type, alert.target_value);

          return (
            <div
              key={alert.id}
              className="p-4 border border-gray-200  hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{alert.symbol}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium  border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    {alert.provider && (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 "
                          style={{
                            backgroundColor:
                              oracleColors[alert.provider as keyof typeof oracleColors],
                          }}
                        />
                        {providerNames[alert.provider as keyof typeof providerNames]}
                      </span>
                    )}
                    {alert.chain && (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 "
                          style={{
                            backgroundColor: chainColors[alert.chain as keyof typeof chainColors],
                          }}
                        />
                        {chainNames[alert.chain as keyof typeof chainNames]}
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    {editingId === alert.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleSaveEdit(alert)}
                          disabled={isUpdating}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          {t('common.save')}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-700">{conditionLabel}</span>
                    )}
                  </div>

                  {alert.last_triggered_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {t('alerts.list.lastTriggered')}:{' '}
                      {new Date(alert.last_triggered_at).toLocaleString('zh-CN')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(alert)}
                    disabled={isUpdating}
                    className={`relative inline-flex h-5 w-9 items-center  transition-colors ${
                      alert.is_active ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    title={alert.is_active ? t('alerts.list.disable') : t('alerts.list.enable')}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform  bg-white transition-transform ${
                        alert.is_active ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => handleEdit(alert)}
                    disabled={editingId === alert.id}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    title={t('common.edit')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>

                  {deleteConfirmId === alert.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(alert.id!)}
                        disabled={isDeleting}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        {t('alerts.list.confirm')}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(alert.id!)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title={t('common.delete')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
