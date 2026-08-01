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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Brand side — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative overflow-hidden bg-slate-950">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/20 blur-[120px] rounded-full" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Insight</span>
          </Link>

          <div className="space-y-6">
            <blockquote className="text-2xl font-semibold text-white leading-snug tracking-tight">
              Independent oracle transparency and risk infrastructure for DeFi.
            </blockquote>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              Monitor cross-oracle consensus, detect price divergence, and stress-test positions
              with 15-minute reliability data.
            </p>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Insight. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <div
            className={`bg-white border border-slate-100 rounded-2xl shadow-sm p-8 ${cardClassName}`}
          >
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
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-900/10 group-hover:bg-blue-700 transition-colors">
        <ShieldCheck className="w-5 h-5 text-white" />
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
        className={`w-16 h-16 ${iconBgClass} flex items-center justify-center mx-auto mb-6 rounded-2xl`}
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
    <div id={id} className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
      <p className="text-sm text-red-700 font-medium">{message}</p>
    </div>
  );
}

export function AuthPageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
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
      className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors rounded-xl text-center shadow-sm shadow-blue-900/10"
    >
      Go to Login
    </Link>
  );
}
