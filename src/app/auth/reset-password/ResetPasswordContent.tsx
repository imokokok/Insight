'use client';

import { useState, Suspense, useEffect } from 'react';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { Lock, Loader2, CheckCircle, XCircle } from 'lucide-react';

import { PasswordInput } from '@/components/ui/PasswordInput';
import { validatePassword } from '@/lib/security/passwordValidation';
import { useAuthActions } from '@/stores/authStore';

function ResetPasswordForm() {
  const _searchParams = useSearchParams();
  const router = useRouter();
  const { updatePassword } = useAuthActions();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

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
    setError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    const { error: updateError } = await updatePassword(password);

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        router.push(`/login`);
      }, 3000);
      setIsLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-insight px-4 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-insight px-4 py-12 rounded-lg">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 p-8 text-center rounded-lg">
            <div className="w-16 h-16 bg-danger-100 flex items-center justify-center mx-auto mb-6 rounded-lg">
              <XCircle className="w-8 h-8 text-danger-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid or Expired Link</h2>
            <p className="text-gray-500 mb-6">
              This password reset link has expired or is invalid. Please request a new one.
            </p>
            <Link
              href={`/auth/forgot-password`}
              className="block w-full px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors rounded-md"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-insight px-4 py-12 rounded-lg">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 p-8 text-center rounded-lg">
            <div className="w-16 h-16 bg-success-100 flex items-center justify-center mx-auto mb-6 rounded-lg">
              <CheckCircle className="w-8 h-8 text-success-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Reset Successful</h2>
            <p className="text-gray-500 mb-6">
              Your password has been reset successfully. Redirecting to login...
            </p>
            <Link
              href={`/login`}
              className="block w-full px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors rounded-md"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-insight px-4 py-12 rounded-lg">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 p-8 rounded-lg">
          <div className="text-center mb-8">
            <Link href={`/`} className="inline-block">
              <h1 className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                Insight
              </h1>
            </Link>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Reset Password</h2>
            <p className="mt-2 text-sm text-gray-500">Enter your new password below</p>
          </div>

          {error && (
            <div
              id="reset-password-error"
              className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg"
            >
              <p className="text-sm text-danger-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full pl-12 pr-12 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-primary-600 transition-colors rounded-md"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
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
                className="w-full pl-12 pr-12 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-primary-600 transition-colors rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              <span>{isLoading ? 'Resetting...' : 'Reset Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordContent() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-insight px-4 rounded-lg">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
