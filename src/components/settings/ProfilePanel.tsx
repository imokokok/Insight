'use client';

import { useState, useEffect } from 'react';

import { Calendar, CheckCircle, Key, Loader2, Mail, Save, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useProfileUpdate } from '@/hooks/useProfileUpdate';
import { updatePassword, signIn } from '@/lib/supabase/auth';
import { useUser, useProfile, useAuthActions } from '@/stores/authStore';

import { AvatarUploader } from './AvatarUploader';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    return {
      valid: false,
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    };
  }
  return { valid: true, message: '' };
}

function formatMemberSince(date: Date | string | undefined): string {
  if (!date) return 'Unknown';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const inputClassName =
  'w-full border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15';

const passwordInputClassName =
  'w-full border border-slate-300 bg-white py-3 pl-12 pr-12 text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15';

export function ProfilePanel() {
  const user = useUser();
  const profile = useProfile();
  const { refreshProfile } = useAuthActions();
  const { updateProfile, isUpdating: isSaving } = useProfileUpdate();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
    // Depend on the primitive fields rather than the `profile` object reference,
    // which can change on every render (e.g. when a parent passes a new object)
    // and would otherwise clobber in-flight local edits to displayName/avatarUrl.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name, profile?.avatar_url]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setError(null);
    setSuccess(null);

    try {
      await updateProfile({ display_name: displayName || null });
      setSuccess('Profile saved successfully');
      await refreshProfile();
    } catch {
      setError('Failed to save profile');
    }
  };

  const handleAvatarUpdate = async (url: string) => {
    setAvatarUrl(url);
    await refreshProfile();
  };

  const handleAvatarError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleAvatarSuccess = (message: string) => {
    setSuccess(message);
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    setIsChangingPassword(true);
    setError(null);

    try {
      if (!user?.email) {
        setError('Unable to verify current password');
        return;
      }

      const { error: reauthError } = await signIn(user.email, currentPassword);
      if (reauthError) {
        setError('Current password is incorrect');
        return;
      }

      const { error: updateError } = await updatePassword(newPassword);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess('Password updated successfully');
        setShowPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isVerified = Boolean(user?.email_confirmed_at);

  return (
    <div className="space-y-6">
      {/* Profile Settings Card */}
      <section className="settings-record">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Profile Settings</h2>
              <p className="text-sm text-slate-500">Manage your account information</p>
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

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <AvatarUploader
              currentAvatarUrl={avatarUrl || profile?.avatar_url}
              userId={user?.id || ''}
              onAvatarUpdate={handleAvatarUpdate}
              onError={handleAvatarError}
              onSuccess={handleAvatarSuccess}
            />

            <div className="flex-1 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-3 border-y border-slate-900/10 bg-white/45 p-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Member since</p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatMemberSince(profile?.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-y border-slate-900/10 bg-white/45 p-3">
                  <ShieldCheck
                    className={`w-4 h-4 ${isVerified ? 'text-emerald-500' : 'text-amber-500'}`}
                  />
                  <div>
                    <p className="text-xs text-slate-500">Email status</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-900">
                        {isVerified ? 'Verified' : 'Unverified'}
                      </p>
                      {isVerified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="profile-display-name"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Display Name
                  </label>
                  <input
                    id="profile-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-email"
                    className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4 text-slate-400" />
                    Email
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full cursor-not-allowed border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Email address cannot be changed</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              leftIcon={
                isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )
              }
              className="rounded-sm"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </section>

      {/* Password Management Card */}
      <section className="settings-record">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Password Management</h2>
              <p className="text-sm text-slate-500">Change your account password</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!showPasswordForm ? (
            <Button
              variant="secondary"
              leftIcon={<Key className="w-4 h-4" />}
              onClick={() => setShowPasswordForm(true)}
              className="rounded-sm border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50/40"
            >
              Change Password
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="profile-current-password"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Current Password
                </label>
                <PasswordInput
                  id="profile-current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className={passwordInputClassName}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-new-password"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  New Password
                </label>
                <PasswordInput
                  id="profile-new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={passwordInputClassName}
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Must be at least {PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, and
                  number
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-confirm-password"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Confirm Password
                </label>
                <PasswordInput
                  id="profile-confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={passwordInputClassName}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  leftIcon={
                    isChangingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )
                  }
                  className="rounded-sm"
                >
                  Update Password
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="rounded-sm border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
