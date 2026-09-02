'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Mail, User, UserPlus, Loader2, CheckCircle, AlertCircle, Coins } from 'lucide-react';

import {
  AuthPageLayout,
  AuthBrandLogo,
  AuthResultCard,
  GoToLoginButton,
} from '@/app/auth/shared/AuthComponents';
import { isValidRedirectPath } from '@/app/auth/shared/isValidRedirectPath';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { validatePassword, getPasswordStrength } from '@/lib/security/passwordValidation';
import { useUser, useSession, useAuthActions, useAuthError } from '@/stores/authStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirectPath = isValidRedirectPath(rawRedirect) ? rawRedirect : '/';

  const user = useUser();
  const session = useSession();
  const { signUp, clearError } = useAuthActions();
  const authError = useAuthError();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (user && session && !isSuccess) {
      router.push(redirectPath);
    }
  }, [user, session, isSuccess, router, redirectPath]);

  const validateForm = () => {
    if (!email.trim()) {
      setLocalError('Email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setLocalError(passwordError);
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }
    if (!agreedToTerms) {
      setLocalError('You must agree to the Terms of Service and Privacy Policy');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const { error: signUpError } = await signUp(
      email,
      password,
      displayName || undefined,
      `${window.location.origin}/auth/verify-email?redirect=${encodeURIComponent(redirectPath)}`
    );

    if (signUpError) {
      setLocalError(signUpError.message);
      setIsLoading(false);
    } else {
      setIsSuccess(true);
      setIsLoading(false);
    }
  };

  const displayError = localError || authError?.message;
  const passwordStrength = getPasswordStrength(password);

  if (isSuccess) {
    return (
      <AuthPageLayout cardClassName="text-center">
        <AuthResultCard
          icon={CheckCircle}
          iconBgClass="bg-success-100"
          iconTextClass="text-success-600"
          title="Registration Successful"
          description={`Verification email has been sent to ${email}.`}
        >
          <div className="bg-blue-50 border border-blue-200 p-4 mb-6 text-left rounded-lg">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Check your inbox</li>
                  <li>Click the verification link</li>
                  <li>Return to Login</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 mb-4 rounded-lg flex items-start gap-2">
            <Coins className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              API access is credit-metered and paid-only (no free tier, no trial). After verifying
              your email, subscribe (Developer from $49/mo — 10,000 credits) or top up a prepaid
              pack in{' '}
              <Link href="/settings?tab=billing" className="font-semibold underline">
                Settings → Billing
              </Link>{' '}
              to start calling every endpoint and MCP tool.
            </p>
          </div>
          <div className="space-y-3">
            <GoToLoginButton redirect={redirectPath} />
            <button
              onClick={() => {
                setIsSuccess(false);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setDisplayName('');
                setAgreedToTerms(false);
              }}
              className="w-full px-6 py-3 border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-200 transition-colors rounded-xl"
            >
              Use Another Email
            </button>
          </div>
        </AuthResultCard>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout cardClassName="shadow-sm">
      <div className="text-center mb-8">
        <AuthBrandLogo />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Create Account</h2>
        <p className="mt-2 text-sm text-slate-500">Sign up for a new account</p>
      </div>

      {displayError && (
        <div
          id="register-error"
          className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-600">{displayError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-2">
            Display Name <span className="text-slate-400">(optional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              maxLength={100}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors rounded-xl"
            />
          </div>
        </div>

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
              aria-describedby={displayError ? 'register-error' : undefined}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors rounded-xl"
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
            placeholder="Create a password"
            aria-invalid={!!displayError}
            aria-describedby={displayError ? 'register-error' : undefined}
            className="w-full pl-12 pr-12 py-3 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors rounded-xl"
          />
          {password && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      passwordStrength.score <= 2
                        ? 'bg-danger-500 w-1/3'
                        : passwordStrength.score <= 4
                          ? 'bg-yellow-500 w-2/3'
                          : 'bg-success-500 w-full'
                    }`}
                  />
                </div>
                <span className={`text-xs font-medium ${passwordStrength.color}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                <li
                  className={`text-xs ${password.length >= 8 ? 'text-success-600' : 'text-slate-400'}`}
                >
                  {password.length >= 8 ? '✓' : '○'} At least 8 characters
                </li>
                <li
                  className={`text-xs ${/[A-Z]/.test(password) ? 'text-success-600' : 'text-slate-400'}`}
                >
                  {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                </li>
                <li
                  className={`text-xs ${/[a-z]/.test(password) ? 'text-success-600' : 'text-slate-400'}`}
                >
                  {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
                </li>
                <li
                  className={`text-xs ${/\d/.test(password) ? 'text-success-600' : 'text-slate-400'}`}
                >
                  {/\d/.test(password) ? '✓' : '○'} One number
                </li>
                <li
                  className={`text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-success-600' : 'text-slate-400'}`}
                >
                  {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✓' : '○'} One special
                  character
                </li>
              </ul>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Confirm Password
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm your password"
            aria-invalid={!!displayError}
            aria-describedby={displayError ? 'register-error' : undefined}
            className="w-full pl-12 pr-12 py-3 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors rounded-xl"
          />
        </div>

        <div className="flex items-start">
          <input
            id="terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            required
            className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-slate-200 rounded-xl"
          />
          <label htmlFor="terms" className="ml-2 text-sm text-slate-600">
            <span>I agree to the </span>
            <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
              Terms of Service
            </Link>
            <span> and </span>
            <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
              Privacy Policy
            </Link>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || !agreedToTerms}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )}
          <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Login now
        </Link>
      </p>
    </AuthPageLayout>
  );
}
