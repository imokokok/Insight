'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useUser } from '@/stores/authStore';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations();
  const user = useUser();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const errorParam = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const emailParam = searchParams.get('email');

  useEffect(() => {
    if (user) {
      router.push('/');
      return;
    }

    if (errorParam) {
      setStatus('error');
      setErrorMessage(getErrorMessage(errorParam, errorCode));
    } else {
      setStatus('success');
    }
  }, [errorParam, errorCode, emailParam, user, router]);

  const getErrorMessage = (error: string, _code: string | null): string => {
    switch (error) {
      case 'access_denied':
        return t('auth.verifyEmail.error.accessDenied');
      case 'expired_token':
        return t('auth.verifyEmail.error.expiredToken');
      case 'invalid_token':
        return t('auth.verifyEmail.error.invalidToken');
      default:
        return t('auth.verifyEmail.error.default');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dune px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('auth.verifyEmail.verifying')}</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dune px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('auth.verifyEmail.success.title')}
            </h2>
            <p className="text-gray-500 mb-6">
              {t('auth.verifyEmail.success.description')}
            </p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                {t('auth.verifyEmail.success.goToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dune px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('auth.verifyEmail.error.title')}
          </h2>
          <p className="text-gray-500 mb-6">{errorMessage}</p>
          <div className="space-y-3">
            <Link
              href="/auth/resend-verification"
              className="block w-full px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('auth.verifyEmail.error.resendVerification')}
            </Link>
            <Link
              href="/register"
              className="block w-full px-6 py-3 border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              {t('auth.verifyEmail.error.registerAgain')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-dune px-4">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
