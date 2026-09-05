'use client';

import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

interface PricingCtaSectionProps {
  /** Section heading. */
  title?: string;
  /** Section subheading. */
  subtitle?: string;
  /** CTA button text. */
  buttonText?: string;
  /** CTA button href. Defaults to the standalone pricing page. */
  href?: string;
  /** Extra classes for the outer <section>. */
  className?: string;
}

const DEFAULTS = {
  title: 'Credit-based, per-call pricing',
  subtitle:
    'New users get 100 free trial credits after email verification. Developer, Team, and Scale subscriptions include a monthly credit allowance spent per call (C1–C4); top up prepaid credit packs for agent-heavy workloads. Every paying user gets every endpoint. Crypto payments via NOWPayments.',
  buttonText: 'View Pricing',
  href: '/pricing',
  className: '',
} as const;

export function PricingCtaSection({
  title = DEFAULTS.title,
  subtitle = DEFAULTS.subtitle,
  buttonText = DEFAULTS.buttonText,
  href = DEFAULTS.href,
  className = DEFAULTS.className,
}: PricingCtaSectionProps) {
  return (
    <section className={`py-16 sm:py-20 bg-slate-950 ${className}`}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-[0.45fr_1fr] lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-blue-400">
          Commercial access
        </p>
        <div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
          <p className="mb-8 max-w-2xl text-lg text-slate-300">{subtitle}</p>
          <Link
            href={href}
            className="inline-flex items-center gap-2 border border-blue-500 bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {buttonText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
