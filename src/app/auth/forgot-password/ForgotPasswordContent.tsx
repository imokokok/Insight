'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Mail, Loader2, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';

import {
  AuthPageLayout,
  AuthBrandLogo,
  AuthResultCard,
  AuthErrorAlert,
  AuthPageSuspense,
  GoToLoginButton,
} from '@/app/auth/shared/AuthComponents';
import { useAuthFormSubmit } from '@/app/auth/shared/useAuthFormSubmit';
import { useAuthActions } from '@/stores/authStore';

function ForgotPasswordForm() {
  const { resetPassword } = useAuthActions();

  const [email, setEmail] = useState('');
  const { isLoading, isSuccess, error, submit, reset } = useAuthFormSubmit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    await submit(() => resetPassword(email));
  };

  if (isSuccess) {
    return (
      <AuthPageLayout cardClassName="text-center">
        <AuthResultCard
          icon={CheckCircle}
          iconBgClass="bg-success-100"
          iconTextClass="text-success-600"
          title="Email Sent Successfully"
          description={`Password reset instructions have been sent to ${email}. Please check your inbox.`}
        >
          <div className="space-y-3">
            <GoToLoginButton />
            <button
              onClick={reset}
              className="w-full px-6 py-3 border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors rounded-md"
            >
              Send Again
            </button>
          </div>
        </AuthResultCard>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout>
      <div className="text-center mb-8">
        <AuthBrandLogo />
        <div className="w-16 h-16 bg-primary-100 flex items-center justify-center mx-auto mt-4 mb-4 rounded-lg">
          <KeyRound className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Forgot Password</h2>
        <p className="mt-2 text-sm text-gray-500">Enter your email to reset your password</p>
      </div>

      {error && <AuthErrorAlert message={error} id="forgot-password-error" />}

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
              placeholder="Enter your email address"
              aria-invalid={!!error}
              aria-describedby={error ? 'forgot-password-error' : undefined}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-primary-600 transition-colors rounded-md"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
          <span>{isLoading ? 'Sending...' : 'Send Reset Link'}</span>
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </AuthPageLayout>
  );
}

export default function ForgotPasswordContent() {
  return (
    <AuthPageSuspense>
      <ForgotPasswordForm />
    </AuthPageSuspense>
  );
}
