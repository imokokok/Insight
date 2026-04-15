'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

import { useTranslations, useLocale } from '@/i18n';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/stores/authStore';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const user = useUser();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const errorParam = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const emailParam = searchParams.get('email');
  const codeParam = searchParams.get('code');

  const getErrorMessage = useCallback(
    (error: string, _code: string | null): string => {
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
    },
    [t]
  );

  useEffect(() => {
    if (user) {
      router.push(`/${locale}`);
      return;
    }

    if (errorParam) {
      setStatus('error');
      setErrorMessage(getErrorMessage(errorParam, errorCode));
      return;
    }

    if (codeParam) {
      supabase.auth
        .exchangeCodeForSession(codeParam)
        .then(({ error: exchangeError }) => {
          if (exchangeError) {
            setStatus('error');
            setErrorMessage(getErrorMessage('invalid_token', null));
          } else {
            setStatus('success');
          }
        })
        .catch(() => {
          setStatus('error');
          setErrorMessage(getErrorMessage('default', null));
        });
    } else {
      setStatus('error');
      setErrorMessage(getErrorMessage('missing_code', null));
    }
  }, [errorParam, errorCode, emailParam, codeParam, user, router, locale, getErrorMessage]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-insight px-4 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('auth.verifyEmail.verifying')}</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-insight px-4 py-12 rounded-lg">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 p-8 text-center rounded-lg">
            <div className="w-16 h-16 bg-success-100 flex items-center justify-center mx-auto mb-6 rounded-lg">
              <CheckCircle className="w-8 h-8 text-success-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('auth.verifyEmail.success.title')}
            </h2>
            <p className="text-gray-500 mb-6">{t('auth.verifyEmail.success.description')}</p>
            <div className="space-y-3">
              <Link
                href={`/${locale}/login`}
                className="block w-full px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors rounded-md"
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
    <div className="min-h-screen flex items-center justify-center bg-insight px-4 py-12 rounded-lg">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 p-8 text-center rounded-lg">
          <div className="w-16 h-16 bg-danger-100 flex items-center justify-center mx-auto mb-6 rounded-lg">
            <XCircle className="w-8 h-8 text-danger-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('auth.verifyEmail.error.title')}
          </h2>
          <p className="text-gray-500 mb-6">{errorMessage}</p>
          <div className="space-y-3">
            <Link
              href={`/${locale}/auth/resend-verification`}
              className="block w-full px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors rounded-md"
            >
              {t('auth.verifyEmail.error.resendVerification')}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="block w-full px-6 py-3 border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors rounded-md"
            >
              {t('auth.verifyEmail.error.registerAgain')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailContent() {
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
      <VerifyEmailForm />
    </Suspense>
  );
}
