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
  /** CTA button href. Defaults to /api#pricing. */
  href?: string;
  /** Extra classes for the outer <section>. */
  className?: string;
}

const DEFAULTS = {
  title: 'Credit-based, per-call pricing',
  subtitle:
    'Free 1,000 calls/mo. Paid plans include a monthly credit allowance spent per call (C1–C4). Top up prepaid credit packs for agent-heavy workloads. Crypto payments via NOWPayments.',
  buttonText: 'View Pricing',
  href: '/api#pricing',
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">{title}</h2>
        <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">{subtitle}</p>
        <Link
          href={href}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm shadow-blue-900/10"
        >
          {buttonText}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
