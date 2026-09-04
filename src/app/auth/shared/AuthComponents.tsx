'use client';

import { Suspense } from 'react';

import Link from 'next/link';

import { Loader2, ShieldCheck } from 'lucide-react';

export function AuthPageLayout({
  children,
  cardClassName = '',
}: {
  children: React.ReactNode;
  cardClassName?: string;
}) {
  return (
    <div className="editorial-workspace flex min-h-screen">
      {/* Brand side — hidden on mobile */}
      <div className="relative hidden overflow-hidden border-r border-slate-900/15 lg:flex lg:w-1/2 xl:w-5/12">
        <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center border border-blue-200 bg-blue-50">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-950">Insight</span>
          </Link>

          <div className="space-y-8">
            <p className="editorial-index">Access — Identity</p>
            <blockquote className="max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-slate-950 xl:text-5xl">
              Evidence should remain inspectable, even after you sign in.
            </blockquote>
            <p className="max-w-sm leading-relaxed text-slate-600">
              One account connects your saved preferences, API keys, credit wallet, signed receipts,
              and agent integrations.
            </p>
            <ol className="grid max-w-md border-y border-slate-900/15 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
              <li className="flex gap-4 border-b border-slate-900/10 py-3">
                <span className="font-mono text-blue-700">01</span> Protect credentials
              </li>
              <li className="flex gap-4 border-b border-slate-900/10 py-3">
                <span className="font-mono text-blue-700">02</span> Control access
              </li>
              <li className="flex gap-4 py-3">
                <span className="font-mono text-blue-700">03</span> Preserve provenance
              </li>
            </ol>
          </div>

          <p className="border-t border-slate-900/10 pt-4 text-xs text-slate-500">
            © {new Date().getFullYear()} Insight. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className={`border-y border-slate-900/15 bg-white/55 p-7 sm:p-8 ${cardClassName}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthBrandLogo() {
  return (
    <Link href="/" className="inline-flex items-center justify-center gap-2 group">
      <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50 transition-colors group-hover:bg-blue-100">
        <ShieldCheck className="w-5 h-5 text-blue-700" />
      </div>
      <span className="text-xl font-bold text-slate-900 tracking-tight">Insight</span>
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
        className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-slate-900/10 ${iconBgClass}`}
      >
        <Icon className={`w-8 h-8 ${iconTextClass}`} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-500 mb-6">{description}</p>
      {children}
    </>
  );
}

export function AuthErrorAlert({ message, id }: { message: string; id?: string }) {
  return (
    <div id={id} className="mb-6 border-l-2 border-red-500 bg-red-50 p-4">
      <p className="text-sm text-red-700 font-medium">{message}</p>
    </div>
  );
}

export function AuthPageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="editorial-workspace flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function GoToLoginButton({ redirect }: { redirect?: string }) {
  const href = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
  return (
    <Link
      href={href}
      className="block w-full bg-slate-950 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700"
    >
      Go to Login
    </Link>
  );
}
