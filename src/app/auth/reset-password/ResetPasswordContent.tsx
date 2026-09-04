'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Lock, Loader2, CheckCircle, XCircle } from 'lucide-react';

import {
  AuthPageLayout,
  AuthBrandLogo,
  AuthResultCard,
  AuthErrorAlert,
  AuthPageSuspense,
  GoToLoginButton,
} from '@/app/auth/shared/AuthComponents';
import { useAuthFormSubmit } from '@/app/auth/shared/useAuthFormSubmit';
import { PasswordInput } from '@/components/ui/PasswordInput';
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
  const redirectParam = searchParams.get('redirect') || undefined;

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
        router.push(
          redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'
        );
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router, redirectParam]);

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
      <AuthPageLayout cardClassName="text-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Validating session...</p>
        </div>
      </AuthPageLayout>
    );
  }

  if (isValidSession === false) {
    return (
      <AuthPageLayout cardClassName="text-center">
        <AuthResultCard
          icon={XCircle}
          iconBgClass="bg-red-100"
          iconTextClass="text-red-600"
          title="Invalid or Expired Link"
          description="This password reset link has expired or is invalid. Please request a new one."
        >
          <Link
            href="/auth/forgot-password"
            className="block w-full px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors rounded-xl"
          >
            Request New Link
          </Link>
        </AuthResultCard>
      </AuthPageLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthPageLayout cardClassName="text-center">
        <AuthResultCard
          icon={CheckCircle}
          iconBgClass="bg-emerald-100"
          iconTextClass="text-emerald-600"
          title="Password Reset Successful"
          description="Your password has been reset successfully. Redirecting to login..."
        >
          <GoToLoginButton redirect={redirectParam} />
        </AuthResultCard>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout>
      <div className="text-center mb-8">
        <AuthBrandLogo />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Reset Password</h2>
        <p className="mt-2 text-sm text-slate-500">Enter your new password below</p>
      </div>

      {error && <AuthErrorAlert message={error} id="reset-password-error" />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
            New Password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter new password"
            aria-invalid={!!error}
            aria-describedby={error ? 'reset-password-error' : undefined}
            className="w-full pl-12 pr-12 py-3 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors rounded-xl"
          />
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
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
            aria-invalid={!!error}
            aria-describedby={error ? 'reset-password-error' : undefined}
            className="w-full pl-12 pr-12 py-3 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors rounded-xl"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
          <span>{isLoading ? 'Resetting...' : 'Reset Password'}</span>
        </button>
      </form>
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
