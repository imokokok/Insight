import { useState, useCallback } from 'react';

import { apiClient } from '@/lib/api/client/ApiClient';
import { createLogger } from '@/lib/utils/logger';
import { useAuthActions } from '@/stores/authStore';

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
      throw appError;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { updateProfile, isUpdating, error };
}

interface ProfileResponse {
  profile: Record<string, unknown>;
}

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportData = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      const profile = await apiClient.get<ProfileResponse>('/api/auth/profile');
      return { profile };
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
  const { signOut } = useAuthActions();

  const deleteAccount = useCallback(
    async (confirmation: string) => {
      setIsDeleting(true);
      setError(null);
      try {
        await apiClient.post('/api/auth/delete-account', { confirmation });
        // Account deleted — sign out to clear the now-invalid session.
        await signOut();
      } catch (err) {
        const appError = err instanceof Error ? err : new Error(String(err));
        logger.error('Failed to delete account', appError);
        setError(appError);
        throw appError;
      } finally {
        setIsDeleting(false);
      }
    },
    [signOut]
  );

  return { deleteAccount, isDeleting, error };
}
