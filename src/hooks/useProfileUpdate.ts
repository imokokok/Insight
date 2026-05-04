import { useState, useCallback } from 'react';

import { apiClient } from '@/lib/api';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useProfileUpdate');

export function useProfileUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateProfile = useCallback(async (data: Record<string, unknown>) => {
    setIsUpdating(true);
    setError(null);
    try {
      const result = await apiClient.put('/api/auth/profile', data);
      return result;
    } catch (err) {
      const appError = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to update profile', appError);
      setError(appError);
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { updateProfile, isUpdating, error };
}

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportData = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      const [profile, favorites, alerts, snapshots] = await Promise.all([
        apiClient.get('/api/auth/profile'),
        apiClient.get('/api/favorites'),
        apiClient.get('/api/alerts'),
        apiClient.get('/api/snapshots'),
      ]);
      return { profile, favorites, alerts, snapshots };
    } catch (err) {
      const appError = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to export data', appError);
      setError(appError);
      throw appError;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportData, isExporting, error };
}

export function useDeleteAccount() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteAccount = useCallback(async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await apiClient.post('/api/auth/delete-account', {});
    } catch (err) {
      const appError = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to delete account', appError);
      setError(appError);
      throw appError;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteAccount, isDeleting, error };
}
