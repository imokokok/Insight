'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();
  const { resetPassword } = useAuthActions();

  const [email, setEmail] = useState('');
  const { isLoading, isSuccess, error, submit, reset } = useAuthFormSubmit();
  const redirectParam = searchParams.get('redirect') || undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    await submit(() => resetPassword(email, redirectParam));
  };

  if (isSuccess) {
    return (
      <AuthPageLayout cardClassName="text-center">
        <AuthResultCard
          icon={CheckCircle}
          iconBgClass="bg-emerald-100"
          iconTextClass="text-emerald-600"
          title="Email Sent Successfully"
          description={`Password reset instructions have been sent to ${email}. Please check your inbox.`}
        >
          <div className="space-y-3">
            <GoToLoginButton redirect={redirectParam} />
            <button
              onClick={reset}
              className="w-full border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition-colors hover:border-blue-600 hover:text-blue-700"
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
        <div className="mx-auto mb-4 mt-4 flex h-16 w-16 items-center justify-center border border-blue-200 bg-blue-50">
          <KeyRound className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Forgot Password</h2>
        <p className="mt-2 text-sm text-slate-500">Enter your email to reset your password</p>
      </div>

      {error && <AuthErrorAlert message={error} id="forgot-password-error" />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
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
              placeholder="Enter your email address"
              aria-invalid={!!error}
              aria-describedby={error ? 'forgot-password-error' : undefined}
              className="w-full border border-slate-300 py-3 pl-12 pr-4 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="flex w-full items-center justify-center gap-2 bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
          <span>{isLoading ? 'Sending...' : 'Send Reset Link'}</span>
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
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
