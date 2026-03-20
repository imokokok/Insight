'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Mail, Loader2, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuthActions } from '@/stores/authStore';

function ForgotPasswordContent() {
  const t = useTranslations();
  const { resetPassword } = useAuthActions();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message);
      setIsLoading(false);
    } else {
      setIsSuccess(true);
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-insight px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-success-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-success-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('auth.forgotPassword.success.title')}
            </h2>
            <p className="text-gray-500 mb-6">
              {t('auth.forgotPassword.success.description', { email })}
            </p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
              >
                {t('auth.forgotPassword.success.goToLogin')}
              </Link>
              <button
                onClick={() => setIsSuccess(false)}
                className="w-full px-6 py-3 border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                {t('auth.forgotPassword.success.sendAgain')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-insight px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                Insight
              </h1>
            </Link>
            <div className="w-16 h-16 bg-primary-100 flex items-center justify-center mx-auto mt-4 mb-4">
              <KeyRound className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('auth.forgotPassword.title')}
            </h2>
            <p className="mt-2 text-sm text-gray-500">{t('auth.forgotPassword.subtitle')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-200">
              <p className="text-sm text-danger-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.forgotPassword.emailLabel')}
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
                  placeholder={t('auth.forgotPassword.emailPlaceholder')}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-primary-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              <span>
                {isLoading ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.submit')}
              </span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-insight px-4">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
