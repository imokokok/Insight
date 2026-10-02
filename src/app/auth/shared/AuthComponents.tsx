'use client';

import { Suspense } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { Loader2 } from 'lucide-react';

import { getSafeRedirectPath } from './isValidRedirectPath';

const authJourneys = {
  default: {
    index: '00',
    label: 'Account access',
    title: 'Evidence should remain inspectable, even after you sign in.',
    description:
      'One account connects your saved preferences, API keys, credit wallet, signed receipts, and agent integrations.',
    steps: ['Protect credentials', 'Control access', 'Preserve provenance'],
    record: 'Identity record',
    status: 'Secure session',
  },
  login: {
    index: '01',
    label: 'Return to Insight',
    title: 'Your evidence, exactly where you left it.',
    description:
      'Sign in to return to your preferences, API access, credit wallet, and saved account controls.',
    steps: ['Enter your credentials', 'Resume your workspace', 'Inspect your evidence'],
    record: 'Sign in',
    status: 'Existing account',
  },
  register: {
    index: '02',
    label: 'Start with Insight',
    title: 'Build your account around verifiable signals.',
    description:
      'Create an identity, confirm your email, then manage API keys, credits, and preferences in one place.',
    steps: ['Create an account', 'Confirm your email', 'Set up your workspace'],
    record: 'Create account',
    status: 'New access',
  },
  recover: {
    index: '03',
    label: 'Recover access',
    title: 'A clear path back to your account.',
    description:
      'Request a reset link, follow the instructions in your email, and return to your Insight workspace.',
    steps: ['Request a reset link', 'Check your email', 'Choose a new password'],
    record: 'Recover access',
    status: 'Account recovery',
  },
  reset: {
    index: '04',
    label: 'Secure a new password',
    title: 'One final step to reclaim your workspace.',
    description:
      'Choose a strong password for your account. Once saved, return to sign in and continue your work.',
    steps: ['Reset link confirmed', 'Choose a new password', 'Return to your workspace'],
    record: 'New credentials',
    status: 'Recovery / final step',
  },
  verify: {
    index: '05',
    label: 'Confirm your identity',
    title: 'Your account begins with a verified address.',
    description:
      'Email verification connects your account to a trusted address before you enter the Insight workspace.',
    steps: ['Open your email', 'Confirm the link', 'Continue to Insight'],
    record: 'Email verification',
    status: 'Identity check',
  },
  resend: {
    index: '06',
    label: 'Request a new link',
    title: 'Pick up where your verification left off.',
    description:
      'A new verification link gives you a fresh path to confirm your address and activate your account.',
    steps: ['Confirm your address', 'Open the new email', 'Finish verification'],
    record: 'Verification link',
    status: 'Email delivery',
  },
} as const;

export function AuthPageLayout({
  children,
  cardClassName = '',
  journey = 'default',
}: {
  children: React.ReactNode;
  cardClassName?: string;
  journey?: keyof typeof authJourneys;
}) {
  const content = authJourneys[journey];

  return (
    <div className="editorial-workspace auth-workbench flex min-h-screen" data-journey={journey}>
      {/* Brand side — hidden on mobile */}
      <div
        className="auth-brand-panel relative hidden overflow-hidden border-r border-slate-900/15 lg:flex lg:w-1/2 xl:w-5/12"
        data-journey-index={content.index}
      >
        <div className="auth-brand-content relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
          <div className="auth-brand-header" aria-hidden="true">
            <span>Insight</span>
            <span>Identity workspace / {content.index}</span>
          </div>

          <div className="auth-brand-story space-y-8">
            <p className="editorial-index">
              Access / {content.index} — {content.label}
            </p>
            <blockquote className="auth-statement max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-slate-950 xl:text-5xl">
              {content.title}
            </blockquote>
            <p className="max-w-sm leading-relaxed text-slate-600">{content.description}</p>
            <ol className="auth-proof-sequence grid max-w-md border-y border-slate-900/15 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
              {content.steps.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-4 border-b border-slate-900/10 py-3 last:border-b-0"
                >
                  <span className="font-mono text-blue-700">0{index + 1}</span> {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="border-t border-slate-900/10 pt-4 text-xs text-slate-500">
            © {new Date().getFullYear()} Insight. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="auth-form-panel flex flex-1 items-center justify-center px-5 py-12 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="auth-mobile-context lg:hidden">
            <span>Access / {content.index}</span>
            <p>{content.label}</p>
          </div>
          <div className="auth-route-marker" aria-hidden="true">
            <span>{content.record}</span>
            <span>{content.status}</span>
          </div>
          <div
            className={`auth-record-card border-y border-slate-900/15 bg-white/55 p-7 sm:p-8 ${cardClassName}`}
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
    <Link href="/" className="auth-brand-logo inline-flex items-center justify-center gap-2 group">
      <Image
        src="/logos/insight-glacier-cut.svg"
        alt="Insight Logo"
        width={32}
        height={39}
        className="transition-transform group-hover:scale-105"
        priority
      />
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
  eyebrow,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconTextClass: string;
  title: string;
  description: string;
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div
        className={`auth-result-mark mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-slate-900/10 ${iconBgClass}`}
      >
        <Icon className={`w-8 h-8 ${iconTextClass}`} />
      </div>
      {eyebrow && <p className="auth-result-eyebrow">{eyebrow}</p>}
      <h1 className="auth-result-title">{title}</h1>
      <p className="auth-result-description">{description}</p>
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
  const safeRedirect = getSafeRedirectPath(redirect);
  const href = `/login?redirect=${encodeURIComponent(safeRedirect)}`;
  return (
    <Link
      href={href}
      className="block w-full bg-slate-950 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700"
    >
      Go to Login
    </Link>
  );
}
