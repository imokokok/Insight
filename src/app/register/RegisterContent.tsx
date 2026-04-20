'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Mail, User, UserPlus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

import { PasswordInput } from '@/components/ui/PasswordInput';
import { useUser, useAuthActions } from '@/stores/authStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterContent() {
  const router = useRouter();
  const user = useUser();
  const { signUp, clearError } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user && !isSuccess) {
      router.push(`/`);
    }
  }, [user, router, isSuccess]);

  const validateForm = () => {
    if (!email.trim()) {
      setLocalError('Email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setLocalError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
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

    const { error: signUpError } = await signUp(email, password, displayName || undefined);

    if (signUpError) {
      setLocalError(signUpError.message);
      setIsLoading(false);
    } else {
      setIsSuccess(true);
      setIsLoading(false);
    }
  };

  const displayError = localError;

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-insight px-4 py-12 rounded-lg">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 p-8 text-center rounded-lg">
            <div className="w-16 h-16 bg-success-100 flex items-center justify-center mx-auto mb-6 rounded-lg">
              <CheckCircle className="w-8 h-8 text-success-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Registration Successful</h2>
            <p className="text-gray-500 mb-4">Verification email has been sent to {email}</p>
            <div className="bg-primary-50 border border-primary-200 p-4 mb-6 text-left rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-primary-800">
                  <p className="font-medium mb-1">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-primary-700">
                    <li>Check your inbox</li>
                    <li>Click the verification link</li>
                    <li>Return to login</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Link
                href={`/login`}
                className="block w-full px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors rounded-md"
              >
                Go to Login
              </Link>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setDisplayName('');
                }}
                className="w-full px-6 py-3 border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors rounded-md"
              >
                Use Another Email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-insight px-4 py-12 rounded-lg">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 p-8 rounded-lg">
          <div className="text-center mb-8">
            <Link href={`/`} className="inline-block">
              <h1 className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                Insight
              </h1>
            </Link>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Create Account</h2>
            <p className="mt-2 text-sm text-gray-500">Sign up for a new account</p>
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
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors rounded-md"
                />
              </div>
            </div>

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
                  placeholder="Enter your email"
                  aria-invalid={!!displayError}
                  aria-describedby={displayError ? 'register-error' : undefined}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors rounded-md"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full pl-12 pr-12 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors rounded-md"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
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
                className="w-full pl-12 pr-12 py-3 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors rounded-md"
              />
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 rounded-md"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                <span>I agree to the </span>
                <Link
                  href={`/terms`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Terms of Service
                </Link>
                <span> and </span>
                <Link
                  href={`/privacy`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              href={`/login`}
              className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Login now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
