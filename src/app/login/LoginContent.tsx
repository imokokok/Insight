'use client';

import { useState, useEffect, Suspense } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Mail, LogIn, AlertCircle, MailWarning } from 'lucide-react';

import { Button } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useUser, useAuthError, useAuthActions, useSession } from '@/stores/authStore';

const ALLOWED_REDIRECT_PATHS = [
  '/',
  '/dashboard',
  '/settings',
  '/profile',
  '/alerts',
  '/favorites',
  '/snapshots',
  '/price-query',
  '/cross-chain',
  '/cross-oracle',
];

function isValidRedirectPath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  if (path.startsWith('//') || path.startsWith('http://') || path.startsWith('https://')) {
    return false;
  }

  return ALLOWED_REDIRECT_PATHS.some(
    (allowed) => path === allowed || path.startsWith(allowed + '/')
  );
}

interface ErrorInfo {
  message: string;
  type: 'default' | 'email_not_confirmed' | 'invalid_credentials';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirectPath = isValidRedirectPath(rawRedirect) ? rawRedirect : '/';
  const user = useUser();
  const session = useSession();
  const error = useAuthError();
  const { signIn, signInWithOAuth, clearError } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (user && session) {
      clearError();
      router.push(redirectPath);
    }
  }, [user, session, router, redirectPath, clearError]);

  const parseError = (errorMessage: string): ErrorInfo => {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes('email not confirmed') || lowerError.includes('email_not_confirmed')) {
      return {
        message: 'Please verify your email address before logging in.',
        type: 'email_not_confirmed',
      };
    }

    if (
      lowerError.includes('invalid login credentials') ||
      lowerError.includes('invalid credentials')
    ) {
      return {
        message: 'Invalid email or password. Please try again.',
        type: 'invalid_credentials',
      };
    }

    return {
      message: 'An error occurred during login. Please try again.',
      type: 'default',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorInfo(null);
    clearError();

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setErrorInfo(parseError(signInError.message));
      setIsLoading(false);
    } else {
      setErrorInfo(null);
    }
  };

  const displayError = errorInfo?.message || error?.message;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 rounded-lg">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 p-8 shadow-sm rounded-lg">
          <div className="text-center mb-8">
            <Link href={`/`} className="inline-block">
              <h1 className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                Insight
              </h1>
            </Link>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Login</h2>
            <p className="mt-2 text-sm text-gray-500">
              Welcome back! Please log in to your account.
            </p>
          </div>

          {displayError && (
            <div
              id="login-error"
              className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg"
            >
              <div className="flex items-start gap-3">
                {errorInfo?.type === 'email_not_confirmed' ? (
                  <MailWarning className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-danger-600">{displayError}</p>
                  {errorInfo?.type === 'email_not_confirmed' && (
                    <Link
                      href={`/auth/resend-verification?email=${encodeURIComponent(email)}`}
                      className="mt-2 inline-block text-sm text-primary-600 hover:text-primary-700 font-medium underline"
                    >
                      Resend Confirmation Email
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
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
                  placeholder="Enter your email"
                  aria-invalid={!!displayError}
                  aria-describedby={displayError ? 'login-error' : undefined}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors rounded-md"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                aria-invalid={!!displayError}
                aria-describedby={displayError ? 'login-error' : undefined}
              />
            </div>

            <div className="flex items-center justify-between">
              <Link
                href={`/auth/forgot-password`}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              leftIcon={<LogIn className="w-5 h-5" />}
              className="w-full"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link
              href={`/register`}
              className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginContent() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent animate-spin mx-auto mb-4 rounded-full" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
