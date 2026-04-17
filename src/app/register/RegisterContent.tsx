'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Mail, User, UserPlus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

import { PasswordInput } from '@/components/ui/PasswordInput';
import { useUser, useAuthLoading, useAuthError, useAuthActions } from '@/stores/authStore';

export default function RegisterContent() {
  const router = useRouter();
  const user = useUser();
  const loading = useAuthLoading();
  const error = useAuthError();
  const { signUp } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user && !isSuccess) {
      router.push(`/`);
    }
  }, [user, router, isSuccess]);

  const validateForm = () => {
    if (!email.trim()) {
      setLocalError('auth.register.error.emailRequired');
      return false;
    }
    if (!password) {
      setLocalError('auth.register.error.passwordRequired');
      return false;
    }
    if (password.length < 6) {
      setLocalError('auth.register.error.passwordMinLength');
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError('auth.register.error.passwordMismatch');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const { error: signUpError } = await signUp(email, password, displayName || undefined);

    if (signUpError) {
      setLocalError(signUpError.message);
      setIsLoading(false);
    } else {
      setIsSuccess(true);
      setIsLoading(false);
    }
  };

  const displayError = localError || error?.message;

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-insight px-4 py-12 rounded-lg">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 p-8 text-center rounded-lg">
            <div className="w-16 h-16 bg-success-100 flex items-center justify-center mx-auto mb-6 rounded-lg">
              <CheckCircle className="w-8 h-8 text-success-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {'auth.register.success.title'}
            </h2>
            <p className="text-gray-500 mb-4">Verification email has been sent to {email}</p>
            <div className="bg-primary-50 border border-primary-200 p-4 mb-6 text-left rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-primary-800">
                  <p className="font-medium mb-1">{'auth.register.success.nextSteps'}：</p>
                  <ol className="list-decimal list-inside space-y-1 text-primary-700">
                    <li>{'auth.register.success.checkInbox'}</li>
                    <li>{'auth.register.success.clickLink'}</li>
                    <li>{'auth.register.success.goBackLogin'}</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Link
                href={`/en/login`}
                className="block w-full px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors rounded-md"
              >
                {'auth.register.success.goToLogin'}
              </Link>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setDisplayName('');
                }}
                className="w-full px-6 py-3 border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors rounded-md"
              >
                {'auth.register.success.useOtherEmail'}
              </button>
            </div>
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
            <Link href={`/en`} className="inline-block">
              <h1 className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                Insight
              </h1>
            </Link>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">{'auth.register.title'}</h2>
            <p className="mt-2 text-sm text-gray-500">{'auth.register.subtitle'}</p>
          </div>

          {displayError && (
            <div
              id="register-error"
              className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger-600">{displayError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                {'auth.register.displayNameLabel'}{' '}
                <span className="text-gray-400">{'auth.register.displayNameOptional'}</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={'auth.register.displayNamePlaceholder'}
                  aria-invalid={!!displayError}
                  aria-describedby={displayError ? 'register-error' : undefined}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors rounded-md"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {'auth.register.emailLabel'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={'auth.register.emailPlaceholder'}
                  aria-invalid={!!displayError}
                  aria-describedby={displayError ? 'register-error' : undefined}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors rounded-md"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {'auth.register.passwordLabel'}
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={'auth.register.passwordPlaceholder'}
                aria-invalid={!!displayError}
                aria-describedby={displayError ? 'register-error' : undefined}
                className="w-full pl-12 pr-12 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors rounded-md"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {'auth.register.confirmPasswordLabel'}
              </label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder={'auth.register.confirmPasswordPlaceholder'}
                aria-invalid={!!displayError}
                aria-describedby={displayError ? 'register-error' : undefined}
                className="w-full pl-12 pr-12 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors rounded-md"
              />
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 rounded-md"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                <span>{'auth.register.termsAgreementPrefix'}</span>
                <Link
                  href={`/en/terms`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {'auth.register.terms'}
                </Link>
                <span>{'auth.register.termsAgreementMiddle'}</span>
                <Link
                  href={`/en/privacy`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {'auth.register.privacy'}
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              <span>
                {isLoading || loading ? 'auth.register.submitting' : 'auth.register.submit'}
              </span>
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            {'auth.register.hasAccount'}{' '}
            <Link
              href={`/en/login`}
              className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              {'auth.register.loginNow'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
