import { useState, useCallback } from 'react';

import { apiClient } from '@/lib/api';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useProfileUpdate');

export function useProfileUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProfile = useCallback(async (data: Record<string, unknown>) => {
    setIsUpdating(true);
    try {
      const result = await apiClient.put('/api/auth/profile', data);
      return result;
    } catch (err) {
      const appError = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to update profile', appError);
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { updateProfile, isUpdating };
}

interface ProfileResponse {
  profile: Record<string, unknown>;
}

interface AlertsResponse {
  alerts: unknown[];
}

interface SnapshotsResponse {
  snapshots: unknown[];
}

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportData = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      const [profile, alerts, snapshots] = await Promise.all([
        apiClient.get<ProfileResponse>('/api/auth/profile'),
        apiClient.get<AlertsResponse>('/api/alerts'),
        apiClient.get<SnapshotsResponse>('/api/snapshots'),
      ]);
      return { profile, alerts, snapshots };
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

  const deleteAccount = useCallback(async (confirmation: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      await apiClient.post('/api/auth/delete-account', { confirmation });
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
