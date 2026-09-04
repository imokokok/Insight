'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Mail, LogIn, AlertCircle, MailWarning } from 'lucide-react';

import { AuthPageLayout, AuthBrandLogo, AuthPageSuspense } from '@/app/auth/shared/AuthComponents';
import { isValidRedirectPath } from '@/app/auth/shared/isValidRedirectPath';
import { Button } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useUser, useAuthError, useAuthActions, useSession } from '@/stores/authStore';

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
  const { signIn, clearError } = useAuthActions();
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
    }
    setIsLoading(false);
  };

  const displayError = errorInfo?.message || error?.message;

  return (
    <AuthPageLayout>
      <div className="text-center mb-8">
        <AuthBrandLogo />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Login</h2>
        <p className="mt-2 text-sm text-slate-500">Welcome back! Please log in to your account.</p>
      </div>

      {displayError && (
        <div id="login-error" className="mb-6 border-l-2 border-danger-500 bg-danger-50 p-4">
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
                  className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  Resend Verification Email
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-400" />
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
              className="w-full border border-slate-300 py-3 pl-12 pr-4 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
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
            href={`/auth/forgot-password?redirect=${encodeURIComponent(redirectPath)}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
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

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link
          href={`/register?redirect=${encodeURIComponent(redirectPath)}`}
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Register now
        </Link>
      </p>
    </AuthPageLayout>
  );
}

export default function LoginContent() {
  return (
    <AuthPageSuspense>
      <LoginForm />
    </AuthPageSuspense>
  );
}
