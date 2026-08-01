'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

import {
  AuthPageLayout,
  AuthBrandLogo,
  AuthResultCard,
  AuthErrorAlert,
  AuthPageSuspense,
  GoToLoginButton,
} from '@/app/auth/shared/AuthComponents';
import { isValidRedirectPath } from '@/app/auth/shared/isValidRedirectPath';
import { useAuthFormSubmit } from '@/app/auth/shared/useAuthFormSubmit';
import { useAuthActions } from '@/stores/authStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ResendVerificationForm() {
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get('email') || '';
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirectPath = isValidRedirectPath(rawRedirect) ? rawRedirect : '/';
  const { resendVerification } = useAuthActions();

  const [email, setEmail] = useState(defaultEmail);
  const { isLoading, isSuccess, error, submit, reset, setError } = useAuthFormSubmit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    await submit(() =>
      resendVerification(
        email.trim(),
        `${window.location.origin}/auth/verify-email?redirect=${encodeURIComponent(redirectPath)}`
      )
    );
  };

  if (isSuccess) {
    return (
      <AuthPageLayout cardClassName="text-center">
        <AuthResultCard
          icon={CheckCircle}
          iconBgClass="bg-emerald-100"
          iconTextClass="text-emerald-600"
          title="Verification Email Sent"
          description={`Verification email has been sent to ${email}. Please check your inbox.`}
        >
          <div className="space-y-3">
            <GoToLoginButton redirect={redirectPath} />
            <button
              onClick={reset}
              className="w-full px-6 py-3 border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors rounded-xl"
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
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Resend Verification Email</h2>
        <p className="mt-2 text-sm text-slate-500">
          Enter your email address to receive a new verification link
        </p>
      </div>

      {error && <AuthErrorAlert message={error} />}

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
              className="w-full pl-12 pr-4 py-3 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors rounded-xl"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
          <span>{isLoading ? 'Sending...' : 'Send Verification Email'}</span>
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </AuthPageLayout>
  );
}

export default function ResendVerificationContent() {
  return (
    <AuthPageSuspense>
      <ResendVerificationForm />
    </AuthPageSuspense>
  );
}
