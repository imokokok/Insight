'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { updateUserProfile } from '@/lib/supabase/auth';
import { User, Mail, Camera, Save, Key, Loader2, CheckCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

export function ProfilePanel() {
  const { t } = useI18n();
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(t('settings.profile.invalidImageType'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError(t('settings.profile.imageSizeExceeded'));
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        setError(t('settings.profile.uploadError') + uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      setAvatarUrl(publicUrl + '?t=' + Date.now());

      const { error: updateError } = await updateUserProfile(user.id, {
        avatar_url: publicUrl,
      });

      if (updateError) {
        setError(t('settings.profile.avatarUpdateError'));
      } else {
        setSuccess(t('settings.profile.avatarUpdateSuccess'));
        await refreshProfile();
      }
    } catch {
      setError(t('settings.profile.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
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
      <div className="bg-white  border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            {t('settings.profile.title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('settings.profile.subtitle')}</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200  text-red-700 text-sm">{error}</div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200  text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24  bg-gray-100 overflow-hidden border-2 border-gray-200">
                {avatarUrl || profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl || profile?.avatar_url || ''}
                    alt={t('settings.profile.avatarLabel')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-gray-300" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600  flex items-center justify-center text-white  hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {t('settings.profile.avatarLabel')}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t('settings.profile.avatarHint')}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.profile.displayNameLabel')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('settings.profile.displayNamePlaceholder')}
              className="w-full px-4 py-2.5 border border-gray-200  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
              className="w-full px-4 py-2.5 border border-gray-200  bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">{t('settings.profile.emailNotEditable')}</p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white  hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
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

      <div className="bg-white  border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
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
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700  hover:bg-gray-50 transition-colors font-medium text-sm"
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
                  className="w-full px-4 py-2.5 border border-gray-200  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                  className="w-full px-4 py-2.5 border border-gray-200  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white  hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm"
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
                  className="px-4 py-2.5 border border-gray-200 text-gray-700  hover:bg-gray-50 transition-colors font-medium text-sm"
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
