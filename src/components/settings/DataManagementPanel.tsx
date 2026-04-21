'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { useRouter } from 'next/navigation';

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

import { queries, supabase } from '@/lib/supabase/client';
import { downloadBlob } from '@/lib/utils/download';
import { useUser, useAuthActions } from '@/stores/authStore';

interface ExportConfig {
  filename: string;
  data: unknown;
}

function exportToJson(config: ExportConfig): void {
  const { filename, data } = config;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const timestamp = new Date().toISOString().split('.')[0];
  downloadBlob(blob, `${filename}-${timestamp}.json`);
}

const LOCAL_STORAGE_PREFIXES = ['insight-', 'auth-store'];

export function DataManagementPanel() {
  const user = useUser();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [isExportingUserData, setIsExportingUserData] = useState(false);
  const [isExportingPrice, setIsExportingPrice] = useState(false);
  const [isExportingSnapshots, setIsExportingSnapshots] = useState(false);
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

  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = setTimeout(() => setSuccess(null), 3000);
  }, []);

  const exportUserData = async () => {
    if (!user) return;

    setIsExportingUserData(true);
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

      exportToJson({ filename: 'user-data', data: exportData });
      showSuccess('Data exported successfully');
    } catch {
      setError('Failed to export data');
    } finally {
      setIsExportingUserData(false);
    }
  };

  const exportPriceHistory = async () => {
    if (!user) return;

    setIsExportingPrice(true);
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

      exportToJson({ filename: 'price-history', data: exportData });
      showSuccess('Price history exported successfully');
    } catch {
      setError('Failed to export data');
    } finally {
      setIsExportingPrice(false);
    }
  };

  const exportSnapshots = async () => {
    if (!user) return;

    setIsExportingSnapshots(true);
    setError(null);

    try {
      const snapshots = await queries.getSnapshots(user.id);

      const exportData = {
        exportedAt: new Date().toISOString(),
        snapshots: snapshots,
        count: snapshots?.length || 0,
      };

      exportToJson({ filename: 'snapshots', data: exportData });
      showSuccess('Snapshots exported successfully');
    } catch {
      setError('Failed to export data');
    } finally {
      setIsExportingSnapshots(false);
    }
  };

  const clearLocalData = async () => {
    if (!confirm('Are you sure you want to clear all local data? This action cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      const keysToRemove: string[] = [];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      sessionStorage.clear();

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      showSuccess('Local data cleared successfully');
    } catch {
      setError('Failed to clear local data');
    } finally {
      setIsClearing(false);
    }
  };

  const deleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    setError(null);

    try {
      const confirmation = `DELETE ${user.email || user.id}`;
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(result.error || 'Failed to delete account');
        return;
      }

      await signOut();
      router.push('/');
    } catch {
      setError('Failed to delete account');
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
            Data Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">Export and manage your data</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-success-50 border border-success-200 rounded-lg text-success-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary-100 flex items-center justify-center">
                    <FileJson className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Export User Data</div>
                    <div className="text-sm text-gray-500">
                      Download all your personal data as JSON
                    </div>
                  </div>
                </div>
                <button
                  onClick={exportUserData}
                  disabled={isExportingUserData}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  {isExportingUserData ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-success-100 flex items-center justify-center">
                    <Download className="w-5 h-5 text-success-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Export Price History</div>
                    <div className="text-sm text-gray-500">Download recent price data</div>
                  </div>
                </div>
                <button
                  onClick={exportPriceHistory}
                  disabled={isExportingPrice}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 active:bg-green-800 transition-all duration-200 disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  {isExportingPrice ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-purple-100 flex items-center justify-center">
                    <Database className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Export Snapshots</div>
                    <div className="text-sm text-gray-500">Download your saved snapshots</div>
                  </div>
                </div>
                <button
                  onClick={exportSnapshots}
                  disabled={isExportingSnapshots}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-all duration-200 disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  {isExportingSnapshots ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export
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
            Clear Data
          </h2>
          <p className="text-sm text-gray-500 mt-1">Clear local cached data</p>
        </div>

        <div className="p-6">
          <div className="p-4 bg-warning-50 border border-yellow-200 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Note</p>
                <p className="mt-1">
                  This will clear all locally cached data. Your account data will remain intact.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={clearLocalData}
            disabled={isClearing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-yellow-300 text-warning-700 rounded-lg hover:bg-warning-50 hover:border-yellow-400 active:bg-warning-100 transition-all duration-200 disabled:opacity-50 text-sm font-medium"
          >
            {isClearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Clear Local Data
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-danger-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-danger-100 bg-danger-50/80">
          <h2 className="text-lg font-semibold text-danger-900 flex items-center gap-2">
            <UserX className="w-5 h-5 text-danger-600" />
            Danger Zone
          </h2>
          <p className="text-sm text-danger-700 mt-1">Irreversible actions</p>
        </div>

        <div className="p-6">
          {!showDeleteConfirm ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                This action is permanent and cannot be undone. All your data will be deleted.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 active:bg-danger-800 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
              >
                <UserX className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-800 font-medium mb-2">
                  Are you sure you want to delete your account?
                </p>
                <p className="text-sm text-danger-700">Type DELETE to confirm</p>
              </div>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-4 py-2.5 border border-red-300 rounded-lg focus:ring-2 focus:ring-danger-500/20 focus:border-danger-500 outline-none transition-all duration-200"
              />

              <div className="flex gap-3">
                <button
                  onClick={deleteAccount}
                  disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 active:bg-danger-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm hover:shadow-md"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserX className="w-4 h-4" />
                  )}
                  Confirm Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all duration-200 text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
