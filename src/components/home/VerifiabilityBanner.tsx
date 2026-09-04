import Link from 'next/link';

import { ArrowRight, BadgeCheck, Boxes, LockKeyhole } from 'lucide-react';

const POINTS = [
  {
    icon: BadgeCheck,
    title: 'Signed every time',
    text: 'Every pre-trade check is signed as an EIP-712 receipt against a published attester key.',
  },
  {
    icon: Boxes,
    title: 'Verifiable by anyone',
    text: 'The gates are recomputable from the bytes alone at v3, and the policy constants live in a public declaration.',
  },
  {
    icon: LockKeyhole,
    title: 'Anchored to Bitcoin',
    text: 'Key records are anchored on-chain, so a check can be proven to have existed in that form before a given block.',
  },
] as const;

export function VerifiabilityBanner() {
  return (
    <section className="border-y border-slate-900/15 bg-white/30 p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr] items-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
            Verifiable by anyone
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
            Every check is signed. Every receipt can be verified by anyone, without trusting us.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
            Verification proves a record is authentic and unaltered. It is not an endorsement of a
            verdict, and schema v1 remains the service default while v3 is opt-in.
          </p>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Try it with a real receipt
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="border-l border-slate-900/15 px-4 py-2 first:border-l-0 sm:px-5"
            >
              <Icon className="w-5 h-5 text-blue-600" />
              <div className="text-sm font-semibold text-slate-900">{title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{text}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
