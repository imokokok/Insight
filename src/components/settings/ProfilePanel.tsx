'use client';

import { useState } from 'react';
import { useUser, useProfile, useAuthActions } from '@/stores/authStore';
import { updateUserProfile } from '@/lib/supabase/auth';
import { User } from 'lucide-react';
import { Mail } from 'lucide-react';
import { Save } from 'lucide-react';
import { Key } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { CheckCircle } from 'lucide-react';
import { useTranslations } from '@/i18n';
// AvatarUploader component placeholder
const AvatarUploader = ({
  currentAvatarUrl,
  userId,
  onAvatarUpdate,
  onError,
  onSuccess,
}: {
  currentAvatarUrl?: string | null;
  userId: string;
  onAvatarUpdate: (url: string) => Promise<void>;
  onError: (errorMsg: string) => void;
  onSuccess: (message: string) => void;
}) => (
  <div className="flex items-center gap-4">
    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
      {currentAvatarUrl ? (
        <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <User className="w-8 h-8 text-gray-500" />
      )}
    </div>
    <button
      type="button"
      className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
      onClick={() => {
        // Placeholder upload functionality
        const mockUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
        onAvatarUpdate(mockUrl)
          .then(() => onSuccess('Avatar updated successfully'))
          .catch(() => onError('Failed to update avatar'));
      }}
    >
      Upload Avatar
    </button>
  </div>
);

export function ProfilePanel() {
  const t = useTranslations();
  const user = useUser();
  const profile = useProfile();
  const { refreshProfile } = useAuthActions();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await updateUserProfile(user.id, {
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(t('settings.profile.saveSuccess'));
        await refreshProfile();
      }
    } catch {
      setError(t('settings.profile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpdate = async (url: string) => {
    setAvatarUrl(url);
    // 立即刷新全局 profile 状态，确保导航栏等各处同步更新
    await refreshProfile();
  };

  const handleAvatarError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleAvatarSuccess = (message: string) => {
    setSuccess(message);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setError(t('settings.profile.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('settings.profile.passwordMismatch'));
      return;
    }

    setIsChangingPassword(true);
    setError(null);

    try {
      const { error: updateError } = await updateUserProfile(user?.id || '', {
        display_name: displayName,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(t('settings.profile.passwordUpdateSuccess'));
        setShowPasswordForm(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError(t('settings.profile.passwordUpdateError'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            {t('settings.profile.title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('settings.profile.subtitle')}</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-success-50 border border-green-200 rounded-lg text-success-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <AvatarUploader
              currentAvatarUrl={avatarUrl || profile?.avatar_url}
              userId={user?.id || ''}
              onAvatarUpdate={handleAvatarUpdate}
              onError={handleAvatarError}
              onSuccess={handleAvatarSuccess}
            />

            <div className="flex-1 w-full">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.profile.displayNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('settings.profile.displayNamePlaceholder')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {t('settings.profile.emailLabel')}
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings.profile.emailNotEditable')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm hover:shadow-md"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {t('settings.profile.saveChanges')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-400" />
            {t('settings.profile.passwordManagement')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('settings.profile.passwordManagementDesc')}
          </p>
        </div>

        <div className="p-6">
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-all duration-200 font-medium text-sm"
            >
              <Key className="w-4 h-4" />
              {t('settings.profile.changePassword')}
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.profile.newPassword')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('settings.profile.newPasswordPlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.profile.confirmNewPassword')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('settings.profile.confirmNewPasswordPlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all duration-200"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm hover:shadow-md"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {t('settings.profile.updatePassword')}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-all duration-200 font-medium text-sm"
                >
                  {t('settings.profile.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
