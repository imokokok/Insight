'use client';

import { useState, useEffect, Suspense } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Mail, LogIn, AlertCircle, MailWarning } from 'lucide-react';

import { Button } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useUser, useAuthError, useAuthActions } from '@/stores/authStore';

interface ErrorInfo {
  message: string;
  type: 'default' | 'email_not_confirmed' | 'invalid_credentials';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const user = useUser();
  const error = useAuthError();
  const { signIn, signInWithOAuth } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    if (user) {
      router.push(redirectPath);
    }
  }, [user, router, redirectPath]);

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
      message: errorMessage,
      type: 'default',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorInfo(null);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setErrorInfo(parseError(signInError.message));
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    setErrorInfo(null);

    const { error: oauthError } = await signInWithOAuth(provider);

    if (oauthError) {
      setErrorInfo(parseError(oauthError.message));
      setIsLoading(false);
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

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleOAuthSignIn('google')}
                disabled={isLoading}
                className="w-full"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleOAuthSignIn('github')}
                disabled={isLoading}
                className="w-full"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                GitHub
              </Button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
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
