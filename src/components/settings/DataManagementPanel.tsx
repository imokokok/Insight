'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useAuthActions } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { queries } from '@/lib/supabase/client';
import {
  Database,
  Download,
  Trash2,
  UserX,
  FileJson,
  AlertTriangle,
  Loader2,
  CheckCircle,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export function DataManagementPanel() {
  const t = useTranslations();
  const user = useUser();
  const { signOut } = useAuthActions();
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const showSuccess = (message: string) => {
    setSuccess(message);
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = setTimeout(() => setSuccess(null), 3000);
  };

  const exportUserData = async () => {
    if (!user) return;

    setIsExporting(true);
    setError(null);

    try {
      const [profileResult, favoritesResult, alertsResult, snapshotsResult] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).single(),
        queries.getFavorites(user.id),
        queries.getAlerts(user.id),
        queries.getSnapshots(user.id),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
        },
        profile: profileResult.data,
        favorites: favoritesResult,
        alerts: alertsResult,
        snapshots: snapshotsResult,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess(t('settings.data.exportSuccess'));
    } catch (_err) {
      setError(t('settings.data.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const exportPriceHistory = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('price_records')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10000);

      if (queryError) throw queryError;

      const exportData = {
        exportedAt: new Date().toISOString(),
        records: data,
        count: data?.length || 0,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `price-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess(t('settings.data.priceHistoryExportSuccess'));
    } catch (_err) {
      setError(t('settings.data.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const exportSnapshots = async () => {
    if (!user) return;

    setIsExporting(true);
    setError(null);

    try {
      const snapshots = await queries.getSnapshots(user.id);

      const exportData = {
        exportedAt: new Date().toISOString(),
        snapshots: snapshots,
        count: snapshots?.length || 0,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapshots-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess(t('settings.data.snapshotsExportSuccess'));
    } catch (_err) {
      setError(t('settings.data.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const clearLocalData = async () => {
    if (!confirm(t('settings.data.clearLocalDataConfirm'))) {
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      localStorage.clear();
      sessionStorage.clear();

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      showSuccess(t('settings.data.clearLocalDataSuccess'));
    } catch (_err) {
      setError(t('settings.data.clearLocalDataError'));
    } finally {
      setIsClearing(false);
    }
  };

  const deleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    setError(null);

    try {
      await queries.deleteAllFavorites(user.id);
      await queries.deleteAllAlerts(user.id);
      await queries.deleteAllSnapshots(user.id);

      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError) {
        setError(t('settings.data.deleteAccountError'));
        return;
      }

      await signOut();
      window.location.href = '/';
    } catch (_err) {
      setError(t('settings.data.deleteAccountError'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-400" />
            {t('settings.data.title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('settings.data.subtitle')}</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileJson className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {t('settings.data.exportUserData')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('settings.data.exportUserDataDesc')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={exportUserData}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {t('settings.data.export')}
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Download className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {t('settings.data.exportPriceHistory')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('settings.data.exportPriceHistoryDesc')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={exportPriceHistory}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-all duration-200 disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {t('settings.data.export')}
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Database className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {t('settings.data.exportSnapshots')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('settings.data.exportSnapshotsDesc')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={exportSnapshots}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-all duration-200 disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {t('settings.data.export')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-gray-400" />
            {t('settings.data.clearData')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('settings.data.clearDataDesc')}</p>
        </div>

        <div className="p-6">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">{t('settings.data.note')}</p>
                <p className="mt-1">{t('settings.data.clearDataWarning')}</p>
              </div>
            </div>
          </div>

          <button
            onClick={clearLocalData}
            disabled={isClearing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 hover:border-yellow-400 active:bg-yellow-100 transition-all duration-200 disabled:opacity-50 text-sm font-medium"
          >
            {isClearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {t('settings.data.clearLocalData')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 bg-red-50/80">
          <h2 className="text-lg font-semibold text-red-900 flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-600" />
            {t('settings.data.dangerZone')}
          </h2>
          <p className="text-sm text-red-700 mt-1">{t('settings.data.dangerZoneDesc')}</p>
        </div>

        <div className="p-6">
          {!showDeleteConfirm ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                {t('settings.data.deleteAccountWarning')}
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
              >
                <UserX className="w-4 h-4" />
                {t('settings.data.deleteAccount')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium mb-2">
                  {t('settings.data.deleteAccountConfirm')}
                </p>
                <p className="text-sm text-red-700">
                  {t('settings.data.deleteAccountConfirmHint')}
                </p>
              </div>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={t('settings.data.deleteAccountConfirmPlaceholder')}
                className="w-full px-4 py-2.5 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all duration-200"
              />

              <div className="flex gap-3">
                <button
                  onClick={deleteAccount}
                  disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm hover:shadow-md"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserX className="w-4 h-4" />
                  )}
                  {t('settings.data.confirmDeleteAccount')}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all duration-200 text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  {t('settings.data.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
