'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { ArrowLeft, Check, CheckCircle, KeyRound, Loader2, Lock, XCircle } from 'lucide-react';

import {
  AuthPageLayout,
  AuthResultCard,
  AuthErrorAlert,
  AuthPageSuspense,
  GoToLoginButton,
} from '@/app/auth/shared/AuthComponents';
import { getSafeRedirectPath } from '@/app/auth/shared/isValidRedirectPath';
import { useAuthFormSubmit } from '@/app/auth/shared/useAuthFormSubmit';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { announceNavigationStart } from '@/lib/navigation/progress';
import { validatePassword } from '@/lib/security/passwordValidation';
import { useAuthActions } from '@/stores/authStore';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePassword } = useAuthActions();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { isLoading, isSuccess, error, submit, clearError, setError } = useAuthFormSubmit();
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const rawRedirect = searchParams.get('redirect') || undefined;
  const redirectPath = getSafeRedirectPath(rawRedirect);
  const passwordChecks = [
    { label: '8–128 characters', met: password.length >= 8 && password.length <= 128 },
    { label: 'Uppercase and lowercase', met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'A number', met: /\d/.test(password) },
    { label: 'A special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { getSession } = await import('@/lib/supabase/auth');
        const { session } = await getSession();
        setIsValidSession(!!session);
      } catch {
        setIsValidSession(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        announceNavigationStart();
        router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router, redirectPath]);

  const validateForm = () => {
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) return;

    await submit(() => updatePassword(password));
  };

  if (isValidSession === null) {
    return (
      <AuthPageLayout journey="reset" cardClassName="text-center">
        <div className="auth-pending-state" role="status">
          <Loader2 className="mx-auto mb-6 h-12 w-12 animate-spin text-blue-700" />
          <p className="auth-result-eyebrow">Recovery / link check</p>
          <h1 className="auth-result-title">Checking your reset link.</h1>
          <p className="auth-result-description">
            Confirming that this request belongs to your account.
          </p>
        </div>
      </AuthPageLayout>
    );
  }

  if (isValidSession === false) {
    return (
      <AuthPageLayout journey="reset" cardClassName="text-center">
        <AuthResultCard
          icon={XCircle}
          iconBgClass="bg-red-100"
          iconTextClass="text-red-600"
          eyebrow="Recovery / action needed"
          title="Invalid or Expired Link"
          description="This password reset link has expired or is invalid. Please request a new one."
        >
          <Link href="/auth/forgot-password" className="auth-primary-link">
            Request New Link
          </Link>
        </AuthResultCard>
      </AuthPageLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthPageLayout journey="reset" cardClassName="text-center">
        <AuthResultCard
          icon={CheckCircle}
          iconBgClass="bg-emerald-100"
          iconTextClass="text-emerald-600"
          eyebrow="Recovery / complete"
          title="Password Reset Successful"
          description="Your password has been reset successfully. Redirecting to login..."
        >
          <GoToLoginButton redirect={redirectPath} />
        </AuthResultCard>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout journey="reset">
      <div className="auth-record-heading mb-8">
        <span className="auth-form-kicker">
          <KeyRound className="h-4 w-4" aria-hidden="true" /> 04 / New credentials
        </span>
        <h1>Choose your new password.</h1>
        <p>Make it strong and unique. You’ll sign in again once it’s saved.</p>
      </div>

      {error && <AuthErrorAlert message={error} id="reset-password-error" />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
            New Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter new password"
            aria-invalid={!!error}
            aria-describedby={error ? 'reset-password-error' : undefined}
            className="w-full border border-slate-300 py-3 pl-12 pr-12 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="auth-password-guide" aria-label="Password requirements">
          <span className="auth-password-guide-title">Password checklist</span>
          <ul>
            {passwordChecks.map(({ label, met }) => (
              <li key={label} className={met ? 'is-met' : ''}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> {label}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Confirm Password
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
            aria-invalid={!!error}
            aria-describedby={error ? 'reset-password-error' : undefined}
            className="w-full border border-slate-300 py-3 pl-12 pr-12 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
          <span>{isLoading ? 'Resetting...' : 'Reset Password'}</span>
        </button>
      </form>
      <div className="mt-6 text-center">
        <Link
          href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
          className="auth-back-link"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
        </Link>
      </div>
    </AuthPageLayout>
  );
}

export default function ResetPasswordContent() {
  return (
    <AuthPageSuspense>
      <ResetPasswordForm />
    </AuthPageSuspense>
  );
}
