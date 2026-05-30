'use client';

import { Suspense } from 'react';

import Link from 'next/link';

import { Loader2 } from 'lucide-react';

export function AuthPageLayout({
  children,
  bgClass = 'bg-insight',
  cardClassName = '',
}: {
  children: React.ReactNode;
  bgClass?: string;
  cardClassName?: string;
}) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center ${bgClass} px-4 py-12 rounded-lg`}
    >
      <div className="w-full max-w-md">
        <div className={`bg-white border border-gray-200 p-8 rounded-lg ${cardClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthBrandLogo() {
  return (
    <Link href="/" className="inline-block">
      <h1 className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
        Insight
      </h1>
    </Link>
  );
}

export function AuthResultCard({
  icon: Icon,
  iconBgClass,
  iconTextClass,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconTextClass: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div
        className={`w-16 h-16 ${iconBgClass} flex items-center justify-center mx-auto mb-6 rounded-lg`}
      >
        <Icon className={`w-8 h-8 ${iconTextClass}`} />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 mb-6">{description}</p>
      {children}
    </>
  );
}

export function AuthErrorAlert({ message, id }: { message: string; id?: string }) {
  return (
    <div id={id} className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
      <p className="text-sm text-danger-600">{message}</p>
    </div>
  );
}

export function AuthPageSuspense({
  children,
  bgClass = 'bg-insight',
}: {
  children: React.ReactNode;
  bgClass?: string;
}) {
  return (
    <Suspense
      fallback={
        <div className={`min-h-screen flex items-center justify-center ${bgClass} px-4 rounded-lg`}>
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function GoToLoginButton() {
  return (
    <Link
      href="/login"
      className="block w-full px-6 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors rounded-md text-center"
    >
      Go to Login
    </Link>
  );
}
