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

import { Button } from '@/components/ui/Button';
import { useDataExport, useDeleteAccount } from '@/hooks/useProfileUpdate';
import { apiClient } from '@/lib/api/client/ApiClient';
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

const LOCAL_STORAGE_PREFIXES = ['insight-', 'auth-store', 'user_preferences'];

export function DataManagementPanel() {
  const user = useUser();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { exportData, isExporting: isExportingUserData } = useDataExport();
  const { deleteAccount: deleteAccountApi, isDeleting: isDeletingAccount } = useDeleteAccount();
  const [isExportingPrice, setIsExportingPrice] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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

    setError(null);

    try {
      const result = await exportData();

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
        },
        profile: result.profile,
      };

      exportToJson({ filename: 'user-data', data: exportPayload });
      showSuccess('Data exported successfully');
    } catch {
      setError('Failed to export data');
    }
  };

  const exportPriceHistory = async () => {
    if (!user) return;

    setIsExportingPrice(true);
    setError(null);

    try {
      const response = await apiClient.get<{
        exportedAt: string;
        records: unknown[];
        count: number;
      }>('/api/price-records/export');

      const exportPayload = {
        exportedAt: response.data?.exportedAt ?? new Date().toISOString(),
        records: response.data?.records ?? [],
        count: response.data?.count ?? 0,
      };

      exportToJson({ filename: 'price-history', data: exportPayload });
      showSuccess('Price history exported successfully');
    } catch {
      setError('Failed to export data');
    } finally {
      setIsExportingPrice(false);
    }
  };

  const clearLocalData = async () => {
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

      setShowClearConfirm(false);
      showSuccess('Local data cleared successfully');
    } catch {
      setError('Failed to clear local data');
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;

    setError(null);

    try {
      const confirmation = `DELETE ${user.email ?? user.id}`;
      await deleteAccountApi(confirmation);

      await signOut();
      router.push('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <section className="settings-record">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Data Management</h2>
              <p className="text-sm text-slate-500">Export and manage your data</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="border-l-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 border-l-2 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="space-y-3">
            <div className="border-y border-slate-900/10 bg-white/45 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
                    <FileJson className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Export User Data</div>
                    <div className="text-sm text-slate-500">
                      Download all your personal data as JSON
                    </div>
                  </div>
                </div>
                <Button
                  onClick={exportUserData}
                  disabled={isExportingUserData}
                  leftIcon={
                    isExportingUserData ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )
                  }
                  className="rounded-sm"
                >
                  Export
                </Button>
              </div>
            </div>

            <div className="border-y border-slate-900/10 bg-white/45 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-emerald-200 bg-emerald-50">
                    <Download className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Export Price History</div>
                    <div className="text-sm text-slate-500">Download recent price data</div>
                  </div>
                </div>
                <Button
                  onClick={exportPriceHistory}
                  disabled={isExportingPrice}
                  leftIcon={
                    isExportingPrice ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )
                  }
                  className="rounded-sm bg-emerald-600 hover:bg-emerald-700"
                >
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-record">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-amber-200 bg-amber-50">
              <Trash2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Clear Data</h2>
              <p className="text-sm text-slate-500">Clear local cached data</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 border-l-2 border-amber-500 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Note</p>
                <p className="mt-1">
                  This will clear all locally cached data. Your account data will remain intact.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => setShowClearConfirm(true)}
            disabled={isClearing}
            leftIcon={
              isClearing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )
            }
            className="rounded-sm border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            Clear Local Data
          </Button>
        </div>
      </section>

      <section className="settings-record border-red-300">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-red-200 bg-red-100">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
              <p className="text-sm text-red-700">Irreversible actions</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!showDeleteConfirm ? (
            <div>
              <p className="text-sm text-slate-600 mb-4">
                This action is permanent and cannot be undone. All your data will be deleted.
              </p>
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                leftIcon={<UserX className="w-4 h-4" />}
                className="rounded-sm"
              >
                Delete Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-l-2 border-red-500 bg-red-50 p-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  Are you sure you want to delete your account?
                </p>
                <p className="text-sm text-red-700">Type DELETE to confirm</p>
              </div>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full border border-red-300 px-4 py-2.5 outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
              />

              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || deleteConfirmText !== 'DELETE'}
                  leftIcon={
                    isDeletingAccount ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserX className="w-4 h-4" />
                    )
                  }
                  className="rounded-sm"
                >
                  Confirm Delete
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  leftIcon={<X className="w-4 h-4" />}
                  className="rounded-sm border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="mx-4 w-full max-w-md overflow-hidden border border-slate-900/15 bg-[#f8f7f4]">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-amber-200 bg-amber-100">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Clear Local Data</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Are you sure you want to clear all local cached data? This action cannot be
                    undone. Your account data will remain intact.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-sm border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={clearLocalData}
                disabled={isClearing}
                leftIcon={
                  isClearing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )
                }
                className="rounded-sm bg-amber-600 hover:bg-amber-700"
              >
                Clear Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
