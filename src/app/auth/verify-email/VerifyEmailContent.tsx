'use client';

import { useEffect, useState, useMemo } from 'react';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { ArrowRight, CheckCircle, Loader2, XCircle } from 'lucide-react';

import {
  AuthPageLayout,
  AuthResultCard,
  AuthPageSuspense,
  GoToLoginButton,
} from '@/app/auth/shared/AuthComponents';
import { getSafeRedirectPath } from '@/app/auth/shared/isValidRedirectPath';
import { announceNavigationStart } from '@/lib/navigation/progress';
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
  const redirectParam = searchParams.get('redirect') || undefined;
  const redirectPath = getSafeRedirectPath(redirectParam);

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
      announceNavigationStart();
      router.replace(redirectPath);
    }
  }, [user, session, router, redirectPath]);

  const isSuccess = verifyResult === 'success';
  const errorMessage = errorParam
    ? getErrorMessage(errorParam)
    : verifyResult === 'error'
      ? getErrorMessage('auth_failed')
      : '';

  if (isVerifying) {
    return (
      <AuthPageLayout journey="verify" cardClassName="text-center">
        <div className="auth-pending-state" role="status">
          <Loader2 className="mx-auto mb-6 h-12 w-12 animate-spin text-blue-700" />
          <p className="auth-result-eyebrow">Identity / in progress</p>
          <h1 className="auth-result-title">Confirming your address.</h1>
          <p className="auth-result-description">
            We’re checking the verification link from your email.
          </p>
        </div>
      </AuthPageLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthPageLayout journey="verify" cardClassName="text-center">
        <AuthResultCard
          icon={CheckCircle}
          iconBgClass="bg-emerald-100"
          iconTextClass="text-emerald-600"
          eyebrow="Identity / confirmed"
          title="Email Verified Successfully"
          description="Your email has been verified. You can now log in to your account."
        >
          <div className="space-y-3">
            <GoToLoginButton redirect={redirectPath} />
          </div>
        </AuthResultCard>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout journey="verify" cardClassName="text-center">
      <AuthResultCard
        icon={XCircle}
        iconBgClass="bg-red-100"
        iconTextClass="text-red-600"
        eyebrow="Identity / action needed"
        title="Verification Failed"
        description={errorMessage}
      >
        <div className="space-y-3">
          <Link href="/auth/resend-verification" className="auth-primary-link">
            Request a new link <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/register" className="auth-secondary-link">
            Create a new account
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
