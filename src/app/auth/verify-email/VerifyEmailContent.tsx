'use client';

import { useEffect, useState, useMemo } from 'react';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

import {
  AuthPageLayout,
  AuthResultCard,
  AuthPageSuspense,
  GoToLoginButton,
} from '@/app/auth/shared/AuthComponents';
import { useUser, useSession } from '@/stores/authStore';

function getErrorMessage(error: string): string {
  switch (error) {
    case 'access_denied':
      return 'Access denied. Please try again.';
    case 'expired_token':
      return 'This verification link has expired. Please request a new one.';
    case 'invalid_token':
      return 'Invalid verification link. Please request a new one.';
    case 'invalid_state':
      return 'Security verification failed. Please try again.';
    case 'missing_code':
      return 'Verification code is missing. Please use the link from your email.';
    case 'auth_failed':
      return 'Authentication failed. Please try again.';
    case 'server_error':
      return 'A server error occurred. Please try again later.';
    default:
      return 'Verification failed. Please try again.';
  }
}

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useUser();
  const session = useSession();

  const errorParam = searchParams.get('error');
  const codeParam = searchParams.get('code');

  const initialState = useMemo(() => {
    if (errorParam) return { verifying: false, result: 'error' as const };
    if (codeParam) return { verifying: true, result: null as 'success' | 'error' | null };
    return { verifying: false, result: 'error' as const };
  }, [errorParam, codeParam]);

  const [isVerifying, setIsVerifying] = useState(initialState.verifying);
  const [verifyResult, setVerifyResult] = useState<'success' | 'error' | null>(initialState.result);

  useEffect(() => {
    if (codeParam && verifyResult === null && isVerifying) {
      const timer = setTimeout(() => {
        setVerifyResult('success');
        setIsVerifying(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [codeParam, verifyResult, isVerifying]);

  useEffect(() => {
    if (user && session) {
      router.push(`/`);
    }
  }, [user, session, router]);

  const isSuccess = verifyResult === 'success';
  const errorMessage = errorParam
    ? getErrorMessage(errorParam)
    : verifyResult === 'error'
      ? getErrorMessage('auth_failed')
      : '';

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-insight px-4 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <AuthPageLayout cardClassName="text-center">
        <AuthResultCard
          icon={CheckCircle}
          iconBgClass="bg-success-100"
          iconTextClass="text-success-600"
          title="Email Verified Successfully"
          description="Your email has been verified. You can now log in to your account."
        >
          <div className="space-y-3">
            <GoToLoginButton />
          </div>
        </AuthResultCard>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout cardClassName="text-center">
      <AuthResultCard
        icon={XCircle}
        iconBgClass="bg-danger-100"
        iconTextClass="text-danger-600"
        title="Verification Failed"
        description={errorMessage}
      >
        <div className="space-y-3">
          <Link
            href="/auth/resend-verification"
            className="block w-full px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors rounded-md"
          >
            Resend Verification Email
          </Link>
          <Link
            href="/register"
            className="block w-full px-6 py-3 border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors rounded-md"
          >
            Register Again
          </Link>
        </div>
      </AuthResultCard>
    </AuthPageLayout>
  );
}

export default function VerifyEmailContent() {
  return (
    <AuthPageSuspense>
      <VerifyEmailForm />
    </AuthPageSuspense>
  );
}
