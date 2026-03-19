'use client';

import { useState, useCallback, useMemo } from 'react';
import { PriceAlert } from '@/lib/supabase/database.types';
import { useTranslations } from 'next-intl';

interface AlertBatchOperationsProps {
  selectedAlerts: string[];
  alerts: PriceAlert[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchEnable: () => void;
  onBatchDisable: () => void;
  onBatchDelete: () => void;
  isProcessing: boolean;
}

export function AlertBatchOperations({
  selectedAlerts,
  alerts,
  onSelectAll,
  onDeselectAll,
  onBatchEnable,
  onBatchDisable,
  onBatchDelete,
  isProcessing,
}: AlertBatchOperationsProps) {
  const t = useTranslations();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const selectedCount = selectedAlerts.length;
  const totalCount = alerts.length;
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const someSelected = selectedCount > 0 && selectedCount < totalCount;

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    onBatchDelete();
    setShowDeleteConfirm(false);
  }, [onBatchDelete]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const selectedActiveCount = useMemo(() => {
    return alerts.filter((a) => selectedAlerts.includes(a.id!) && a.is_active).length;
  }, [alerts, selectedAlerts]);

  const selectedInactiveCount = useMemo(() => {
    return alerts.filter((a) => selectedAlerts.includes(a.id!) && !a.is_active).length;
  }, [alerts, selectedAlerts]);

  if (selectedCount === 0) {
    return (
      <div className="flex items-center justify-between py-2 px-3 bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={allSelected ? onDeselectAll : onSelectAll}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">
            {t('alerts.batch.selectAll').replace('{count}', String(totalCount))}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-2 px-3 bg-blue-50 border border-blue-200">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) {
                input.indeterminate = someSelected;
              }
            }}
            onChange={allSelected ? onDeselectAll : onSelectAll}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-blue-900">
            {t('alerts.batch.selectedCount').replace('{count}', String(selectedCount))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedInactiveCount > 0 && (
            <button
              onClick={onBatchEnable}
              disabled={isProcessing}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {t('alerts.batch.enable')}
            </button>
          )}

          {selectedActiveCount > 0 && (
            <button
              onClick={onBatchDisable}
              disabled={isProcessing}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {t('alerts.batch.disable')}
            </button>
          )}

          {!showDeleteConfirm ? (
            <button
              onClick={handleDeleteClick}
              disabled={isProcessing}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {t('alerts.batch.delete')}
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleConfirmDelete}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
              >
                {t('actions.confirm')}
              </button>
              <button
                onClick={handleCancelDelete}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
              >
                {t('actions.cancel')}
              </button>
            </div>
          )}

          <button
            onClick={onDeselectAll}
            disabled={isProcessing}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title={t('alerts.batch.clearSelection')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700">
          {t('alerts.batch.deleteConfirm').replace('{count}', String(selectedCount))}
        </div>
      )}
    </div>
  );
}

export default AlertBatchOperations;
